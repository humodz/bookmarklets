javascript: (async function() {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  async function getBranch(buildId) {
    let body;

    try {
      body = await fetch(buildId + '/').then(res => res.text());
      const match = body.match(/refs\/remotes\/origin\/([^\s<>]+)/);
      return match ? match[1] : '';
    } catch (error) {
      error.body = body;
      error.buildId = buildId;
      throw error;
    }
  }

  function addCss(rules) {
    const styleId = 'dzin-show-branch';

    const elem = $('#' + styleId) || document.createElement('style');
    elem.id = styleId;
    elem.type = 'text/css';
    elem.textContent += '\n' + rules;
    document.head.appendChild(elem);
  }

  async function cacheResult(key, fn) {
    const existing = localStorage.getItem(key);

    if (existing) {
      return existing;
    }

    const result = await fn();
    localStorage.setItem(key, result);
    return result;
  }

  async function asyncBatch(array, batchSize, fn) {
    for (let i = 0; i < array.length; i += batchSize) {
      await Promise.all(array
        .slice(i, i + batchSize)
        .map(fn)
      );
    }
  }

  const recentBuilds = $$('.build-details .build-link');

  addCss(`
    .build-details {
      height: unset !important;
    }
  `);

  await asyncBatch(recentBuilds, 5, async el => {
    const buildHref = el.href.replace(/\/$/, '');
    const buildId = buildHref.match(/\d+$/)[0];

    const cacheKey = `dzin-v3:${buildHref}`;
    const branch = await cacheResult(cacheKey, () => getBranch(buildId));

    const rawHref = el.attributes.href.value;

    addCss(`
      .build-details .build-link[href="${rawHref}"]::after,
      .jobsTable [href="${buildId}"]::after {
        content: " ${branch}";
      }
    `);
  });
})();
