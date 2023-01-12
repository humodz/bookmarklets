javascript:(() => {
  if (
    location.hostname !== 'gitlab.com' ||
    !location.pathname.endsWith('/-/pipelines')
  ) {
    alert('ERROR\nThis bookmarklet can only be used in GitLab\'s Pipelines page');
    return;
  }

  const $ = (s, e = document) => e.querySelector(s);
  const $$ = (s, e = document) => [...e.querySelectorAll(s)];

  function h(tag, attrs, ...children) {
    const element = document.createElement(tag);

    for (const [name, value] of Object.entries(attrs || {})) {
      if (name === 'style') {
        Object.assign(element.style, value);
      } else if (name in element) {
        element[name] = value;
      } else {
        element.setAttribute(name, value);
      }
    }

    for (const child of children.flat()) {
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        element.append(child);
      } else if (child !== null && child !== undefined) {
        const node = document.createTextNode(child);
        element.append(node);
      }
    }

    return element;
  }

  function range(n) {
    return Array(n).fill(0).map((_, i) => i);
  }

  function localStorageItem(key, initialValue) {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(initialValue));
    }

    return {
      clear() {
        localStorage.removeItem(key);
      },
      set(newValue) {
        localStorage.setItem(key, JSON.stringify(newValue));
      },
      get() {
        const value = localStorage.getItem(key);

        if (value === null) {
          return null;
        }

        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      },
    }
  }

  function addStyle(text) {
    const element = document.createElement('style');
    element.textContent = text;
    document.head.append(element);
    return (text) => element.textContent = text;
  }

  function xhrInterceptor({ shouldIntercept, onSend }) {
    const originalOpen = window.__xhrOriginalOpen || XMLHttpRequest.prototype.open;
    window.__xhrOriginalOpen = originalOpen;

    XMLHttpRequest.prototype.open = function(...args) {
      if (shouldIntercept(...args)) {
        this.send = function () {
          const asyncSend = async () => {
            await new Promise(ok => setTimeout(ok));
            const res = await onSend(this, ...args);

            let onload = this.onload || (() => undefined);

            this.onload = function(...args) {
              Object.defineProperty(this, 'responseText', {
                value: (res.json !== undefined)
                  ? JSON.stringify(res.json)
                  : res.text,
              });
              onload.apply(this, args);
            };

            Object.defineProperty(this, 'onload', {
              set(newValue) {
                onload = newValue;
              },
            });

            XMLHttpRequest.prototype.send.apply(this, args);
          }

          asyncSend().catch(console.error);
        }
      }

      return originalOpen.apply(this, args);
    }
  }


  addStyle(`
    [data-testid=mini-pipeline-graph-dropdown] {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .pipeline-mini-graph-stage-container:not(:last-child)::after {
        bottom: 11px;
    }

    [data-testid=mini-pipeline-graph-dropdown]::before {
        display: block;
        visibility: hidden;
        font-weight: bold;
        content: "!!!";
    }

    [aria-label*=deploy]::before {
        visibility: visible;
    }

    [aria-label*="deployDev:"]::before {
        content: "DEV";
    }

    [aria-label*="deployQa:"]::before {
        content: "QA";
    }

    [aria-label*="deployQa2:"]::before {
        content: "QA2";
    }

    [aria-label*="deployStaging:"]::before {
        content: "STG";
    }

    [aria-label*="deployProd:"]::before {
        content: "PRD";
    }
  `);

  const pipelinesTable = $('.content-list.pipelines');
  const id = Math.random().toString();
  const onlyShowLastDeploy = localStorageItem('onlyShowLastDeploy', true);

  $('#content-body').innerHTML = '';
  $('#content-body').append(
    h('h2', { class: 'mx-3' }, document.title),
    h('div', { class: 'mx-2 user-select-none' }, [
      h('p', { class: 'flex align-items-baseline' }, [
        h('input', {
          type: 'checkbox',
          id,
          checked: onlyShowLastDeploy.get(),
          onchange: event => onlyShowLastDeploy.set(event.target.checked),
        }),
        h(
          'label',
          { for: id, class: 'ml-3 flex-grow' },
          'Only show latest successful deploy per environment',
        ),
        h('button', {
          onclick: refresh,
          class: 'gl-button btn btn-md btn-confirm',
        }, 'Refresh')
      ]),
    ]),
    pipelinesTable,
  );

  xhrInterceptor({
    shouldIntercept: (method, url) => (
      method.toUpperCase() === 'GET' &&
      url.includes('pipelines.json')
    ),
    onSend: async (_xhr, _method, path) => {
      const perPage = 100;
      const pagesBatchSize = onlyShowLastDeploy.get() ? 5 : 1;

      const url = new URL(path, location.origin);
      url.searchParams.set('per_page', perPage.toString());

      const page = Number(url.searchParams.get('page') || '1');

      const urls = range(pagesBatchSize).map(i => {
        url.searchParams.set('page', 1 + (page - 1) * pagesBatchSize + i);
        return url.toString();
      });

      const promises = urls.map(url => fetch(url).then(res => res.json()));
      const responses = await Promise.all(promises);

      const allPipelines = responses.flatMap(it => it.pipelines);

      const seenDeploys = new Set();

      const wantedPipelines = allPipelines.filter(
        pipeline => pipeline.details.stages.some(
          stage => {
            if (!stage.name.startsWith('deploy')) {
              return false;
            }
            const wanted = !(onlyShowLastDeploy.get() && seenDeploys.has(stage.name));

            if (stage.status.group === 'success') {
              seenDeploys.add(stage.name);
            }
            return wanted;
          }
        )
      );

      return {
        json: {
          pipelines: wantedPipelines,
        },
      };
    }
  });

  function refresh() {
    $('[aria-current=page]')?.click();
  }

  refresh();
})()