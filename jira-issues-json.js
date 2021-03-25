javascript: (async function() {
  const jiraBaseUrl = window.location.origin;
  const project = document.querySelector('meta[name=ghx-project-key]').content;

  function download(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  }

  function http(path, query) {
    const qp = new URLSearchParams();
    Object.keys(query).forEach(k => qp.set(k, query[k]));
    return fetch(`${jiraBaseUrl}/rest/api/2/${path}?${qp}`);
  }

  function maybe(cb, defaultValue = null) {
    try {
      return cb();
    } catch (e) {
      return defaultValue;
    }
  }

  const allIssues = [];
  let result;

  do {
    const params = {
      jql: `project="${project}"`,
      startAt: allIssues.length,
      maxResults: 50,
    };
    result = await http('search', params).then(res => res.json());

    allIssues.push(...result.issues.map(issue => ({
      parent: maybe(() => issue.fields.parent.key),
      key: issue.key,
      description: issue.fields.description,
      type: maybe(() => issue.fields.issuetype.name),
      priority: maybe(() => issue.fields.priority.name),
      status: maybe(() => issue.fields.status.name),
      creator: maybe(() => issue.fields.creator.key),
      assignee: maybe(() => issue.fields.assignee.key),
      originalEstimate: issue.fields.timeoriginalestimate,
      remainingEstimate: issue.fields.timeestimate,
      timeSpent: issue.fields.timespent,
      isFlagged: Boolean(maybe(() => issue.fields.customfield_10006)),
      labels: maybe(() => issue.fields.labels, []).join(','),
    })));

    console.log(`Fetching issues... ${allIssues.length}/${result.total}`);
  } while (allIssues.length < result.total);

  allIssues.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  download(`${project}.json`, JSON.stringify(allIssues, null, 2));
}());

