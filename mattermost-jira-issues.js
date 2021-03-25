javascript: (function () {
  const jiraBaseUrl = 'secret';

  function addJiraLinks(text) {
    return text.replace(
      /(\/)?([A-Z]+-[0-9]+)(\]\()?/g,
      /* checks if it starts with / so it doesn't ruin links */
      /* checks if it ends in ]( so it doesn't ruin markdown links */
      (orig, open, issue, close) => {
        return (open || close) ? orig : `[${issue}](${jiraBaseUrl}/browse/${issue})`;
      }
    );
  }

  function onKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey && (event.target.id === 'post_textbox' || event.target.id === 'edit_textbox')) {
      event.target.value = addJiraLinks(event.target.value);
      event.target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  if (window.__ON_KEY_PRESS__) {
    document.body.removeEventListener('keypress', window.__ON_KEY_PRESS__, true);
  }

  window.__ON_KEY_PRESS__ = onKeyPress;
  document.body.addEventListener('keypress', onKeyPress, true);
}());
