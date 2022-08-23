javascript:
(() => {
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

  const accessToken = Object
    .entries(localStorage)
    .filter(entry => entry[0].includes('idToken'))
    .map(entry => entry[1])[0];

  if (!accessToken) {
    alert('Access Token not found. Are you logged in to this page?');
  } else {
    copy(accessToken);
  }
})()