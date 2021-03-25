javascript:(function(){
  const els = [...document.querySelectorAll('router-outlet + *')];
  alert(els.map(e => e.tagName.toLowerCase()).join('\n'));
}());
