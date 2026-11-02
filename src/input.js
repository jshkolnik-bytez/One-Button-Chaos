// input.js: turns Space, a left mouse click, or a screen tap into ONE button.
// It calls onPress when the button goes down and onRelease when it comes up.
// Every other key and mouse button is ignored.

// Clicks on real menu buttons and links are for the menu, not the game.
function isMenuControl(target) {
  return target instanceof Element && target.closest('button, a, [data-menu]') !== null;
}

export function createInput({ onPress, onRelease, onFocusLost }) {
  let spaceDown = false;
  const fingers = new Set(); // mouse/touch pointers that are currently down
  let held = false;

  // Works out if the one button is down, and reports any change
  function update() {
    const down = spaceDown || fingers.size > 0;
    if (down && !held) {
      held = true;
      onPress();
    } else if (!down && held) {
      held = false;
      onRelease();
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    e.preventDefault(); // stop Space from scrolling the page or clicking buttons
    if (e.repeat) return; // holding Space sends repeats; we only want the first
    spaceDown = true;
    update();
  });

  window.addEventListener('keyup', (e) => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    spaceDown = false;
    update();
  });

  // Pointer events cover the mouse, touch screens and pens in one go
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return; // left button only
    if (isMenuControl(e.target)) return;
    fingers.add(e.pointerId);
    update();
  });

  const lift = (e) => {
    if (fingers.delete(e.pointerId)) update();
  };
  window.addEventListener('pointerup', lift);
  window.addEventListener('pointercancel', lift);

  // Long-pressing on a phone opens a menu; holding is part of the game, so block it
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  // If the window loses focus, tell the game first (so it can pause),
  // then let go of the button so it doesn't get "stuck" down
  function letGo() {
    spaceDown = false;
    fingers.clear();
    update();
  }
  window.addEventListener('blur', () => {
    onFocusLost?.();
    letGo();
  });

  return {
    isHeld: () => held,
    letGo,
  };
}
