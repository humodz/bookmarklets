javascript:
(() => {
  const passwordFields = document.querySelectorAll('[type="password"]');
  const exposedPasswordfields = document.querySelectorAll('[data-was-password]');

  passwordFields.forEach(e => {
    e.type = 'text';
    e.setAttribute('data-was-password', '');
  });

  exposedPasswordfields.forEach(e => {
    e.type = 'password';
    e.removeAttribute('data-was-password');
  });
})()
