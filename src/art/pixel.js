// pixel.js: little helpers for drawing pixel art in code.
// Everything is drawn in whole pixels with flat colours: a dark outline,
// a fill, one highlight and one shade. No blurry gradients.

export const OUTLINE = '#1a1626';

// A new off-screen canvas to draw on (and keep, so we only draw it once)
export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

// A solid rectangle, snapped to whole pixels
export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// A box with a dark outline, a fill, a highlight along the top/left edge and
// a shade along the bottom/right edge
export function box(ctx, x, y, w, h, { fill, light, shade, outline = OUTLINE }) {
  rect(ctx, x, y, w, h, outline);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
  if (light) {
    rect(ctx, x + 1, y + 1, w - 2, 1, light);
    rect(ctx, x + 1, y + 1, 1, h - 2, light);
  }
  if (shade) {
    rect(ctx, x + 1, y + h - 2, w - 2, 1, shade);
    rect(ctx, x + w - 2, y + 2, 1, h - 3, shade);
  }
}

// A filled pixel circle, drawn row by row so its edge stays crisp
export function circle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

// A checkerboard of two colours: pixel art's way of blending
export function dither(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  for (let j = 0; j < h; j++) {
    for (let i = (j + x + y) % 2; i < w; i += 2) ctx.fillRect(x + i, y + j, 1, 1);
  }
}

// Random numbers for scenery only. They're seeded, so the city looks the
// same every time. (The game itself gets its randomness from Rust.)
export function sceneryRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Crisp pixel-font text ----------
// Canvas text is normally smoothed at the edges, which looks blurry when
// scaled up. So we draw each piece of text once, keep only fully-solid
// pixels, and reuse the result.

export const FONT = '"Press Start 2P"';
const masks = new Map();
const texts = new Map();

// White letters with only solid pixels
function textMask(text, size) {
  const key = size + '|' + text;
  if (masks.has(key)) return masks.get(key);
  const [probe, probeCtx] = makeCanvas(1, 1);
  probeCtx.font = `${size}px ${FONT}`;
  const w = Math.max(1, Math.ceil(probeCtx.measureText(text).width));
  probe.width = 0;
  const [canvas, ctx] = makeCanvas(w, size);
  ctx.font = `${size}px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, 0);
  const image = ctx.getImageData(0, 0, w, size);
  for (let i = 3; i < image.data.length; i += 4) image.data[i] = image.data[i] >= 110 ? 255 : 0;
  ctx.putImageData(image, 0, 0);
  masks.set(key, canvas);
  return canvas;
}

// The mask painted in one colour
function tint(mask, color) {
  const [canvas, ctx] = makeCanvas(mask.width, mask.height);
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, mask.width, mask.height);
  return canvas;
}

// A finished piece of text, with an optional outline and drop shadow
function textImage(text, size, color, outline, shadow) {
  const key = [text, size, color, outline, shadow].join('|');
  if (texts.has(key)) return texts.get(key);
  const mask = textMask(text, size);
  const pad = 2;
  const [canvas, ctx] = makeCanvas(mask.width + pad * 2, mask.height + pad * 2);
  if (shadow) ctx.drawImage(tint(mask, shadow), pad, pad + (outline ? 2 : 1));
  if (outline) {
    const dark = tint(mask, outline);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.drawImage(dark, pad + dx, pad + dy);
    }
  }
  ctx.drawImage(tint(mask, color), pad, pad);
  texts.set(key, canvas);
  if (texts.size > 400) texts.delete(texts.keys().next().value); // forget old score numbers
  return canvas;
}

// Draws text with its top-left (or top-centre / top-right) at x, y
export function pixelText(ctx, text, x, y, { size = 8, color = '#ffffff', outline = null, shadow = null, align = 'left' } = {}) {
  const image = textImage(String(text), size, color, outline, shadow);
  const width = image.width - 4;
  let left = x;
  if (align === 'center') left = x - Math.floor(width / 2);
  if (align === 'right') left = x - width;
  ctx.drawImage(image, Math.round(left) - 2, Math.round(y) - 2);
  return width;
}
