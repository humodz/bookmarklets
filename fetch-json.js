javascript:(function() {
  window.fetchJson = async (method, url, reqBody, extras) => {
    method = method.toUpperCase();

    const response = await fetch(url, {
      cache: 'no-cache',
      ...(extras || {}),
      headers: {
        'Content-Type': reqBody !== undefined ?  'application/json' : undefined,
        ...(extras?.headers || {}),
      },
      method,
      body: reqBody !== undefined ? JSON.stringify(reqBody): undefined ,
    });

    let isJson = false;
    let body = undefined;

    if (response.status !== 204) {
      body = await response.text();

      try {
        body = JSON.parse(body);
        isJson = true;
      } catch(e) {
      }
    }

    const result = {
      ok: response.ok,
      status: response.status,
      isJson,
      body,
    };

    if (!extras?.noFail && !response.ok) {
      throw Object.assign(
        new Error(`(${response.status}) ${method} ${url}`),
        { name: 'RequestFailed' },
        result,
      );
    }

    return result;
  };
})();
