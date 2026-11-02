// strip.js: smooth scrolling for pixel art.
//
// The game is drawn straight onto the big screen canvas, blown up by a whole
// number (x2, x3, x4...). Art is still drawn in game pixels, but things that
// SCROLL are placed to the nearest SCREEN pixel instead of the nearest game
// pixel. Every pixel stays a crisp square, but movement is as smooth as the
// screen allows (no jumpy 1-game-pixel steps).

let scale = 1; // screen pixels per game pixel (render.js sets this)

export function setScale(s) {
  scale = s;
}

// Rounds a position to the nearest screen pixel
export function snap(v) {
  return Math.round(v * scale) / scale;
}

// Copies a long strip across the screen, scrolled by `offset` game pixels,
// repeating it as needed. `y` is where its top goes.
export function drawStrip(ctx, strip, offset, y, width = 480) {
  const w = strip.width;
  const shift = ((offset % w) + w) % w;
  for (let x = -snap(shift); x < width; x += w) ctx.drawImage(strip, x, y);
}
