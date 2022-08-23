javascript:
(async () => {
  if (window.location.pathname !== '/dashboard/merge_requests') {
    alert('This script only works in the Merge Requests page');
    return;
  }

	/* Notification.requestPermission(); */

	const $ = (s, e = document) => e.querySelector(s);
	const $$ = (s, e = document) => [...e.querySelectorAll(s)];
	const parser = new DOMParser();

	async function fetchDom(url) {
		const response = await fetch(url);
		const html = await response.text();
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

	async function updateMergeRequestList() {
		console.log('Updating merge requests...', new Date());
		const urls = (await fetchStarred()).map(it => it + '/-/merge_requests');

		const mrsByProject = await Promise.all(
			urls.map(async url => [url, await getMergeRequests(url)])
		);

		const contentBody = $('#content-body');
		$$('.issues-filters ~ *', contentBody).map(it => it.remove());

		const mrInfos = [];

		for (const [url, mrs] of mrsByProject) {
			if (mrs) {
				const br = document.createElement('br');
				const title = document.createElement('h5');
				title.textContent = getProjectName(url);
				contentBody.append(br, title, mrs);
			}
		}
	}

	function getProjectName(mrUrl) {
		return new URL(mrUrl)
			.pathname
			.split('/-')[0]
			.replace(/^[/]/g, '')
			.replace(/[/]/g, ' / ');
	}

	/*
	function getUserAvatar(userId, size = 64) {
		return `https://gitlab.com/uploads/-/system/user/avatar/${userId}/avatar.png?width=${size}`;
	}

	function formatMergeRequestInfos(mrsContainer) {
		return $$('.merge-request', mrsContainer)
			.map(item => {
				const titleElem = $('.title a', item);
				const authorElem = $('.author-link', item);

				return {
					title: titleElem.textContent,
					href: titleElem.href,
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

	function notifyMergeRequest(mrInfo) {
		new Notification(mrInfo.title, {
			icon: mrInfo.author.avatar,
		});
	}
	*/

	function minutes(num) {
		return num * 60 * 1000;
	}

	setInterval(updateMergeRequestList, minutes(5));
	updateMergeRequestList();
})()