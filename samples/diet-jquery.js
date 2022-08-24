const $ = (selector, element = document) => element.querySelector(selector);
const $$ = (selector, element = document) => [...element.querySelectorAll(selector)];

// Usage
const nav = $('nav');
const title = $('h1', nav);
const navLinks = $$('nav a');