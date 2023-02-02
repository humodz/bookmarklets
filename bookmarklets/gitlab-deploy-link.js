javascript: (() => {
  const pathRegExp = /[/]-[/]merge_requests[/]\d+$/;

  if (
    location.hostname !== 'gitlab.com' ||
    !location.pathname.match(pathRegExp)
  ) {
    alert('This bookmarklet can only be used in a GitLab Merge Request page');
    return;
  }

  function copy(text) {
    const textArea = document.createElement('textArea');
    textArea.value = text;

    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  }

  const branchName = document
    .querySelector('.detail-page-description a[href*=tree]')
    .title;

  const url = new URL(location);
  url.pathname = url.pathname.replace(pathRegExp, `/pipelines`);
  url.searchParams.set('ref', branchName);

  const link = document.createElement('a');
  link.target = '_blank';
  link.href = url.toString();
  link.textContent = `Deploy ${branchName}`;

  copy(link.outerHTML);
})()
