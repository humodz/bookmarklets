javascript:
(async () => {
	Notification.requestPermission();

	const $ = (s, e = document) => e.querySelector(s);
	const $$ = (s, e = document) => [...e.querySelectorAll(s)];
	const parser = new DOMParser();

	async function fetchDom(url) {
		const html = await fetch(url).then(res => res.text());
		return parser.parseFromString(html, 'text/html');
	}

	async function getMergeRequests(url) {
		const dom = await fetchDom(url);

		if ($('.empty-state', dom)) {
			return null;
		}

		const elem = $('.mr-list', dom);
		return elem;
	}

	let oldMrInfos = [];

	async function updateMergeRequestList(first = false) {
		console.log('Updating merge requests...', new Date().toTimeString());
		const urls = (await getStarredProjects()).map(it => it.web_url + '/-/merge_requests');

		const mrsByProject = await Promise.all(
			urls.map(async url => [url, await getMergeRequests(url)])
		);

		$$('#content-body > *').forEach(it => it.remove());
		const contentBody = $('#content-body');

		if (urls.length === 100) {
			const warning = document.createElement('h4');

			warning.textContent = 'Note: only the merge requests of your first 100 starred projects are shown.';

			Object.assign(warning.style, {
				textAlign: 'center',
			});

			contentBody.append(warning);
		}

		for (const [url, mrs] of mrsByProject) {
			if (mrs) {
				$$('a', mrs).forEach(anchor => anchor.target = '_blank');

				const br = document.createElement('br');
				const title = document.createElement('h5');
				title.textContent = getProjectName(url);
				contentBody.append(br, title, mrs);
			}
		}

		const newMrInfos = getMergeRequestInfos();

		if (newMrInfos.length === 0) {
			const emptyState = document.createElement('h3');
			emptyState.textContent = 'There are no open Merge Requests in your starred projects.';

			Object.assign(emptyState.style, {
				textAlign: 'center',
				marginTop: '3rem',
			});

			contentBody.append(emptyState);
		}

		if (!first) {
			// TODO notify on merge or close?
			const myself = await getCurrentUser();
			const { changes } = diff(oldMrInfos, newMrInfos);

			const interestingChanges = filterInterestingChanges(changes, myself);

			for (const change of interestingChanges) {
				notify(change);
			}
		}

		oldMrInfos = newMrInfos;
	}

	function getProjectName(mrUrl) {
		return new URL(mrUrl)
			.pathname
			.split('/-')[0]
			.replace(/^[/]/g, '')
			.replace(/[/]/g, ' / ');
	}

	function diff(oldMrInfos, newMrInfos) {
		const changes = [];

		for (const mr of newMrInfos) {
			const oldMr = oldMrInfos.find(it => it.href === mr.href);

			if (!oldMr) {
				changes.push({ type: 'created', mr });
				continue;
			}

			if (mr.lastUpdated !== oldMr.lastUpdated) {
				changes.push({ type: 'updated', mr });
			}

			if (mr.approved && !oldMr.approved) {
				changes.push({ type: 'approved', mr });
			}

			if (!mr.approved && oldMr.approved) {
				changes.push({ type: 'approval-revoked', mr });
			}

			if (mr.pipelineStatus !== oldMr.pipelineStatus) {
				changes.push({ type: 'pipeline-changed', mr });
			}

			if (mr.mergeConflict && !oldMr.mergeConflict) {
				changes.push({ type: 'merge-conflict', mr });
			}

			if (!mr.isDraft && oldMr.isDraft) {
				changes.push({ type: 'ready-for-review', mr });
			}

			if (mr.comments > oldMr.comments) {
				changes.push({
					type: 'new-comments',
					delta: mr.comments - oldMr.comments,
					mr
				});
			}
		}

		const newMrHrefs = newMrInfos.map(it => it.href);
		const deletedMrs = oldMrInfos.filter(it => !newMrHrefs.includes(it.href));

		return { changes, deletedMrs };
	}

	function filterInterestingChanges(changes, myself) {
		const interestingChanges = changes.filter(change => {
			const createdOrUpdatedByMe = (
				['created', 'updated', 'ready-for-review'].includes(change.type) &&
				change.mr.author.username === myself.username
			);

			const changesThatCauseUpdate = [
				'approved',
				'approval-revoked',
				'merge-conflict',
				'ready-for-review',
				'new-comments',
			];

			const duplicateUpdate = change.type === 'updated' && changes.some(otherChange =>
				otherChange !== change && changesThatCauseUpdate.includes(otherChange.type)
			);

			return !createdOrUpdatedByMe && !duplicateUpdate;
		});

		return interestingChanges;
	}

	function notify(change) {
		const mr = change.mr;

		const simpleNotifications = {
			'approved': { msg: 'Approved', icon: 'check-mark-button' },
			'approval-revoked': { msg: 'Approval revoked', icon: 'thumbs-down' },
			'merge-conflict': { msg: 'Merge conflict', icon: 'warning' },
		};

		const authorNotifications = {
			'created': 'New',
			'updated': 'Updated',
			'ready-for-review': 'Ready for review',
		};

		if (simpleNotifications[change.type]) {
			const { msg, icon } = simpleNotifications[change.type];

			new Notification(`${msg}: ${mr.title}`, {
				icon: getIcon(icon),
				body: `in ${mr.project.name}`,
			});
		} else if (authorNotifications[change.type]) {
			new Notification(`${authorNotifications[change.type]}: ${mr.title}`, {
				icon: mr.author.avatar,
				body: [
					`in ${mr.project.name}`,
					`by ${mr.author.name}`,
				].join('\n'),
			});
		} else if (change.type === 'new-comments') {
			new Notification(`${change.delta} new comment(s): ${mr.title}`, {
				icon: getIcon('speech-balloon'),
				body: `in ${mr.project.name}`,
			});
		} else if (change.type === 'pipeline-changed') {
			const icons = {
				'pending': 'hourglass-done',
				'passed': 'rocket',
				'running': 'hammer-and-wrench',
				'failed': 'fire',
				'canceled': 'prohibited',
			};

			if (icons[mr.pipelineStatus]) {
				new Notification(`CI ${mr.pipelineStatus}: ${mr.title}`, {
					icon: getIcon(icons[mr.pipelineStatus]),
					body: `in ${mr.project.name}`,
				});
			} else {
				console.info('Unreported pipeline status:', mr.pipelineStatus, mr);
			}
		}
	}

	function getIcon(name) {
		return 'https://humodz.github.io/bookmarklets/icons/' + name + '.png';
	}

	async function getCurrentUser() {
		return await fetch('/api/v4/user').then(res => res.json());
	}

	async function getStarredProjects() {
		const user = await getCurrentUser();
		const url = `/api/v4/users/${user.id}/starred_projects?simple=true&order_by=name&per_page=100`;
		return await fetch(url).then(res => res.json());
	}

	function getUserAvatar(userId, size = 64) {
		return `https://gitlab.com/uploads/-/system/user/avatar/${userId}/avatar.png?width=${size}`;
	}

	function getMergeRequestInfos() {
		const pipelineStatuses = [
			{ value: 'pending', selector: '.ci-status-icon-pending' },
			{ value: 'passed', selector: '.ci-status-icon-success' },
			{ value: 'running', selector: '.ci-status-icon-running' },
			{ value: 'failed', selector: '.ci-status-icon-failed' },
			{ value: 'canceled', selector: '.ci-status-icon-canceled' },
		];

		return $$('#content-body .merge-request')
			.map(element => {
				const titleElem = $('.title a', element);
				const authorElem = $('.issuable-info .author-link', element);
				const assigneeElem = $('.issuable-meta .author-link[title^="Assigned to"]', element);

				const title = titleElem.textContent.trim();

				return {
					title,
					href: titleElem.href,
					approved: !!$('[data-testid=approval-solid-icon]', element),
					isDraft: title.startsWith('Draft:'),
					mergeConflict: !!$('[data-testid=warning-solid-icon]', element),
					lastUpdated: $('.merge_request_updated_ago', element).getAttribute('datetime'),
					pipelineStatus: pipelineStatuses.find(it => !!$(it.selector, element))?.value || 'none',
					comments: parseInt($('[data-testid=issuable-comments]', element).textContent.trim()),
					project: {
						name: getProjectName(titleElem.href),
					},
					author: {
						name: authorElem.getAttribute('data-name'),
						username: authorElem.getAttribute('data-username'),
						avatar: getUserAvatar(authorElem.getAttribute('data-user-id')),
					},
					assignee: !assigneeElem ? null : {
						username: new URL(assigneeElem.href).pathname.replace('/', '')
					},
				};
			});
	}

	const interval = '__BOOKMARKET_INTERVAL_ID__';
	const updateFrequencyMinutes = window.__BOOKMARKLET_UPDATE_FREQUENCY_MINUTES__ || 1;

	clearInterval(window[interval]);
	window[interval] = setInterval(updateMergeRequestList, updateFrequencyMinutes * 60 * 1000);
	updateMergeRequestList(true);
})()