javascript:
(async () => {
  if (location.hostname !== 'gitlab.com' ) {
    alert('ERROR\nThis bookmarklet can only be used in GitLab');
    return;
  }

  Notification.requestPermission();

  const $ = (s, e = document) => e.querySelector(s);
  const $$ = (s, e = document) => [...e.querySelectorAll(s)];

  const classes = {
    radioButtons: 'bkmk-radio-buttons',
    collapsed: 'bkmk-collapsed',
    projectHeader: 'bkmk-project-header',
    collapseExpand: 'bkmk-collapse-expand',
  }

  addStyle('bkmk-gitlab-merge-requests', `
    .${classes.radioButtons} span {
      display: inline-block;
      width: 15rem;
    }

    .${classes.radioButtons} label {
      display: inline-block;
      padding-right: 4rem;
    }

    .${classes.collapsed} + * {
      display: none !important;
    }

    .${classes.projectHeader} {
      display: flex;
      border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    }

    .${classes.projectHeader} > * {
      margin-right: 1rem;
    }

    .${classes.projectHeader} > :first-child {
      margin-right: auto;
    }

    .${classes.projectHeader} a {
      color: #ececef;
    }

    .${classes.collapseExpand}::before {
      content: "[Collapse]";
    }

    .${classes.collapsed} .${classes.collapseExpand}::before {
      content: "[Expand]";
    }
  `);

  const state = getState();
  const myself = await getCurrentUser();

  let lastUpdatedAt = new Date();
  // let lastUpdatedAt = new Date() - 1000 * 60 * 60 * 24 * 5;

  const notificationForm = h('details', {}, [
    h('summary', null, h('strong', null, 'Notification settings')),
    h('form', null, [
      NotificationOptions('Approvals', 'approvals'),
      NotificationOptions('New comments', 'new-comments'),
      NotificationOptions('Pipiline status changes', 'pipeline-status-changes'),
      NotificationOptions('Merge and close events', 'merge-and-close-events'),
    ]),
  ]);

  function NotificationOptions(label, name) {
    const options = [
      { label: 'All', value: 'all' },
      { label: 'Only my MRs', value: 'only-my-mrs' },
      { label: 'None', value: 'none' },
    ];

    function update(value) {
      state.notificationOptions[name] = value;
      persistState(state);
    }

    return h('fieldset', { class: classes.radioButtons }, [
      h('span', null, h('strong', null, label)),
      ...options.map(option => (
        h('label', null, [
          h('input', {
            type: 'radio',
            name,
            value: option.value,
            checked: option.value === (state.notificationOptions[name] ?? 'all'),
            onchange: e => update(e.target.value),
          }),
          ' ' + option.label,
        ])
      ))
    ]);
  }

  async function updateMergeRequestList(first = false) {
    console.log('Updating merge requests...', new Date().toTimeString());

    const projects = await getStarredProjects();

    const mrsByProject = await Promise.all(
      projects.map(async p => [
        p.webUrl,
        { project: p, mrs: await getMergeRequests(p.webUrl) }
      ])
    );

    const contentBody = $('#content-body');
    contentBody.innerHTML = '';

    contentBody.append(
      h('br'),
      notificationForm,
    );

    if (projects.length === 100) {
      contentBody.append(
        h('h4', { style: { textAlign: 'center' }},
          'Note: only the merge requests of your first 100 starred projects are shown.'
        )
      );
    }

    for (const [url, { project, mrs }] of mrsByProject) {
      if (mrs) {
        $$('a', mrs).forEach(anchor => anchor.target = '_blank');

        contentBody.append(
          h('br'),
          h('h5', {
            class: {
              [classes.projectHeader]: true,
              [classes.collapsed]: state.projectCollapsed[url],
            }
          }, [
            h('a', { target: '_blank', href: url }, project.nameWithNamespace),
            h('a', {
              href: '#',
              class: classes.collapseExpand,
              onclick: (e) => {
                e.target.parentElement.classList.toggle(classes.collapsed)
                state.projectCollapsed[url] = !state.projectCollapsed[url];
                persistState(state);
              },
            }, ''),
            h('a', { target: '_blank', href: url + '/-/pipelines' }, '[Pipelines]'),
            h('label', null, [
              h('input', {
                type: 'checkbox',
                checked: !state.projectNotificationsDisabled[url],
                onchange: (e) => {
                  state.projectNotificationsDisabled[url] = e.target.checked;
                  persistState(state);
                },
              }),
              ' Notifications',
            ]),
          ]),
          mrs,
        );
      }
    }

    const allMrs = mrsByProject.map(it => it[1].mrs).flat();

    if (allMrs.length === 0) {
      contentBody.append(
        h('h3', { style: { textAlign: 'center', marginTop: '3rem' } },
          'There are no open Merge Requests in your starred projects.'
        ),
      );
    }

    if (!first) {
      const events = await getProjectsEvents(projects, lastUpdatedAt);
      for (const event of events) {
        if (!state.projectNotificationsDisabled[event.project.url]) {
          notify(event);
        }
      }
    }

    lastUpdatedAt = new Date();
  }

  function notify(event) {
    const action = event.action_name !== 'accepted' ? event.action_name : 'merged';

    const notification = new Notification(`${event.author.name} ${action}`, {
      icon: event.author.avatar_url,
      body: [
        event.mergeRequest?.title ?? 'Unknown Merge Request',
        `in ${event.project.shortName}`,
      ].join('\n'),
    });

    notification.addEventListener('click', () => {
      const url = event.mergeRequest?.webUrl;
      if (url) {
        window.open(url, '_blank').focus();
      }
    });
  }

  function getState() {
    let savedState = {};

    try {
      savedState = JSON.parse(localStorage.getItem('bkmk-state'));
    } finally {
      return {
        notificationOptions: {},
        projectNotificationsDisabled: {},
        projectCollapsed: {},
        ...savedState,
      };
    }
  }

  function persistState(state) {
    localStorage.setItem('bkmk-state', JSON.stringify(state));
  }

  async function getMergeRequests(url) {
    const dom = await fetchDom(url + '/-/merge_requests');

    if ($('.empty-state', dom)) {
      return null;
    }

    const elem = $('.mr-list', dom);
    return elem;
  }

  async function getCurrentUser() {
    return await fetch('/api/v4/user').then(res => res.json());
  }

  async function getStarredProjects() {
    const query = `
    {
      currentUser {
        starredProjects(first: 100) {
          nodes {
            id webUrl nameWithNamespace
            mergeRequests(first: 100, state: opened) {
              nodes {
                id title draft webUrl sourceBranch

                pipelines(first: 1) {
                  nodes {
                    status
                    user {
                      name avatarUrl
                    }}}}}}}}
    }
    `.replace(/\s+/g, ' ');

    const params = new URLSearchParams({ query });
    const url = `/api/graphql?${params}`;
    const body = await fetch(url).then(r => r.json());

    if (body.errors) {
      const message = body.errors[0].message ?? 'Unknown error';
      throw Object.assign(new Error(message), { name: 'GraphQlError', body });
    }

    const projects = body.data.currentUser.starredProjects.nodes;

    function getId(item) {
      return Number(item.id.split('/').pop());
    }

    return projects
      .map(project => ({
        ...project,
        id: getId(project),
        mergeRequests: project.mergeRequests.nodes.map(mr => ({
          ...mr,
          id: getId(mr),
          pipelines: mr.pipelines.nodes,
        })),
      }))
      .sort(
        (p1, p2) => p1.nameWithNamespace.localeCompare(p2.nameWithNamespace)
      );
  }

  const Action = {
    approved: 'approved',
    closed: 'closed',
    commented_on: 'commented on',
    merged: 'accepted',
    opened: 'opened',
    pushed_to: 'pushed to',
    reopened: 'reopened',
  };

  async function getProjectsEvents(projects, since = new Date()) {
    const mrsBySourceBranch = mapMergeRequests(projects, mr => mr.sourceBranch);
    const mrsById = mapMergeRequests(projects, mr => mr.id);

    const events = await Promise
      .all(projects.map(p => getProjectEvents(p.webUrl, since)))
      .then(list => list.flat());

    events.reverse();

    const wantedActions = Object.values(Action);

    const seenEvents = new Set();

    function getEventKey(action, targetId) {
      return JSON.stringify([action, targetId]);
    }

    const eventsWithMr = events.map(event => {
      const key = getEventKey(event.action_name, event.target_id);

      const isDuplicate = seenEvents.has(key);
      const byMyself = event.author.id === myself.id

      seenEvents.add(key);

      if (event.action_name === Action.reopened) {
        seenEvents.add(getEventKey([Action.closed, event.target_id]));
      }

      if ([Action.closed, Action.merged].includes(event.action_name)) {
        const actionsToIgnore = [
          Action.approved, Action.commented_on, Action.pushed_to, Action.opened, Action.reopened
        ];

        for (const action of actionsToIgnore) {
          seenEvents.add(getEventKey(action, event.target_id));
        }
      }

      const mergeRequest =
        mrsById.get(`${event.project_id}:${event.target_id}`) ??
        mrsBySourceBranch.get(`${event.project_id}:${event.push_data?.ref}`);

      const wanted = (
        !!mergeRequest &&
        !isDuplicate &&
        !byMyself &&
        wantedActions.includes(event.action_name) &&
        !(mergeRequest.draft && event.action_name === Action.pushed_to)
      );

      return {
        wanted,
        event: { ...event, mergeRequest },
      };
    });

    return eventsWithMr.filter(it => it.wanted).map(it => it.event);
  }

  function mapMergeRequests(projects, keyFn) {
    return new Map(
      projects
        .map(
          p => p.mergeRequests.map(
            mr => [`${p.id}:${keyFn(mr)}`, mr]
          )
        )
        .flat()
    );
  }

  async function getProjectEvents(projectUrl, since = new Date()) {
    const date = new Date(since);
    date.setDate(date.getDate() - 1);
    const yesterday = date.toISOString().split('T')[0];

    const params = new URLSearchParams({
      after: yesterday,
      target: 'merge_request',
    });

    const project = getProjectInfo(projectUrl);
    const url = `/api/v4/projects/${project.path}/events?${params}`;

    const events = await fetch(url).then(res => res.json());

    return events
      .filter(event => new Date(event.created_at) > new Date(since))
      .map(event => ({ ...event, project }));
  }

  function getProjectInfo(mrUrl) {
    const url = mrUrl.replace(/[/]-[/].+/, '');
    const path = new URL(url).pathname.replace('/', '');
    const name = path.replace(/[/]/g, ' / ');
    const shortName = path.split('/').pop();

    return { url, path: encodeURIComponent(path), name, shortName };
  }

  function h(tag, attrs, ...children) {
    const element = document.createElement(tag);

    for (const [name, value] of Object.entries(attrs || {})) {
      if (name === 'class') {
        if (typeof value === 'object') {
          element.className = Object.keys(value).filter(cls => value[cls]).join(' ');
        } else {
          element.className = value;
        }
      } else if (name === 'style') {
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
      } else if (child !== false && child !== null && child !== undefined) {
        const node = document.createTextNode(child);
        element.append(node);
      }
    }

    return element;
  }

  const parser = new DOMParser();

  async function fetchDom(url) {
    const html = await fetch(url).then(res => res.text());
    return parser.parseFromString(html, 'text/html');
  }

  function addStyle(id, css) {
    const style = document.querySelector(`#${id}`) || document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.body.append(style);
  }

  const interval = '__BOOKMARKET_INTERVAL_ID__';
  const refreshIntervalMinutes = Number(new URL(window.location).searchParams.get('refresh_interval')) || 10;

  clearInterval(window[interval]);
  window[interval] = setInterval(updateMergeRequestList, refreshIntervalMinutes * 60 * 1000);
  updateMergeRequestList(true);
})()