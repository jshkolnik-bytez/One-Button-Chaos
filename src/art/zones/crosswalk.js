// zones/crosswalk.js: the Crosswalk, a big busy junction at neon dusk.
//
// Layers (back to front): night sky with stars and a moon > glowing clouds >
// far towers > tall buildings with billboards and vertical neon > shops at
// street level (cinema, 24/7 mart, arcade, boba) > wet pavement and road >
// street lamps. Neon flickers and the cinema bulbs chase.
//
// The obstacle is a JUNCTION: a side street crossing the pavement, with a
// zebra crossing, a traffic light and a car that drives out of the side street
// toward you. o.a = car progress: it appears at -0.8, covers the pavement from
// 0 to 1 (that's when it can hit the boy), and is gone by 1.8. -999 = no car.
import { WIDTH, HEIGHT, KIND } from '../../world.js';
import { mixHex } from '../palette.js';
import { makeCanvas, rect, box, circle, dither, pixelText, sceneryRandom, OUTLINE } from '../pixel.js';
import { drawStrip } from '../strip.js';

const C = {
  skyTop: '#120c2c',
  skyMid: '#331a5a',
  skyLow: '#7a2f72',
  star: '#d9d0ff',
  starDim: '#8f80c8',
  moon: '#f4ecff',
  moonShade: '#c8b8f0',
  cloud: '#3b2160',
  cloudLit: '#8a3a78',
  cloudEdge: '#c45a8e',
  far: '#2c2456',
  farLight: '#3a3070',
  farWindow: '#6f62b8',
  farPink: '#b85fae',
  tower: '#1f1a3c',
  towerLight: '#2d2652',
  towerShade: '#16122b',
  winWarm: '#ffd166',
  winWarmLight: '#fff0b5',
  winCool: '#7fe7ff',
  winCoolLight: '#d6fbff',
  winOff: '#1a152f',
  shop: '#2a2242',
  shopLight: '#3a3058',
  shopShade: '#1d172f',
  pave: '#56517c',
  paveLight: '#6c6795',
  paveSeam: '#45406a',
  paveSpeck: '#4c4772',
  curb: '#8a87b0',
  curbLight: '#b0add2',
  curbShade: '#57537e',
  road: '#262234',
  roadSpeck: '#2f2a40',
  roadLine: '#e9e4f5',
  zebra: '#f2eefa',
  zebraShade: '#bdb6d6',
  tactile: '#ffd23f',
  tactileShade: '#c99a1a',
  pink: '#ff5fa2',
  pinkGlow: '#7a1f55',
  cyan: '#3fd6ff',
  cyanGlow: '#14506a',
  red: '#ff6b6b',
  redGlow: '#6e1d2a',
  yellow: '#ffd166',
  yellowGlow: '#6a4a10',
  green: '#5fffa0',
  greenGlow: '#155a37',
  lamp: '#eef6ff',
  lampGlow: '#9fb4ff',
};

const NEONS = [
  [C.pink, C.pinkGlow],
  [C.cyan, C.cyanGlow],
  [C.yellow, C.yellowGlow],
  [C.green, C.greenGlow],
  [C.red, C.redGlow],
];

// ---------- Sky ----------

function makeSky(rand) {
  const [canvas, ctx] = makeCanvas(WIDTH, HEIGHT);
  const bands = 14;
  const bottom = 222;
  const h = bottom / bands;
  const colors = [];
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    colors.push(t < 0.6 ? mixHex(C.skyTop, C.skyMid, t / 0.6) : mixHex(C.skyMid, C.skyLow, (t - 0.6) / 0.4));
  }
  colors.forEach((color, i) => rect(ctx, 0, Math.floor(i * h), WIDTH, Math.ceil(h) + 1, color));
  rect(ctx, 0, bottom, WIDTH, HEIGHT - bottom, colors[bands - 1]);
  for (let i = 1; i < bands; i++) dither(ctx, 0, Math.floor(i * h) - 1, WIDTH, 2, colors[i]);

  // Stars: lots of faint ones, a few bright crosses
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(rand() * WIDTH);
    const y = Math.floor(rand() * 120);
    rect(ctx, x, y, 1, 1, rand() < 0.3 ? C.star : C.starDim);
  }
  for (let i = 0; i < 7; i++) {
    const x = 10 + Math.floor(rand() * (WIDTH - 20));
    const y = 8 + Math.floor(rand() * 90);
    rect(ctx, x, y - 1, 1, 3, C.starDim);
    rect(ctx, x - 1, y, 3, 1, C.starDim);
    rect(ctx, x, y, 1, 1, '#ffffff');
  }

  // A crescent moon with a soft halo
  const mx = 392;
  const my = 66;
  for (let y = -18; y <= 18; y++) {
    for (let x = -18; x <= 18; x++) {
      if ((x + y) % 2 === 0 && x * x + y * y < 18 * 18) rect(ctx, mx + x, my + y, 1, 1, '#3a2468');
    }
  }
  circle(ctx, mx, my, 13, C.moonShade);
  circle(ctx, mx, my, 12, C.moon);
  circle(ctx, mx + 6, my - 4, 11, colors[Math.floor(my / h)]);
  rect(ctx, mx - 9, my - 2, 2, 2, '#ffffff');
  rect(ctx, mx - 7, my + 5, 1, 1, C.moonShade);
  return canvas;
}

function makeCloud(rand) {
  const w = 50 + Math.floor(rand() * 50);
  const [canvas, ctx] = makeCanvas(w + 4, 18);
  const puffs = [];
  for (let x = 8; x < w - 4; x += 8 + Math.floor(rand() * 6)) puffs.push([x, 9 - Math.floor(rand() * 4), 4 + Math.floor(rand() * 3)]);
  for (const [x, y, r] of puffs) circle(ctx, x, y, r, C.cloud);
  rect(ctx, 4, 9, w - 6, 4, C.cloud);
  // City glow lights their bellies pink
  for (const [x, y, r] of puffs) rect(ctx, x - r + 1, y + r - 1, r * 2 - 1, 1, C.cloudLit);
  rect(ctx, 5, 13, w - 8, 1, C.cloudLit);
  rect(ctx, 8, 14, w - 14, 1, C.cloudEdge);
  return canvas;
}

function makeClouds(rand) {
  const [canvas, ctx] = makeCanvas(960, 120);
  for (let x = 20; x < 880; x += 150 + Math.floor(rand() * 160)) ctx.drawImage(makeCloud(rand), x, 20 + Math.floor(rand() * 70));
  return canvas;
}

// ---------- Far towers ----------

function makeFar(rand) {
  const W = 960;
  const H = 150;
  const [canvas, ctx] = makeCanvas(W, H);
  let x = 0;
  while (x < W) {
    const w = Math.min(W - x, 16 + Math.floor(rand() * 30));
    const h = 50 + Math.floor(rand() * 95);
    const top = H - h;
    rect(ctx, x, top, w, h, C.far);
    rect(ctx, x, top, w, 1, C.farLight);
    if (rand() < 0.35 && w > 10) {
      // Antenna with a red light
      const ax = x + Math.floor(w / 2);
      rect(ctx, ax, top - 14, 1, 14, C.far);
      rect(ctx, ax, top - 15, 1, 1, '#ff4d6d');
    } else if (rand() < 0.3 && w > 14) {
      // Stepped top
      rect(ctx, x + 3, top - 6, w - 6, 6, C.far);
      rect(ctx, x + 3, top - 6, w - 6, 1, C.farLight);
    }
    for (let wy = top + 4; wy < H - 3; wy += 5) {
      for (let wx = x + 2; wx < x + w - 2; wx += 3) {
        const r = rand();
        if (r < 0.1) rect(ctx, wx, wy, 1, 2, C.farWindow);
        else if (r < 0.13) rect(ctx, wx, wy, 1, 2, C.farPink);
      }
    }
    x += w;
  }
  return canvas;
}

// ---------- Tall buildings with billboards ----------

const BILLBOARDS = ['SODA', 'SK8 PARK', 'RAMEN', 'CHAOS!', 'NOODLES', 'GAMES', 'PIZZA', 'NEON'];

function billboard(ctx, x, y, word, rand) {
  const w = word.length * 8 + 14;
  const h = 26;
  const [neon, glow] = NEONS[Math.floor(rand() * NEONS.length)];
  // Glow behind the board, then frame, then the lit panel
  dither(ctx, x - 3, y - 3, w + 6, h + 6, glow);
  box(ctx, x, y, w, h, { fill: mixHex('#120c2c', neon, 0.25), light: mixHex('#120c2c', neon, 0.45) });
  rect(ctx, x + 2, y + 2, w - 4, 1, neon);
  rect(ctx, x + 2, y + h - 3, w - 4, 1, neon);
  pixelText(ctx, word, x + 7, y + 9, { color: '#ffffff', outline: neon });
  // Little lamps on top and a support frame under it
  for (let lx = x + 4; lx < x + w - 2; lx += 10) {
    rect(ctx, lx, y - 3, 1, 3, OUTLINE);
    rect(ctx, lx - 1, y - 4, 3, 1, '#d8d0f0');
  }
  rect(ctx, x + 4, y + h, 2, 6, OUTLINE);
  rect(ctx, x + w - 6, y + h, 2, 6, OUTLINE);
  rect(ctx, x + 4, y + h + 3, w - 8, 1, OUTLINE);
}

function verticalSign(ctx, x, y, word, rand) {
  const [neon, glow] = NEONS[Math.floor(rand() * NEONS.length)];
  const h = word.length * 10 + 6;
  dither(ctx, x - 2, y - 2, 16, h + 4, glow);
  box(ctx, x, y, 12, h, { fill: '#160f2a', light: '#2a2045' });
  [...word].forEach((ch, i) => pixelText(ctx, ch, x + 2, y + 4 + i * 10, { color: '#ffffff', outline: neon }));
  rect(ctx, x - 3, y + 4, 3, 2, OUTLINE);
  rect(ctx, x - 3, y + h - 6, 3, 2, OUTLINE);
}

function makeMid(rand) {
  const W = 1440;
  const H = 180;
  const [canvas, ctx] = makeCanvas(W, H);
  let x = 6;
  let billboardIndex = 0;
  while (x < W - 60) {
    const w = 2 * (26 + Math.floor(rand() * 24));
    if (x + w > W - 6) break;
    const h = 90 + Math.floor(rand() * 85);
    const top = H - h;
    box(ctx, x, top, w, h + 1, { fill: C.tower, light: C.towerLight, shade: C.towerShade });
    rect(ctx, x - 1, top, w + 2, 3, OUTLINE);
    rect(ctx, x, top + 1, w, 1, '#3a3168');
    // Window grid: warm and cool lights, some rooms dark
    const lit = 0.25 + rand() * 0.3;
    const cool = rand() < 0.4;
    for (let wy = top + 8; wy < H - 5; wy += 8) {
      for (let wx = x + 4; wx < x + w - 6; wx += 6) {
        const r = rand();
        if (r < lit) {
          const warm = cool ? r < lit * 0.3 : r < lit * 0.8;
          rect(ctx, wx, wy, 3, 4, warm ? C.winWarm : C.winCool);
          rect(ctx, wx, wy, 3, 1, warm ? C.winWarmLight : C.winCoolLight);
        } else rect(ctx, wx, wy, 3, 4, C.winOff);
      }
    }
    // A billboard on the roof, or one bolted to the wall
    billboardIndex = (billboardIndex + 1 + Math.floor(rand() * 3)) % BILLBOARDS.length;
    const word = BILLBOARDS[billboardIndex];
    const bw = word.length * 8 + 14;
    const style = rand();
    if (style < 0.45 && bw <= w + 16 && top > 40) {
      billboard(ctx, x + Math.floor((w - bw) / 2), top - 34, word, rand);
    } else if (style < 0.75 && bw <= w - 6) {
      billboard(ctx, x + Math.floor((w - bw) / 2), top + 14 + Math.floor(rand() * 20), word, rand);
    } else {
      // Rooftop water tank or aerial
      rect(ctx, x + 8, top - 10, 1, 10, OUTLINE);
      rect(ctx, x + 6, top - 11, 5, 1, '#ff4d6d');
    }
    // Vertical neon down the corner
    if (rand() < 0.4 && h > 110) {
      const v = ['HOTEL', 'BAR', 'SUSHI', 'OPEN'][Math.floor(rand() * 4)];
      verticalSign(ctx, x + w - 4, top + 30, v, rand);
    }
    x += w + (rand() < 0.4 ? 4 + Math.floor(rand() * 10) : 0);
  }
  return canvas;
}

// ---------- Street-level shops (two versions, so neon can blink) ----------

const SHOP_H = 112;

function marqueeShop(ctx, x, w, h, rand, phase) {
  const top = SHOP_H - h;
  box(ctx, x, top, w, h + 1, { fill: '#3a1f3f', light: '#55305a', shade: '#28152c' });
  // CINEMA in big letters up the front
  const sw = 6 * 8 + 10;
  box(ctx, x + Math.floor((w - sw) / 2), top + 6, sw, 14, { fill: '#160f2a', light: '#2a2045' });
  pixelText(ctx, 'CINEMA', x + Math.floor((w - sw) / 2) + 5, top + 9, { color: '#fff3c4', outline: phase ? C.red : '#a33f4f' });
  // The marquee board with chasing bulbs
  const my = SHOP_H - 46;
  box(ctx, x + 2, my, w - 4, 18, { fill: '#f4ecff', shade: '#c8b8f0' });
  pixelText(ctx, 'SK8 MOVIE', x + Math.floor((w - 72) / 2), my + 5, { color: '#2a1a3a' });
  for (let bx = x + 3, i = 0; bx < x + w - 3; bx += 3, i++) {
    const on = (i + phase) % 2 === 0;
    rect(ctx, bx, my - 2, 1, 1, on ? '#fff6c8' : '#8a6a3a');
    rect(ctx, bx, my + 18, 1, 1, on ? '#8a6a3a' : '#fff6c8');
  }
  rect(ctx, x + 1, my + 19, w - 2, 2, OUTLINE);
  // Glass doors and posters
  const dy = SHOP_H - 24;
  for (let dx = x + 8; dx < x + w - 14; dx += 14) {
    box(ctx, dx, dy, 10, 24, { fill: '#ffcf8a', light: '#fff0c8', shade: '#d89a50' });
    rect(ctx, dx + 4, dy + 1, 1, 23, '#d89a50');
  }
}

function martShop(ctx, x, w, h, rand, phase) {
  const top = SHOP_H - h;
  box(ctx, x, top, w, h + 1, { fill: '#2c3550', light: '#3d4868', shade: '#202740' });
  upstairs(ctx, x, w, top, SHOP_H - 46, rand);
  // Bright sign band
  const by = SHOP_H - 44;
  rect(ctx, x + 1, by, w - 2, 12, OUTLINE);
  rect(ctx, x + 2, by + 1, w - 4, 10, '#f4f4ff');
  rect(ctx, x + 2, by + 9, w - 4, 2, C.red);
  pixelText(ctx, '24/7', x + 5, by + 2, { color: C.red });
  if (w > 76) pixelText(ctx, 'MART', x + w - 37, by + 2, { color: '#2c3550' });
  // Big glass front lit cold-white, with shelves and a cat
  const gy = SHOP_H - 31;
  box(ctx, x + 3, gy, w - 6, 31, { fill: '#d8f5ff', light: '#ffffff', shade: '#9fd0e4' });
  for (let sy = gy + 7; sy < SHOP_H - 4; sy += 8) {
    rect(ctx, x + 6, sy, w - 12, 1, '#7aa8bc');
    for (let ix = x + 7; ix < x + w - 8; ix += 3 + Math.floor(rand() * 3)) {
      const ih = 2 + Math.floor(rand() * 4);
      rect(ctx, ix, sy - ih, 2, ih, ['#ff6b6b', '#3fb8aa', '#ffd166', '#7b6cff', '#ff8fd0'][Math.floor(rand() * 5)]);
    }
  }
  for (let fx = x + 3 + Math.floor((w - 6) / 3); fx < x + w - 4; fx += Math.floor((w - 6) / 3)) rect(ctx, fx, gy, 1, 31, '#7aa8bc');
  if (!phase) rect(ctx, x + 6, gy + 2, 4, 1, '#ffffff');
}

function arcadeShop(ctx, x, w, h, rand, phase) {
  const top = SHOP_H - h;
  box(ctx, x, top, w, h + 1, { fill: '#1d1636', light: '#2c2350', shade: '#140f27' });
  upstairs(ctx, x, w, top, SHOP_H - 48, rand);
  // Neon ARCADE with a pixel invader
  const by = SHOP_H - 46;
  const lit = phase || rand() < 0.5;
  dither(ctx, x + 4, by - 2, w - 8, 18, C.pinkGlow);
  pixelText(ctx, 'ARCADE', x + 6, by + 3, { color: lit ? '#ffffff' : '#b28ab8', outline: lit ? C.pink : '#7a3a6a' });
  const ix = x + w - 18;
  const inv = ['..o.....o..', '...o...o...', '..ooooooo..', '.oo.ooo.oo.', 'ooooooooooo', 'o.ooooooo.o', 'o.o.....o.o', '...oo.oo...'];
  inv.forEach((row, j) => [...row].forEach((ch, i) => ch === 'o' && i < 11 && rect(ctx, ix - 2 + Math.floor(i * 1), by + 2 + j, 1, 1, C.cyan)));
  // Dark window full of glowing cabinet screens
  const gy = SHOP_H - 28;
  box(ctx, x + 4, gy, w - 8, 28, { fill: '#0f0b1f', light: '#241c40' });
  for (let cx = x + 8; cx < x + w - 12; cx += 10) {
    rect(ctx, cx, gy + 6, 7, 22, '#2a2045');
    rect(ctx, cx + 1, gy + 8, 5, 5, NEONS[Math.floor(rand() * NEONS.length)][0]);
    rect(ctx, cx + 2, gy + 15, 3, 1, '#ff4d6d');
  }
}

function bobaShop(ctx, x, w, h, rand, phase) {
  const top = SHOP_H - h;
  box(ctx, x, top, w, h + 1, { fill: '#3d2a4f', light: '#523a68', shade: '#2b1d39' });
  upstairs(ctx, x, w, top, SHOP_H - 46, rand);
  // Round neon cup
  const cx = x + 14;
  const cy = SHOP_H - 38;
  rect(ctx, cx - 5, cy - 7, 11, 1, C.cyan);
  rect(ctx, cx - 5, cy - 6, 1, 12, C.cyan);
  rect(ctx, cx + 5, cy - 6, 1, 12, C.cyan);
  rect(ctx, cx - 4, cy + 6, 9, 1, C.cyan);
  rect(ctx, cx + 2, cy - 11, 1, 4, C.pink);
  for (let i = 0; i < 4; i++) rect(ctx, cx - 3 + i * 2, cy + 3, 1, 1, phase ? '#ffffff' : '#c9b3ff');
  pixelText(ctx, 'BOBA', x + 26, cy - 4, { color: '#ffffff', outline: C.cyan });
  // Warm window with stools
  const gy = SHOP_H - 26;
  box(ctx, x + 4, gy, w - 8, 26, { fill: '#ffd08a', light: '#fff0c8', shade: '#d89a50' });
  rect(ctx, x + 5, gy + 14, w - 10, 2, '#a86a3a');
  for (let sx = x + 9; sx < x + w - 10; sx += 9) {
    rect(ctx, sx, gy + 18, 4, 1, '#ff5fa2');
    rect(ctx, sx + 1, gy + 19, 1, 6, '#5a3a2a');
  }
}

function pharmacy(ctx, x, w, h, rand, phase) {
  const top = SHOP_H - h;
  box(ctx, x, top, w, h + 1, { fill: '#26384a', light: '#34506a', shade: '#1b2938' });
  upstairs(ctx, x, w, top, SHOP_H - 50, rand);
  // A glowing green cross sign sticking out
  const sx = x + w - 20;
  const sy = SHOP_H - 52;
  dither(ctx, sx - 2, sy - 2, 18, 18, C.greenGlow);
  box(ctx, sx, sy, 14, 14, { fill: '#0e2a1c' });
  const g = phase ? C.green : '#2fbf70';
  rect(ctx, sx + 5, sy + 2, 4, 10, g);
  rect(ctx, sx + 2, sy + 5, 10, 4, g);
  rect(ctx, sx + 6, sy + 3, 1, 3, '#ffffff');
  const gy = SHOP_H - 28;
  box(ctx, x + 4, gy, w - 30, 28, { fill: '#e8fff2', light: '#ffffff', shade: '#a8d8bc' });
  for (let sy2 = gy + 8; sy2 < SHOP_H - 2; sy2 += 7) rect(ctx, x + 6, sy2, w - 34, 1, '#7ab89a');
  box(ctx, x + w - 24, gy, 14, 28, { fill: '#1d2a38', light: '#2e3e52' });
  rect(ctx, x + w - 21, gy + 3, 8, 10, '#e8fff2');
}

// Upstairs rooms and a zig-zag fire escape
function upstairs(ctx, x, w, top, bottom, rand) {
  for (let wy = top + 7; wy < bottom - 12; wy += 15) {
    for (let wx = x + 6; wx < x + w - 10; wx += 14) {
      const lit = rand() < 0.55;
      const warm = rand() < 0.6;
      box(ctx, wx, wy, 9, 11, { fill: lit ? (warm ? C.winWarm : C.winCool) : C.winOff, light: lit ? (warm ? C.winWarmLight : C.winCoolLight) : '#2a2442' });
      if (lit && rand() < 0.4) rect(ctx, wx + 1, wy + 1, 7, 3, warm ? '#e0a84a' : '#4fb8d8'); // a blind half down
      rect(ctx, wx - 1, wy + 11, 11, 1, '#5a5282');
    }
  }
  if (rand() < 0.35 && bottom - top > 40) {
    const fx = x + w - 24;
    for (let fy = top + 16; fy < bottom - 10; fy += 15) {
      rect(ctx, fx, fy, 18, 1, OUTLINE);
      for (let i = 0; i < 12; i++) rect(ctx, fx + 2 + i, fy + 1 + i, 1, 1, OUTLINE);
    }
  }
}

const SHOP_TYPES = [marqueeShop, martShop, arcadeShop, bobaShop, pharmacy];

function makeShops(phase) {
  const rand = sceneryRandom(5150);
  const W = 1600;
  const [canvas, ctx] = makeCanvas(W, SHOP_H);
  let x = 4;
  let last = -1;
  while (x < W - 90) {
    const w = Math.min(W - 4 - x, 84 + 4 * Math.floor(rand() * 10));
    if (w < 80) break;
    let type = Math.floor(rand() * SHOP_TYPES.length);
    if (type === last) type = (type + 1) % SHOP_TYPES.length;
    last = type;
    SHOP_TYPES[type](ctx, x, w, 70 + Math.floor(rand() * 40), rand, phase);
    x += w;
    if (rand() < 0.35) {
      // Narrow gap with steam from a vent
      rect(ctx, x, SHOP_H - 60, 6, 60, '#18122a');
      dither(ctx, x, SHOP_H - 70, 6, 12, '#4a4270');
      x += 6;
    }
  }
  return canvas;
}

// ---------- Wet pavement and road ----------

const BAND_TOP = 222;

function makeGround(rand) {
  const W = 960;
  const H = HEIGHT - BAND_TOP;
  const [canvas, ctx] = makeCanvas(W, H);
  rect(ctx, 0, 0, W, 1, OUTLINE);
  rect(ctx, 0, 1, W, 20, C.pave);
  rect(ctx, 0, 1, W, 1, C.paveLight);
  // Big square slabs
  for (let x = 0; x < W; x += 20) rect(ctx, x, 2, 1, 19, C.paveSeam);
  rect(ctx, 0, 11, W, 1, C.paveSeam);
  for (let i = 0; i < 180; i++) rect(ctx, Math.floor(rand() * W), 2 + Math.floor(rand() * 18), 1, 1, C.paveSpeck);
  // Neon reflections on the wet slabs
  for (let i = 0; i < 26; i++) {
    const [neon] = NEONS[Math.floor(rand() * NEONS.length)];
    const x = Math.floor(rand() * (W - 20));
    const y = 3 + Math.floor(rand() * 15);
    const w = 6 + Math.floor(rand() * 12);
    for (let j = 0; j < w; j += 2) rect(ctx, x + j, y, 1, 1, mixHex(C.pave, neon, 0.45));
    rect(ctx, x + 2, y + 1, Math.max(1, w - 6), 1, mixHex(C.pave, neon, 0.3));
  }
  // Curb
  rect(ctx, 0, 21, W, 1, C.curbLight);
  rect(ctx, 0, 22, W, 3, C.curb);
  rect(ctx, 0, 24, W, 1, C.curbShade);
  rect(ctx, 0, 25, W, 1, OUTLINE);
  // Road: specks, a solid yellow line, dashed white line, glossy streaks
  rect(ctx, 0, 26, W, H - 26, C.road);
  for (let i = 0; i < 300; i++) rect(ctx, Math.floor(rand() * W), 27 + Math.floor(rand() * (H - 28)), 2, 1, C.roadSpeck);
  rect(ctx, 0, 30, W, 1, '#c9a43a');
  for (let x = 6; x < W; x += 40) rect(ctx, x, 40, 18, 2, C.roadLine);
  for (let i = 0; i < 18; i++) {
    const [neon] = NEONS[Math.floor(rand() * NEONS.length)];
    const x = Math.floor(rand() * (W - 4));
    for (let y = 32; y < H - 1; y += 2) if (rand() < 0.7) rect(ctx, x + (y % 4 ? 1 : 0), y, 1, 1, mixHex(C.road, neon, 0.35));
  }
  return canvas;
}

// ---------- Street lamps (full speed) ----------

function streetLamp(ctx, x) {
  rect(ctx, x, 104, 3, 120, OUTLINE);
  rect(ctx, x + 1, 105, 1, 118, '#5a5486');
  rect(ctx, x - 2, 214, 7, 10, OUTLINE);
  rect(ctx, x - 1, 215, 5, 8, '#3d3866');
  rect(ctx, x - 1, 215, 5, 1, '#5a5486');
  // Long arm reaching over the road, LED head
  rect(ctx, x, 102, 22, 3, OUTLINE);
  rect(ctx, x + 1, 103, 20, 1, '#5a5486');
  rect(ctx, x + 14, 101, 14, 4, OUTLINE);
  rect(ctx, x + 15, 104, 12, 2, C.lamp);
  dither(ctx, x + 13, 106, 16, 3, C.lampGlow);
  // A street name sign half way up
  rect(ctx, x - 9, 150, 20, 7, OUTLINE);
  rect(ctx, x - 8, 151, 18, 5, '#2f8f5a');
  rect(ctx, x - 7, 153, 4, 1, '#e8fff2');
  rect(ctx, x - 2, 153, 9, 1, '#e8fff2');
}

function makeFurniture(rand) {
  const W = 1440;
  const [canvas, ctx] = makeCanvas(W, HEIGHT);
  for (let x = 90; x < W - 60; x += 220 + Math.floor(rand() * 3) * 40) streetLamp(ctx, x);
  return canvas;
}

// ---------- The junction (a side street crossing the pavement) ----------

const J_LEFT = 8; // the junction picture starts this far left of the obstacle box
const J_TOP = 120;
const J_W = 56;

function makeJunction() {
  const rand = sceneryRandom(77);
  const w = J_W + J_LEFT * 2;
  const [canvas, ctx] = makeCanvas(w, HEIGHT - J_TOP);
  const L = J_LEFT; // left edge of the street
  const R = J_LEFT + J_W; // right edge
  const Y = (gy) => gy - J_TOP; // game y to picture y
  const horizon = 184;

  // The side street disappearing into the distance between two building corners
  rect(ctx, L + 2, Y(128), J_W - 4, BAND_TOP - 128, '#140e2c');
  for (let i = 0; i < 7; i++) dither(ctx, L + 2, Y(130 + i * 8), J_W - 4, 1, '#1e1642');
  // Far buildings at the end of the street, a few tiny windows
  for (let bx = L + 4; bx < R - 6; bx += 7) {
    const bh = 14 + Math.floor(rand() * 22);
    rect(ctx, bx, Y(horizon - bh), 6, bh, '#251c4c');
    rect(ctx, bx, Y(horizon - bh), 6, 1, '#33296a');
    for (let wy = horizon - bh + 3; wy < horizon - 2; wy += 4) if (rand() < 0.35) rect(ctx, bx + 1 + Math.floor(rand() * 4), Y(wy), 1, 1, rand() < 0.5 ? '#ffd166' : '#7fe7ff');
  }
  // Glow at the end of the street
  dither(ctx, L + 14, Y(horizon - 3), J_W - 28, 3, '#a3487e');
  // Building walls along the street, getting closer as they come down
  for (let gy = horizon; gy < BAND_TOP; gy++) {
    const t = (gy - horizon) / (BAND_TOP - horizon);
    const half = Math.round(3 + t * (J_W / 2 - 6));
    const mid = L + J_W / 2;
    const sidewalk = Math.round(1 + t * 5);
    rect(ctx, L + 2, Y(gy), J_W - 4, 1, '#1d1640');
    // Lit windows on the walls, in rows that spread apart
    if (gy % 5 === 0) {
      for (const side of [-1, 1]) {
        const edge = mid + side * (half + sidewalk);
        const reach = Math.round(J_W / 2 - 2 - half - sidewalk);
        for (let k = 2; k < reach; k += 4) if (rand() < 0.4) rect(ctx, edge + side * k, Y(gy) - 1, 1, 2, rand() < 0.6 ? '#ffd166' : '#7fe7ff');
      }
    }
    rect(ctx, mid - half - sidewalk, Y(gy), sidewalk, 1, '#4a4570');
    rect(ctx, mid + half, Y(gy), sidewalk, 1, '#4a4570');
    rect(ctx, mid - half, Y(gy), half * 2, 1, C.road);
    if (Math.floor(gy / 3) % 2 === 0) rect(ctx, mid - (t > 0.5 ? 1 : 0), Y(gy), t > 0.5 ? 2 : 1, 1, '#c9a43a');
  }
  // A sign gantry across the top of the street
  rect(ctx, L - 2, Y(124), J_W + 4, 5, OUTLINE);
  rect(ctx, L - 1, Y(125), J_W + 2, 1, '#5a5486');
  rect(ctx, L - 1, Y(127), J_W + 2, 1, '#3d3866');
  rect(ctx, L + 16, Y(129), J_W - 32, 9, OUTLINE);
  rect(ctx, L + 17, Y(130), J_W - 34, 7, '#2f8f5a');
  rect(ctx, L + 17, Y(130), J_W - 34, 1, '#4fbf80');
  rect(ctx, L + 20, Y(133), 4, 1, '#e8fff2');
  rect(ctx, L + 26, Y(133), J_W - 46, 1, '#e8fff2');
  rect(ctx, L + J_W - 23, Y(132), 2, 3, '#e8fff2');
  // Building corners framing the street (dark brick with a street sign)
  for (const cx of [L - 2, R - 2]) {
    rect(ctx, cx, Y(122), 5, BAND_TOP - 122, OUTLINE);
    rect(ctx, cx + 1, Y(123), 3, BAND_TOP - 124, '#3a2f5a');
    for (let by = 130; by < BAND_TOP; by += 4) rect(ctx, cx + 1, Y(by), 3, 1, '#2a2148');
  }
  rect(ctx, R + 2, Y(160), 16, 7, OUTLINE);
  rect(ctx, R + 3, Y(161), 14, 5, '#2f8f5a');
  rect(ctx, R + 4, Y(163), 3, 1, '#e8fff2');
  rect(ctx, R + 8, Y(163), 7, 1, '#e8fff2');

  // The pavement crossing: asphalt with zebra stripes (they run along the side street)
  const pTop = Y(BAND_TOP);
  rect(ctx, L, pTop, J_W, 1, OUTLINE);
  rect(ctx, L, pTop + 1, J_W, 25, C.road);
  for (let i = 0; i < 90; i++) rect(ctx, L + Math.floor(rand() * J_W), pTop + 1 + Math.floor(rand() * 24), 1, 1, C.roadSpeck);
  for (let sx = L + 3; sx < R - 3; sx += 8) {
    rect(ctx, sx, pTop + 2, 5, 22, C.zebra);
    rect(ctx, sx, pTop + 23, 5, 1, C.zebraShade);
    rect(ctx, sx + 4, pTop + 2, 1, 21, C.zebraShade);
    // worn paint
    rect(ctx, sx + 1 + Math.floor(rand() * 3), pTop + 4 + Math.floor(rand() * 16), 1, 1, '#9a93b8');
  }
  // Dropped curbs with yellow bumpy tactile paving each side
  for (const tx of [L - 7, R + 1]) {
    rect(ctx, tx, pTop + 1, 6, 20, C.tactile);
    for (let ty = pTop + 2; ty < pTop + 20; ty += 2) for (let i = (ty / 2) % 2; i < 6; i += 2) rect(ctx, tx + i, ty, 1, 1, C.tactileShade);
    rect(ctx, tx, pTop + 1, 6, 1, '#fff0a0');
  }
  rect(ctx, L, pTop + 1, 1, 24, OUTLINE);
  rect(ctx, R - 1, pTop + 1, 1, 24, OUTLINE);
  // The curb is cut away here, then the stripes carry on across the main road
  rect(ctx, L, pTop + 25, J_W, 1, '#1d1a2a');
  for (let sx = L + 3; sx < R - 3; sx += 8) {
    rect(ctx, sx, pTop + 28, 5, HEIGHT - BAND_TOP - 28, C.zebra);
    rect(ctx, sx + 4, pTop + 28, 1, HEIGHT - BAND_TOP - 28, C.zebraShade);
  }
  return canvas;
}

// The traffic light head and walk signal, drawn every frame
function trafficLight(ctx, px, state, time) {
  // Pole
  rect(ctx, px, 132, 3, 92, OUTLINE);
  rect(ctx, px + 1, 133, 1, 90, '#5a5486');
  rect(ctx, px - 2, 216, 7, 8, OUTLINE);
  rect(ctx, px - 1, 217, 5, 6, '#3d3866');
  // Signal head
  const hx = px - 5;
  const hy = 126;
  rect(ctx, hx, hy, 13, 31, OUTLINE);
  rect(ctx, hx + 1, hy + 1, 11, 29, '#221c36');
  rect(ctx, hx + 1, hy + 1, 11, 1, '#3a3352');
  const lamps = [
    ['red', '#ff3b4e', '#ff9aa4', '#4a2230'],
    ['amber', '#ffb020', '#ffe08a', '#4a3a20'],
    ['green', '#33e07a', '#a8ffc8', '#1f4030'],
  ];
  lamps.forEach(([name, on, shine, off], i) => {
    const cy = hy + 6 + i * 9;
    const lit = state === name;
    rect(ctx, hx - 1, cy - 4, 15, 1, OUTLINE); // visor
    if (lit) dither(ctx, hx - 4, cy - 5, 21, 11, on);
    circle(ctx, hx + 6, cy, 3, lit ? on : off);
    if (lit) {
      rect(ctx, hx + 5, cy - 2, 2, 1, shine);
      rect(ctx, hx + 4, cy - 1, 1, 1, shine);
    }
  });
  // Walk signal: red hand or green walker
  const wy = 168;
  rect(ctx, px - 4, wy, 11, 12, OUTLINE);
  rect(ctx, px - 3, wy + 1, 9, 10, '#141022');
  if (state === 'green') {
    const step = Math.floor(time * 4) % 2;
    const g = '#5fffa0';
    rect(ctx, px, wy + 2, 2, 2, g);
    rect(ctx, px, wy + 4, 2, 4, g);
    rect(ctx, px - 1, wy + 5, 1, 2, g);
    rect(ctx, px + 2, wy + 5, 1, 2, g);
    rect(ctx, px - 1 + step, wy + 8, 1, 2, g);
    rect(ctx, px + 2 - step, wy + 8, 1, 2, g);
  } else {
    const r = '#ff5a5a';
    rect(ctx, px - 1, wy + 3, 1, 4, r);
    rect(ctx, px, wy + 2, 1, 5, r);
    rect(ctx, px + 1, wy + 2, 1, 5, r);
    rect(ctx, px + 2, wy + 3, 1, 4, r);
    rect(ctx, px - 1, wy + 7, 4, 2, r);
    rect(ctx, px + 3, wy + 5, 1, 2, r);
  }
}

// ---------- The crossing car, seen head-on ----------

const PAINTS = [
  { body: '#3fb8aa', light: '#7fe0d4', shade: '#2a7f78' }, // teal
  { body: '#e0474c', light: '#ff8a80', shade: '#a3303d' }, // red
  { body: '#ffc94a', light: '#ffe39a', shade: '#c9932a', taxi: true }, // taxi
  { body: '#7b6cff', light: '#a99cff', shade: '#5446c4' }, // purple
];
const CAR_SIZES = [16, 20, 24, 28, 32, 36, 40, 44, 48, 52];
const PAD = 5; // room around the car for the headlight glow

function makeCarFront(W, paint) {
  const H = Math.round(W * 0.74);
  const [canvas, ctx] = makeCanvas(W + PAD * 2, H + PAD * 2 + 2);
  const ox = PAD;
  const oy = PAD;
  const s = W / 44; // detail scale
  const cabinH = Math.round(H * 0.42);
  const bodyTop = oy + cabinH;
  const bodyH = H - cabinH - Math.max(2, Math.round(3 * s));

  // Headlight glow (drawn first, so it peeks out around the car)
  const lightW = Math.max(2, Math.round(8 * s));
  const lightH = Math.max(1, Math.round(4 * s));
  const lightY = bodyTop + Math.max(1, Math.round(3 * s));
  for (const lx of [ox + Math.round(2 * s), ox + W - Math.round(2 * s) - lightW]) {
    dither(ctx, lx - 4, lightY - 3, lightW + 8, lightH + 6, '#fff1b0');
    dither(ctx, lx - 2, lightY - 1, lightW + 4, lightH + 2, '#fff8d8');
  }

  // Wheels peeking out under the body
  const wheelW = Math.max(3, Math.round(7 * s));
  const wheelH = Math.max(2, Math.round(4 * s));
  const wheelY = oy + H - wheelH;
  rect(ctx, ox + Math.round(3 * s), wheelY, wheelW, wheelH, OUTLINE);
  rect(ctx, ox + W - Math.round(3 * s) - wheelW, wheelY, wheelW, wheelH, OUTLINE);

  // Cabin: a trapezoid, narrow roof widening down to the body
  for (let r = 0; r <= cabinH; r++) {
    const t = r / cabinH;
    const inset = Math.round((1 - t) * 8 * s + 2 * s);
    const left = ox + inset;
    const right = ox + W - inset;
    rect(ctx, left, oy + r, right - left, 1, OUTLINE);
    if (r > 0) {
      const glass = r > Math.max(1, Math.round(1.5 * s)) && r < cabinH - 1;
      rect(ctx, left + 1, oy + r, right - left - 2, 1, glass ? '#2a3a5a' : paint.body);
      if (glass) {
        // Sunset-pink reflection streak across the windscreen
        const band = r / cabinH;
        if (band > 0.35 && band < 0.55) rect(ctx, left + 2, oy + r, Math.max(1, Math.round((right - left) * 0.45)), 1, '#c46aa0');
        rect(ctx, left + 1, oy + r, 1, 1, paint.light);
        rect(ctx, right - 2, oy + r, 1, 1, paint.shade);
      }
    }
  }
  rect(ctx, ox + Math.round(10 * s), oy + 1, Math.max(1, W - Math.round(20 * s)), 1, paint.light);
  // Little mirrors
  const mirrorY = bodyTop - Math.max(2, Math.round(3 * s));
  rect(ctx, ox - 1, mirrorY, Math.max(2, Math.round(3 * s)), Math.max(2, Math.round(2 * s)), OUTLINE);
  rect(ctx, ox + W - Math.max(2, Math.round(3 * s)) + 1, mirrorY, Math.max(2, Math.round(3 * s)), Math.max(2, Math.round(2 * s)), OUTLINE);

  // Body
  rect(ctx, ox, bodyTop, W, bodyH, OUTLINE);
  rect(ctx, ox + 1, bodyTop + 1, W - 2, bodyH - 2, paint.body);
  rect(ctx, ox + 1, bodyTop + 1, W - 2, 1, paint.light);
  rect(ctx, ox + 1, bodyTop + bodyH - 2, W - 2, 1, paint.shade);
  if (paint.taxi && W >= 24) {
    // Checker stripe
    for (let cx = ox + 1, i = 0; cx < ox + W - 1; cx += 2, i++) rect(ctx, cx, bodyTop + bodyH - 3 - (i % 2), 2, 1, i % 2 ? OUTLINE : '#ffffff');
  }

  // Headlights
  for (const lx of [ox + Math.round(2 * s), ox + W - Math.round(2 * s) - lightW]) {
    rect(ctx, lx - 1, lightY - 1, lightW + 2, lightH + 2, OUTLINE);
    rect(ctx, lx, lightY, lightW, lightH, '#fff6c8');
    rect(ctx, lx + 1, lightY, Math.max(1, lightW - 2), Math.max(1, lightH - 1), '#ffffff');
  }
  // Grille between the lights, number plate under it
  const gx = ox + Math.round(13 * s);
  const gw = W - Math.round(26 * s);
  if (gw >= 3) {
    rect(ctx, gx, lightY, gw, lightH + 1, OUTLINE);
    for (let i = 1; i < lightH + 1; i += 2) rect(ctx, gx + 1, lightY + i, gw - 2, 1, '#4a4466');
    const pw = Math.max(4, Math.round(12 * s));
    const ph = Math.max(2, Math.round(4 * s));
    const py = lightY + lightH + Math.max(1, Math.round(2 * s));
    if (py + ph < bodyTop + bodyH) {
      rect(ctx, ox + Math.round((W - pw) / 2), py, pw, ph, OUTLINE);
      rect(ctx, ox + Math.round((W - pw) / 2) + 1, py + 1, pw - 2, ph - 2, '#f4f0dc');
      if (pw >= 8) rect(ctx, ox + Math.round((W - pw) / 2) + 2, py + Math.floor(ph / 2), pw - 4, 1, '#5a5470');
    }
  }
  // Bumper
  rect(ctx, ox + 1, bodyTop + bodyH, W - 2, Math.max(1, Math.round(2 * s)), '#5e5580');
  rect(ctx, ox + 1, bodyTop + bodyH + Math.max(1, Math.round(2 * s)) - 1, W - 2, 1, OUTLINE);

  // Taxi roof sign
  if (paint.taxi) {
    const tw = Math.max(4, Math.round(14 * s));
    const th = Math.max(2, Math.round(4 * s));
    const tx = ox + Math.round((W - tw) / 2);
    rect(ctx, tx, oy - th + 1, tw, th, OUTLINE);
    rect(ctx, tx + 1, oy - th + 2, tw - 2, th - 2 || 1, '#fff2b0');
    if (tw >= 10) rect(ctx, tx + 3, oy - th + 2 + Math.floor((th - 2) / 2), tw - 6, 1, '#c9932a');
  }
  return { canvas, W, H };
}

// ---------- Putting it all together ----------

export function createCrosswalk() {
  const rand = sceneryRandom(20261031);
  const layers = {
    sky: makeSky(rand),
    clouds: makeClouds(rand),
    far: makeFar(rand),
    mid: makeMid(rand),
    shopsA: makeShops(0),
    shopsB: makeShops(1),
    ground: makeGround(rand),
    furniture: makeFurniture(rand),
  };
  const junction = makeJunction();
  const cars = PAINTS.map((paint) => CAR_SIZES.map((w) => makeCarFront(w, paint)));

  function lightState(a, time) {
    if (a === -999 || a > 1.05) return 'green';
    if (a >= -0.8) return 'red';
    if (a >= -1.3) return Math.floor(time * 6) % 2 === 0 ? 'amber' : 'off';
    return 'green';
  }

  // Where the car is for a given progress: its bottom edge and its size
  function carPlace(a) {
    if (a < -0.8 || a > 1.8) return null;
    let bottom;
    let size;
    if (a < 0) {
      const t = (a + 0.8) / 0.8; // 0 at the back of the street, 1 at the pavement
      bottom = 188 + Math.round(t * t * 42);
      size = 16 + t * 28;
    } else {
      bottom = 230 + Math.round(a * 32);
      size = 44 + Math.min(1, a / 1.8) * 8;
    }
    const i = Math.max(0, Math.min(CAR_SIZES.length - 1, Math.round((size - 16) / 4)));
    return { bottom, i };
  }

  function drawCar(ctx, o, front) {
    if (o.a === -999) return;
    const place = carPlace(o.a);
    if (!place) {
      // Two tiny headlights at the end of the street, just before it appears
      if (o.a >= -1.3 && o.a < -0.8) {
        const cx = o.x + J_W / 2;
        rect(ctx, cx - 3, 184, 1, 1, '#fff6c8');
        rect(ctx, cx + 2, 184, 1, 1, '#fff6c8');
      }
      return;
    }
    const isFront = place.bottom > 234;
    if (isFront !== front) return;
    const car = cars[o.b % 4][place.i];
    const cx = o.x + Math.floor(J_W / 2);
    const left = cx - Math.floor(car.W / 2) - PAD;
    const top = place.bottom - car.H - PAD;
    // Headlight beams light up the crossing in front of the car
    const beamTop = place.bottom + 1;
    const beamBottom = Math.min(HEIGHT, place.bottom + 12);
    for (let y = beamTop; y < beamBottom; y++) {
      const spread = Math.round((y - beamTop) * 0.7);
      const x0 = cx - Math.floor(car.W / 2) - spread;
      const w = car.W + spread * 2;
      const near = y - beamTop < 3;
      for (let x = x0; x < x0 + w; x++) if ((x + y * (near ? 1 : 2)) % (near ? 2 : 4) === 0) rect(ctx, x, y, 1, 1, '#fff1b0');
    }
    ctx.drawImage(car.canvas, left, top);
  }

  return {
    drawBack(ctx, scroll, time) {
      ctx.drawImage(layers.sky, 0, 0);
      drawStrip(ctx, layers.clouds, scroll * 0.04 + time * 2, 0);
      drawStrip(ctx, layers.far, scroll * 0.1, 214 - layers.far.height);
      drawStrip(ctx, layers.mid, scroll * 0.25, 220 - layers.mid.height);
      // The neon flickers between two versions of the shops now and then
      const flick = Math.floor(time * 2.5) % 2;
      drawStrip(ctx, flick ? layers.shopsB : layers.shopsA, scroll * 0.55, BAND_TOP - SHOP_H);
      drawStrip(ctx, layers.ground, scroll, BAND_TOP);
      drawStrip(ctx, layers.furniture, scroll, 0);
    },

    drawObstacle(ctx, o, time) {
      if (o.kind !== KIND.JUNCTION) return;
      ctx.drawImage(junction, o.x - J_LEFT, J_TOP);
      trafficLight(ctx, o.x - 5, lightState(o.a, time), time);
      drawCar(ctx, o, false);
    },

    // Once the car is past the boy's lane it's in front of him
    drawObstacleFront(ctx, o) {
      if (o.kind !== KIND.JUNCTION) return;
      drawCar(ctx, o, true);
    },
  };
}
