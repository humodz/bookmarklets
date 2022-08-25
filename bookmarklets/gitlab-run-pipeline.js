javascript:
(async () => {
  const $ = (s, e = document) => e.querySelector(s);
  const parser = new DOMParser();

  async function fetchDom(url) {
		const html = await fetch(url).then(res => res.text());
		return parser.parseFromString(html, 'text/html');
	}

  function getProjectBaseUrl() {
    return window.location.toString().split('/-/')[0];
  }

  async function getCsrfToken(projectBaseUrl) {
    const dom = await fetchDom(`${projectBaseUrl}/-/pipelines/new`);
    const element = $('meta[name=csrf-token]');

    if (!element) {
      return null;
    }

    return element.getAttribute('content');
  }

  function getCurrentBranch() {
    try {
      return $('.js-source-branch-copy')
        .getAttribute('data-clipboard-text');
    } catch (error) {
      fail('Wrong page');
    }
  }

  function askForEnvs() {
    const text = prompt('Please provide env variables separated by comma.\nExample:\n\n    env=dev');

    return text
      .split(',')
      .filter(Boolean)
      .map(pair => {
        const firstEquals = pair.indexOf('=');
        return [pair.slice(0, firstEquals), pair.slice(firstEquals + 1)];
      });
  }

  async function runPipeline({ projectBaseUrl, csrfToken, branch, envs }) {
    const requestBody = {
      ref: `refs/heads/${branch}`,
      variables_attributes: envs.map(([name, value]) => ({
        variable_type: 'env_var',
        key: name,
        secret_value: value,
      })),
    };

    const response = await fetch(`${projectBaseUrl}/-/pipelines`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify(requestBody),
    });

    if (response.status >= 400) {
      throw new Error(`Failed to create pipeline: ${response.status}`);
    }

    return response;
  }

  function fail(message, error) {
    alert(message);
    throw error || new Error('message');
  }

  const projectBaseUrl = getProjectBaseUrl();
  const csrfToken = await getCsrfToken(projectBaseUrl);
  const branch = getCurrentBranch();
  const envs = askForEnvs();

  const result = await runPipeline({
    projectBaseUrl,
    csrfToken,
    branch,
    envs,
  });

  console.log(result);
})()