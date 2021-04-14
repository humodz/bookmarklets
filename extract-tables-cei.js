javascript:(function () {
  const $ = (s, e=document) => e.querySelector(s);
  const $$ = (s, e=document) => [...e.querySelectorAll(s)];

  const $tables = $$('.section-container');

  for (const $table of $tables) {
    const table = getTableData($table);
    const filename = sanitize(table.title);
    download(filename + '.json', JSON.stringify(table.data, null, 2));
  }

  function getTableData($table) {
    const title = $('.title', $table)?.innerText || 'untitled';

    const header = $$('thead th', $table).map($cell => $cell.innerText);

    const rows = $$('tbody tr', $table).map(
      row => $$('td', row).map($cell => $cell.innerText),
    );

    const data = rows.map(row => {
      const item = {};

      header.forEach((column, i) => {
        item[column] = row[i];
      });

      return item;
    });

    return { title, data };
  }

  function sanitize(name) {
    return name
      .trim()
      .replace(/\s+|-+/g, '_')
      .replace(/[^\w]+/g, '')
      .toLowerCase();
  }

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
})();
