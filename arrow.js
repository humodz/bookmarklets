javascript: (function() {
  const el = document.createElement('div');

  el.innerText = '🡄';
  el.style = `
    position: fixed;
    top: 50px;
    left: 50px;
    z-index: 999;
    font-size: 64px;
    color: red;
    user-select: none;

    display: flex;
    justify-content: center;
    align-items: center;
    line-height: 1;

    transform: rotate(0deg);
  `;

  let initialPos = null;
  let isDragging = false;

  el.onmousedown = onMouseDown;

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('keydown', onKeyDown);

  function onMouseDown(event) {
    isDragging = true;
    initialPos = { x: event.clientX, y: event.clientY };
  };

  function onMouseMove(event) {
    if (isDragging) {
      const newPos = { x: event.clientX, y: event.clientY };
      const delta = {
        x: initialPos.x - newPos.x,
        y: initialPos.y - newPos.y,
      };

      el.style.left = (el.offsetLeft - delta.x) + 'px';
      el.style.top = (el.offsetTop - delta.y) + 'px';
      initialPos = newPos;
    }
  }

  function onMouseUp() {
    isDragging = false;
  }

  function onKeyDown(event) {
    console.log('onKeyDown', event);
    const antiClockwise = event.key === 'ArrowLeft';
    const clockwise = event.key === 'ArrowRight';

    if (antiClockwise || clockwise) {
      const currentRotation = Number(/-?\d+/.exec(el.style.transform)[0]);
      console.log('rot =', currentRotation);

      const newRotation = currentRotation + 10 * (clockwise ? 1 : -1);
      console.log('new rot =', newRotation);
      el.style.transform = `rotate(${newRotation}deg)`;
    }
  }

  document.body.appendChild(el);
}());
