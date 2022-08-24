javascript:
(async () => {
  if (window.location.pathname !== '/dashboard/merge_requests') {
    alert('This script only works in the Merge Requests page');
    return;
  }

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

	async function fetchStarred() {
		const url = 'https://gitlab.com/dashboard/projects/starred';
		const dom = await fetchDom(url);
		const projects = $$('.project-details h2 a', dom).map(el => el.href);
		return projects;
	}

	let oldMrInfos = [];

	async function updateMergeRequestList(first = false) {
		console.log('Updating merge requests...', new Date().toTimeString());
		const urls = (await fetchStarred()).map(it => it + '/-/merge_requests');

		const mrsByProject = await Promise.all(
			urls.map(async url => [url, await getMergeRequests(url)])
		);

		$$('#content-body > *').forEach(it => it.remove());
		const contentBody = $('#content-body');

		for (const [url, mrs] of mrsByProject) {
			if (mrs) {
				const br = document.createElement('br');
				const title = document.createElement('h5');
				title.textContent = getProjectName(url);
				contentBody.append(br, title, mrs);
			}
		}

		const newMrInfos = getMergeRequestInfos();

		if (!first) {
			const myself = await getCurrentUser();
			const changes = diff(oldMrInfos, newMrInfos);

			const interestingChanges = changes.filter(
				change => !(change.type === 'created' && change.mr.author.id === myself.id)
			);

			console.log('!!! changes', interestingChanges);

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

			if (mr.comments > oldMr.comments) {
				changes.push({
					type: 'new-comments',
					delta: mr.comments - oldMr.comments,
					mr
				});
			}
		}

		return changes;
	}

	function getIcon(name) {
		return 'https://humodz.github.io/bookmarklets/icons/' + name + '.png';
	}

	function notify(change) {
		const mr = change.mr;

		if (change.type === 'created') {
			new Notification(`New: ${mr.title}`, {
				icon: mr.author.avatar,
				body: [
					`in ${mr.project.name}`,
					`by ${mr.author.name}`,
				].join('\n'),
			});
		} else if (change.type === 'updated') {
			new Notification(`Updated: ${mr.title}`, {
				icon: mr.author.avatar,
				body: [
					`in ${mr.project.name}`,
					`by ${mr.author.name}`,
				].join('\n'),
			});
		} else if (change.type === 'approved') {
			new Notification(`Approved: ${mr.title}`, {
				icon: getIcon('check-mark-button'),
				body: `in ${mr.project.name}`,
			});
		} else if (change.type === 'approval-revoked') {
			new Notification(`Approval revoked: ${mr.title}`, {
				icon: getIcon('thumbs-down'),
				body: `in ${mr.project.name}`,
			});
		} else if (change.type === 'pipeline-changed') {
			const icons = {
				'passed': 'rocket',
				'running': 'hammer-and-wrench.png',
				'failed': 'fire',
			};

			new Notification(`CI ${mr.pipelineStatus}: ${mr.title}`, {
				icon: getIcon(icons[mr.pipelineStatus]),
				body: `in ${mr.project.name}`,
			});
		} else if (change.type === 'new-comments') {
			new Notification(`${change.delta} new comment(s): ${mr.title}`, {
				icon: getIcon('speech-balloon'),
				body: `in ${mr.project.name}`,
			});
		} else if (change.type === 'merge-conflict') {
			new Notification(`Merge conflict: ${mr.title}`, {
				icon: getIcon('warning'),
				body: `in ${mr.project.name}`,
			});
		}
	}

	async function getCurrentUser() {
		return await fetch('/api/v4/user').then(res => res.json());
	}

	function getUserAvatar(userId, size = 64) {
		return `https://gitlab.com/uploads/-/system/user/avatar/${userId}/avatar.png?width=${size}`;
	}

	function getMergeRequestInfos() {
		const pipelineStatuses = [
			{ value: 'passed', selector: '.ci-status-icon-success' },
			{ value: 'running', selector: '.ci-status-icon-running' },
			{ value: 'failed', selector: '.ci-status-icon-failed' },
		];

		return $$('#content-body .merge-request')
			.map(element => {
				const titleElem = $('.title a', element);
				const authorElem = $('.author-link', element);

				return {
					title: titleElem.textContent,
					href: titleElem.href,
					approved: !!$('[data-testid=approval-solid-icon]', element),
					mergeConflict: !!$('[data-testid=warning-solid-icon]', element),
					lastUpdated: $('.merge_request_updated_ago', element)?.textContent,
					pipelineStatus: pipelineStatuses.find(it => !!$(it.selector, element))?.value || 'none',
					comments: parseInt($('.issuable-comments', element).textContent.trim()),
					project: {
						name: getProjectName(titleElem.href),
					},
					author: {
						name: authorElem.getAttribute('data-name'),
						id: authorElem.getAttribute('data-user-id'),
						avatar: getUserAvatar(authorElem.getAttribute('data-user-id')),
					},
				};
			});
	}

	const interval = '__BOOKMARKET_INTERVAL_ID__';

	if (window[interval]) {
		clearInterval(window[interval]);
	}

	window[interval] = setInterval(updateMergeRequestList, 1 * 60 * 1000);
	updateMergeRequestList(true);
})()