javascript: (function() {
  let elId = 'bookmarkelt-mattermost-edit-monospace';
  let styleEl = document.getElementById(elId);

  if (!styleEl) {
    styleEl = document.createElement('style');
    document.head.appendChild(styleEl);
    styleEl.id = elId;
    styleEl.type = 'text/css';
  }

  if (!styleEl.innerText) {
    styleEl.innerText = '#post_textbox, #edit_textbox { font-family: monospace !important; }';
  } else {
    styleEl.innerText = '';
  }
}());
