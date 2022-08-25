function h(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);

  for (const [name, value] of Object.entries(attributes)) {
    if (name.startsWith('on')) {
      element.addEventListener(name.replace(/^on/, ''), value);
    } else if (name in element) {
      if (value !== null && value !== undefined) {
        element[name] = value;
      }
    } else {
      element.setAttribute(name, value);
    }
  }

  if (!Array.isArray(children)) {
    children = [children];
  }

  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) {
      element.append(child);
    }
  }

  return element;
}

// Usage

const element = h('div', { id: 'root' }, [
  h('p', { class: 'message' }, 'Hello World'),
  h('button', {
    onclick: () => console.log('hello'),
  }, 'Click me!'),
]);

// Will create the following:

/*
<div id="root">
  <p class="message">Hello World</p>
  <button>Click me!</button>
</div>

button.addEventListener('click', () => console.log('hello'));
*/