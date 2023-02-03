javascript: (() => {
  const pathRegExp = /[/]-[/]merge_requests[/](\d+([/]edit)?|(new))$/;

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
  url.pathname = url.pathname.replace(pathRegExp, `/pipelines/new`);

  const match = location.pathname.match(pathRegExp);
  const isEditOrNew = match[2] || match[3];

  if (isEditOrNew) {
    const branchName = $('.branch-selector code').textContent.trim();
    url.searchParams.set('ref', branchName);

    const link = document.createElement('a');
    link.target = '_blank';
    link.href = url.toString();

    const strong = document.createElement('strong');
    strong.textContent = `Deploy ${branchName}`;
    link.append(strong)

    $('#merge_request_description').value += '\n' + link.outerHTML;
  } else {
    const branchName = $('.detail-page-description a[href*=tree]').title;
    url.searchParams.set('ref', branchName);
  }

  copy(url.toString());
})()
