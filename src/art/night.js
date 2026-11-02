// night.js: the title screen scene. The boy stands on a rooftop at night,
// with the lit-up city behind him. Drawn in code as pixel art, like Downtown.
import { WIDTH, HEIGHT } from '../world.js';
import { mixHex } from './palette.js';
import { makeCanvas, rect, box, circle, dither, sceneryRandom, OUTLINE } from './pixel.js';

export const ROOF_Y = 208; // where the boy stands on the title screen

function makeSky(rand) {
  const [canvas, ctx] = makeCanvas(WIDTH, HEIGHT);
  const bands = 8;
  const bottom = 200;
  const colors = [];
  for (let i = 0; i < bands; i++) colors.push(mixHex('#120e26', '#3d2e66', i / (bands - 1)));
  const bandHeight = bottom / bands;
  colors.forEach((c, i) => rect(ctx, 0, Math.floor(i * bandHeight), WIDTH, Math.ceil(bandHeight) + 1, c));
  rect(ctx, 0, bottom, WIDTH, HEIGHT - bottom, colors[bands - 1]);
  for (let i = 1; i < bands; i++) dither(ctx, 0, Math.floor(i * bandHeight) - 1, WIDTH, 2, colors[i]);
  // The moon, with craters and a bright edge
  circle(ctx, 412, 46, 17, '#d8c9a6');
  circle(ctx, 411, 45, 16, '#f4ead0');
  circle(ctx, 405, 41, 4, '#e3d6b6');
  circle(ctx, 417, 52, 3, '#e3d6b6');
  circle(ctx, 419, 38, 2, '#e3d6b6');
  rect(ctx, 400, 33, 3, 1, '#ffffff');
  rect(ctx, 398, 35, 1, 3, '#ffffff');
  // Still stars (the twinkling ones are drawn every frame)
  for (let i = 0; i < 70; i++) rect(ctx, Math.floor(rand() * WIDTH), Math.floor(rand() * 150), 1, 1, i % 3 ? '#8f86c9' : '#d9d4ff');
  return canvas;
}

// A strip of building silhouettes with lit windows
function makeSkyline(rand, { width, height, minH, maxH, fill, light, windowColor, chance, grid }) {
  const [canvas, ctx] = makeCanvas(width, height);
  let x = 0;
  while (x < width) {
    const w = Math.min(width - x, grid[0] * (4 + Math.floor(rand() * 6)) + 4);
    const h = minH + Math.floor(rand() * (maxH - minH));
    const top = height - h;
    rect(ctx, x, top, w, h, fill);
    rect(ctx, x, top, w, 1, light);
    if (rand() < 0.35) {
      const ax = x + 3 + Math.floor(rand() * (w - 6));
      rect(ctx, ax, top - 10, 1, 10, fill);
    }
    for (let wy = top + 5; wy < height - 3; wy += grid[1]) {
      for (let wx = x + 3; wx < x + w - 3; wx += grid[0]) {
        if (rand() < chance) rect(ctx, wx, wy, grid[0] - 2, grid[1] - 3, windowColor);
      }
    }
    x += w + (rand() < 0.3 ? 3 : 0);
  }
  return canvas;
}

function makeRooftop(rand) {
  const [canvas, ctx] = makeCanvas(WIDTH, HEIGHT - ROOF_Y + 40);
  const top = 40; // the roof surface, inside this canvas

  // Water tower on the right
  const tx = 372;
  for (const lx of [tx + 3, tx + 24]) rect(ctx, lx, top - 18, 2, 18, OUTLINE);
  rect(ctx, tx + 3, top - 10, 23, 1, OUTLINE);
  box(ctx, tx, top - 40, 30, 23, { fill: '#5e3d34', light: '#7a5245', shade: '#472d27' });
  for (let y = top - 34; y < top - 18; y += 6) rect(ctx, tx + 1, y, 28, 1, '#472d27');
  rect(ctx, tx - 1, top - 44, 32, 4, OUTLINE);
  rect(ctx, tx + 2, top - 47, 26, 3, OUTLINE);
  rect(ctx, tx + 7, top - 49, 16, 2, OUTLINE);
  rect(ctx, tx + 1, top - 43, 28, 2, '#472d27');

  // Air-conditioning unit with a fan grille
  box(ctx, 290, top - 14, 26, 14, { fill: '#5c5480', light: '#736a98', shade: '#463f66' });
  circle(ctx, 299, top - 7, 4, '#3a3352');
  for (let i = -3; i <= 3; i += 2) rect(ctx, 296, top - 7 + i, 7, 1, '#2b2440');
  rect(ctx, 306, top - 11, 7, 1, '#463f66');
  rect(ctx, 306, top - 8, 7, 1, '#463f66');

  // Antenna (its light blinks, drawn every frame)
  rect(ctx, 250, top - 46, 1, 46, OUTLINE);
  rect(ctx, 246, top - 40, 9, 1, OUTLINE);
  rect(ctx, 247, top - 32, 7, 1, OUTLINE);

  // String lights from the antenna to the water tower
  for (let x = 251; x < tx + 2; x += 1) {
    const sag = Math.round(8 * Math.sin(((x - 251) / (tx + 2 - 251)) * Math.PI));
    rect(ctx, x, top - 38 + sag, 1, 1, OUTLINE);
    if ((x - 251) % 10 === 5) rect(ctx, x, top - 37 + sag, 1, 2, ['#ffd166', '#ff5fa2', '#5ff2e8'][((x - 251) / 10) % 3 | 0]);
  }

  // The roof edge (a ledge with a cap) and the wall below it
  rect(ctx, 0, top, WIDTH, 5, OUTLINE);
  rect(ctx, 0, top + 1, WIDTH, 3, '#5a4f80');
  rect(ctx, 0, top + 1, WIDTH, 1, '#7a6fa3');
  rect(ctx, 0, top + 5, WIDTH, canvas.height - top - 5, '#2f2846');
  for (let y = top + 9; y < canvas.height; y += 5) {
    rect(ctx, 0, y, WIDTH, 1, '#262039');
    for (let x = ((y / 5) % 2) * 5; x < WIDTH; x += 10) rect(ctx, x, y - 4, 1, 4, '#262039');
  }
  // A few lit windows in the building he's standing on
  for (const wx of [40, 150, 330, 420]) {
    box(ctx, wx, top + 18, 16, 14, { fill: rand() < 0.7 ? '#ffd166' : '#29233c', light: '#fff0b5' });
    rect(ctx, wx + 1, top + 25, 14, 1, OUTLINE);
  }
  return canvas;
}

export function createNight() {
  const rand = sceneryRandom(1021);
  const sky = makeSky(rand);
  const far = makeSkyline(rand, {
    width: 960, height: 120, minH: 50, maxH: 115,
    fill: '#2b2350', light: '#3b3068', windowColor: '#5d4d94', chance: 0.14, grid: [4, 6],
  });
  const mid = makeSkyline(rand, {
    width: 1200, height: 150, minH: 60, maxH: 140,
    fill: '#1d1830', light: '#2c2545', windowColor: '#d9a54e', chance: 0.22, grid: [6, 8],
  });
  const roof = makeRooftop(rand);
  const twinkles = Array.from({ length: 24 }, () => [Math.floor(rand() * WIDTH), Math.floor(rand() * 140), rand() * 10]);

  const strip = (ctx, image, offset, y) => {
    for (let x = -(Math.floor(offset) % image.width); x < WIDTH; x += image.width) ctx.drawImage(image, x, y);
  };

  return {
    draw(ctx, time) {
      ctx.drawImage(sky, 0, 0);
      for (const [x, y, phase] of twinkles) {
        const glow = Math.sin(time * 2 + phase);
        if (glow > 0.3) rect(ctx, x, y, 1, 1, '#ffffff');
        if (glow > 0.85) {
          rect(ctx, x - 1, y, 3, 1, '#d9d4ff');
          rect(ctx, x, y - 1, 1, 3, '#d9d4ff');
        }
      }
      strip(ctx, far, time * 3, 205 - far.height);
      strip(ctx, mid, time * 7, ROOF_Y + 4 - mid.height);
      ctx.drawImage(roof, 0, ROOF_Y - 40);
      // The antenna's red light blinks once a second
      if (time % 1 < 0.5) rect(ctx, 249, ROOF_Y - 48, 3, 3, '#ff4d6d');
    },
  };
}
