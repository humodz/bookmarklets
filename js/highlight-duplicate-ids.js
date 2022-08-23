javascript:
(() => {
  const elements = [...document.querySelectorAll('[id]')];
  const ids = elements.map(el => el.id);
  const dups = elements.filter(el => ids.filter(id => id === el.id).length > 1);
  dups.forEach(el => el.style.border = '1px solid red !important');

  dups.sort((el1, el2) => el1.id.localeCompare(el2.id));
  console.log(dups);
})()
