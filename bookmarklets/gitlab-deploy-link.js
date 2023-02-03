javascript: (() => {
  const pathRegExp = /[/]-[/]merge_requests[/]\d+([/]edit)?$/;

  if (
    location.hostname !== 'gitlab.com' ||
    !location.pathname.match(pathRegExp)
  ) {
    alert('This bookmarklet can only be used in a GitLab Merge Request page');
    return;
  }

  const $ = (s, e = document) => e.querySelector(s);

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

  const url = new URL(location);
  url.pathname = url.pathname.replace(pathRegExp, `/pipelines`);

  const isEdit = location.pathname.match(pathRegExp)[1] !== undefined;

  if (isEdit) {
    const branchName = $('.branch-selector code').textContent.trim();
    url.searchParams.set('ref', branchName);

    const link = document.createElement('a');
    link.target = '_blank';
    link.href = url.toString();
    link.textContent = `Deploy ${branchName}`;

    $('#merge_request_description').value += '\n\n' + link.outerHTML;
  } else {
    const branchName = $('.detail-page-description a[href*=tree]').title;
    url.searchParams.set('ref', branchName);
  }

  copy(url.toString());
})()
