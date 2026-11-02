// zones/market.js: Market Street, drawn in code as pixel art.
//
// A warm evening street market under a blue-hour sky: old brick buildings
// with washing lines, a row of stalls with striped awnings and fruit piles,
// twinkling string lights, and cobblestones. The boy DASHES and smashes
// through crates, fruit carts, parked bikes and pigeons.
//
// Layers (slow to fast): sky + moon (still) > old-town rooftops > brick
// buildings > market stalls with string lights > cobbles (full speed).
// Each layer is drawn ONCE into a long strip; every frame we copy them.
import { WIDTH, HEIGHT, KIND } from '../../world.js';
import { mixHex } from '../palette.js';
import { makeCanvas, rect, box, circle, dither, pixelText, sceneryRandom, OUTLINE } from '../pixel.js';
import { drawStrip } from '../strip.js';

// ---------- Colours of the market at blue hour ----------

const C = {
  sky: ['#141d3f', '#1f2d5c', '#2f3f7c', '#4a5394', '#7a64a4', '#b677a0', '#e8938a', '#ffbf86'],
  moon: '#f4ead0',
  moonShade: '#d8c9a6',
  star: '#c9d0ff',
  far: '#2c3666',
  farLight: '#3b4880',
  farWindow: '#e8a85c',
  brick: '#7a4038',
  brickLight: '#93543f',
  brickShade: '#5e2f2b',
  mortar: '#663530',
  plaster: '#c9a57e',
  plasterLight: '#e0bf96',
  plasterShade: '#a2805f',
  window: '#ffcf73',
  windowLight: '#fff0b5',
  windowOff: '#2a2340',
  shutter: '#3f8f6a',
  shutterLight: '#5fb38a',
  wood: '#a86a3c',
  woodLight: '#c98a4b',
  woodShade: '#7a4a28',
  woodDark: '#5e3a22',
  bulb: '#ffd98a',
  bulbHot: '#fff6d0',
  wire: '#1a1626',
  cobble: '#7d6d86',
  cobbleLight: '#998aa3',
  cobbleShade: '#5e5068',
  mortarDark: '#3d3350',
  // fruit
  orange: '#ff8a3d',
  orangeLight: '#ffc07a',
  orangeShade: '#d4612b',
  apple: '#e0474c',
  appleLight: '#ff8a80',
  appleShade: '#a3303d',
  lemon: '#ffd23f',
  lemonLight: '#fff09a',
  lemonShade: '#d9a520',
  grape: '#8a5ad0',
  grapeLight: '#b48af0',
  leaf: '#4f9a55',
  leafLight: '#7cc47a',
  melon: '#3f8f5a',
  melonLight: '#6fbf7f',
};

const AWNINGS = [
  ['#e0474c', '#fff1e6'],
  ['#3f9a6a', '#f4f0d8'],
  ['#ffb347', '#fff6e0'],
  ['#3f7fd0', '#eef4ff'],
  ['#c95f8f', '#fff0f6'],
];

const SKY_BOTTOM = 212;

// ---------- Sky: deep blue fading to a warm glow, a moon and stars ----------

function makeSky() {
  const [canvas, ctx] = makeCanvas(WIDTH, HEIGHT);
  const stops = C.sky;
  const bands = 14;
  const bandHeight = SKY_BOTTOM / bands;
  const colors = [];
  for (let i = 0; i < bands; i++) {
    const t = (i / (bands - 1)) * (stops.length - 1);
    const a = Math.floor(t);
    colors.push(mixHex(stops[a], stops[Math.min(stops.length - 1, a + 1)], t - a));
  }
  colors.forEach((c, i) => rect(ctx, 0, Math.floor(i * bandHeight), WIDTH, Math.ceil(bandHeight) + 1, c));
  rect(ctx, 0, SKY_BOTTOM, WIDTH, HEIGHT - SKY_BOTTOM, colors[bands - 1]);
  for (let i = 1; i < bands; i++) dither(ctx, 0, Math.floor(i * bandHeight) - 1, WIDTH, 2, colors[i]);

  const rand = sceneryRandom(9090);
  for (let i = 0; i < 60; i++) {
    const y = Math.floor(rand() * 110);
    rect(ctx, Math.floor(rand() * WIDTH), y, 1, 1, i % 4 ? '#6f7cc0' : C.star);
  }
  // A few bigger twinkly stars
  for (const [sx, sy] of [
    [60, 22],
    [210, 14],
    [338, 40],
    [440, 18],
  ]) {
    rect(ctx, sx, sy - 1, 1, 3, C.star);
    rect(ctx, sx - 1, sy, 3, 1, C.star);
  }

  // A crescent moon
  circle(ctx, 120, 64, 13, C.moonShade);
  circle(ctx, 120, 64, 12, C.moon);
  circle(ctx, 126, 59, 11, colors[Math.floor(59 / bandHeight)]);
  rect(ctx, 110, 60, 1, 4, '#ffffff');
  return canvas;
}

// ---------- Far: old-town roofs, chimneys and a clock tower ----------

function makeFar(rand) {
  const W = 960;
  const H = 130;
  const [canvas, ctx] = makeCanvas(W, H);
  let x = 0;
  let tower = 180;
  while (x < W) {
    const w = Math.min(W - x, 24 + Math.floor(rand() * 26));
    const h = 36 + Math.floor(rand() * 40);
    const top = H - h;
    rect(ctx, x, top, w, h, C.far);
    // Pitched roof
    const peak = 6 + Math.floor(rand() * 8);
    for (let i = 0; i < peak; i++) rect(ctx, x + i, top - peak + i, w - i * 2, 1, C.far);
    for (let i = 0; i < peak; i++) rect(ctx, x + i, top - peak + i, 1, 1, C.farLight);
    // Chimneys with a wisp of smoke
    if (rand() < 0.55) {
      const cx = x + 3 + Math.floor(rand() * (w - 8));
      rect(ctx, cx, top - peak - 4, 4, peak + 4, C.far);
      rect(ctx, cx - 1, top - peak - 5, 6, 1, C.farLight);
    }
    for (let wy = top + 4; wy < H - 3; wy += 7) {
      for (let wx = x + 3; wx < x + w - 3; wx += 5) {
        if (rand() < 0.16) rect(ctx, wx, wy, 2, 3, C.farWindow);
      }
    }
    x += w;
    if (x > tower && tower < W - 40) {
      // A clock tower with a glowing face
      const tx = x;
      const th = 104;
      rect(ctx, tx, H - th, 18, th, C.far);
      rect(ctx, tx, H - th, 18, 1, C.farLight);
      for (let i = 0; i < 12; i++) rect(ctx, tx + i * 0.75, H - th - 12 + i, 18 - i * 1.5, 1, C.far);
      rect(ctx, tx + 8, H - th - 20, 2, 9, C.far);
      circle(ctx, tx + 9, H - th + 14, 6, '#1a1626');
      circle(ctx, tx + 9, H - th + 14, 5, '#ffe9a8');
      rect(ctx, tx + 9, H - th + 10, 1, 4, '#1a1626');
      rect(ctx, tx + 9, H - th + 14, 3, 1, '#1a1626');
      for (let wy = H - th + 26; wy < H - 6; wy += 12) rect(ctx, tx + 7, wy, 4, 6, C.farWindow);
      x += 20;
      tower += 520;
    }
  }
  return canvas;
}

// ---------- Mid: old brick and plaster buildings, washing lines ----------

const MID_H = 176;

function oldBuilding(ctx, x, w, h, rand) {
  const top = MID_H - h;
  const plaster = rand() < 0.4;
  const fill = plaster ? C.plaster : C.brick;
  const light = plaster ? C.plasterLight : C.brickLight;
  const shade = plaster ? C.plasterShade : C.brickShade;
  box(ctx, x, top, w, h + 1, { fill, light, shade });
  if (!plaster) {
    // Brick courses with staggered joints
    for (let y = top + 5; y < MID_H; y += 3) {
      rect(ctx, x + 1, y, w - 2, 1, C.mortar);
      for (let bx = x + 2 + ((y / 3) % 2) * 3; bx < x + w - 2; bx += 6) rect(ctx, bx, y - 2, 1, 2, C.mortar);
    }
  } else {
    // Old plaster with patches
    for (let i = 0; i < w / 6; i++) {
      rect(ctx, x + 2 + Math.floor(rand() * (w - 8)), top + 4 + Math.floor(rand() * (h - 10)), 3 + Math.floor(rand() * 4), 2, shade);
    }
  }
  // Cornice and a tiled roof edge
  rect(ctx, x - 2, top - 3, w + 4, 4, OUTLINE);
  rect(ctx, x - 1, top - 2, w + 2, 2, '#8a3f3a');
  rect(ctx, x - 1, top - 2, w + 2, 1, '#b8574c');
  // Arched windows with shutters, floor by floor
  for (let wy = top + 8; wy < MID_H - 24; wy += 22) {
    for (let wx = x + 6; wx < x + w - 12; wx += 15) {
      const lit = rand() < 0.55;
      rect(ctx, wx, wy + 2, 8, 12, OUTLINE);
      rect(ctx, wx + 1, wy + 1, 6, 1, OUTLINE);
      rect(ctx, wx + 1, wy + 2, 6, 11, lit ? C.window : C.windowOff);
      rect(ctx, wx + 2, wy + 2, 4, 1, lit ? C.windowLight : '#3a3352');
      rect(ctx, wx + 1, wy + 7, 6, 1, OUTLINE);
      rect(ctx, wx + 4, wy + 2, 1, 11, OUTLINE);
      if (rand() < 0.7) {
        // Green shutters on both sides
        rect(ctx, wx - 3, wy + 2, 3, 12, C.shutter);
        rect(ctx, wx + 8, wy + 2, 3, 12, C.shutter);
        for (let sy = wy + 3; sy < wy + 14; sy += 2) {
          rect(ctx, wx - 3, sy, 3, 1, C.shutterLight);
          rect(ctx, wx + 8, sy, 3, 1, C.shutterLight);
        }
      }
      // Sill, sometimes with a flower box
      rect(ctx, wx - 1, wy + 14, 10, 2, '#d9cbb6');
      if (rand() < 0.35) {
        rect(ctx, wx - 1, wy + 12, 10, 2, C.leaf);
        for (let fx = wx; fx < wx + 9; fx += 2) rect(ctx, fx, wy + 11, 1, 1, ['#ff6b8b', '#ffd23f', '#ffffff'][fx % 3]);
      }
    }
    // A little iron balcony now and then
    if (rand() < 0.3 && w > 40) {
      const bx = x + 4;
      rect(ctx, bx, wy + 16, w - 8, 1, OUTLINE);
      for (let i = bx; i < x + w - 4; i += 2) rect(ctx, i, wy + 16, 1, 5, OUTLINE);
      rect(ctx, bx, wy + 21, w - 8, 1, OUTLINE);
    }
  }
  // A glowing wall lamp near the ground
  if (rand() < 0.6) {
    const lx = x + Math.floor(w / 2);
    rect(ctx, lx, MID_H - 34, 1, 3, OUTLINE);
    rect(ctx, lx - 2, MID_H - 31, 5, 5, OUTLINE);
    rect(ctx, lx - 1, MID_H - 30, 3, 3, C.bulb);
    dither(ctx, lx - 6, MID_H - 34, 13, 11, '#ffd98a55');
  }
}

function washingLine(ctx, x1, x2, y, rand) {
  // A sagging rope with clothes pegged on it
  const span = x2 - x1;
  for (let i = 0; i <= span; i++) {
    const sag = Math.round(Math.sin((i / span) * Math.PI) * 6);
    rect(ctx, x1 + i, y + sag, 1, 1, '#d9cbb6');
  }
  const colors = ['#ff6b6b', '#3fd6c8', '#ffd23f', '#ffffff', '#7b6cff', '#ff9fd0'];
  for (let i = 6; i < span - 6; i += 9 + Math.floor(rand() * 6)) {
    const sag = Math.round(Math.sin((i / span) * Math.PI) * 6);
    const c = colors[Math.floor(rand() * colors.length)];
    const shirt = rand() < 0.5;
    if (shirt) {
      rect(ctx, x1 + i - 1, y + sag + 1, 8, 3, c);
      rect(ctx, x1 + i + 1, y + sag + 4, 4, 5, c);
      rect(ctx, x1 + i - 1, y + sag + 1, 8, 1, '#ffffff99');
    } else {
      rect(ctx, x1 + i, y + sag + 1, 5, 7, c);
      rect(ctx, x1 + i + 2, y + sag + 5, 1, 3, OUTLINE);
    }
  }
}

function makeMid(rand) {
  const W = 1440;
  const [canvas, ctx] = makeCanvas(W, MID_H);
  let x = 0;
  const tops = [];
  while (x < W - 30) {
    const w = Math.min(W - x, 2 * (22 + Math.floor(rand() * 18)));
    if (w < 30) break;
    const h = 96 + Math.floor(rand() * 64);
    oldBuilding(ctx, x, w, h, rand);
    tops.push([x, w, MID_H - h]);
    x += w + (rand() < 0.4 ? 14 + Math.floor(rand() * 10) : 0);
  }
  // Washing lines strung across the gaps between buildings
  for (let i = 0; i + 1 < tops.length; i++) {
    const [ax, aw, at] = tops[i];
    const [bx, , bt] = tops[i + 1];
    if (rand() < 0.5) {
      const y = Math.max(at, bt) + 20 + Math.floor(rand() * 20);
      washingLine(ctx, ax + aw - 10, bx + 10, y, rand);
    }
  }
  return canvas;
}

// ---------- Near: the row of market stalls, with string lights ----------

const NEAR_H = 124;
const BASE = NEAR_H; // stalls stand on the bottom of the strip

function fruitPile(ctx, x, y, w, kind) {
  // A mound of round fruit sitting in a tray, top at y
  const look = {
    orange: [C.orange, C.orangeLight, C.orangeShade],
    apple: [C.apple, C.appleLight, C.appleShade],
    lemon: [C.lemon, C.lemonLight, C.lemonShade],
    grape: [C.grape, C.grapeLight, '#5e3a9a'],
    melon: [C.melon, C.melonLight, '#2c6b42'],
  }[kind];
  const r = kind === 'melon' ? 3 : 2;
  const step = r * 2;
  for (let row = 0; row < 3; row++) {
    for (let fx = x + r + (row % 2) * r; fx < x + w - r; fx += step + 1) {
      const fy = y + 8 - row * (step - 1);
      if (row > 0 && (fx < x + r * 2 * row || fx > x + w - r * 2 * row)) continue;
      circle(ctx, fx, fy, r, look[2]);
      circle(ctx, fx, fy - 1, r - 1, look[0]);
      rect(ctx, fx - 1, fy - r + 1, 1, 1, look[1]);
    }
  }
}

function stall(ctx, x, w, rand) {
  const awnY = BASE - 58;
  const tableY = BASE - 22;
  // Back wall of the stall: dark, with shelves of jars
  rect(ctx, x + 2, awnY + 8, w - 4, tableY - awnY - 8, '#2a2236');
  for (let sy = awnY + 16; sy < tableY - 4; sy += 10) {
    rect(ctx, x + 3, sy, w - 6, 1, C.woodShade);
    for (let jx = x + 5; jx < x + w - 6; jx += 5) {
      if (rand() < 0.7) rect(ctx, jx, sy - 4, 3, 4, ['#ffb347', '#e0474c', '#7cc47a', '#d9cbb6'][Math.floor(rand() * 4)]);
    }
  }
  // Posts
  rect(ctx, x, awnY, 3, BASE - awnY, OUTLINE);
  rect(ctx, x + 1, awnY, 1, BASE - awnY, C.woodLight);
  rect(ctx, x + w - 3, awnY, 3, BASE - awnY, OUTLINE);
  rect(ctx, x + w - 2, awnY, 1, BASE - awnY, C.woodLight);
  // Table: a wooden counter with a cloth
  rect(ctx, x - 1, tableY, w + 2, 3, OUTLINE);
  rect(ctx, x, tableY + 1, w, 1, C.woodLight);
  rect(ctx, x + 2, tableY + 3, w - 4, BASE - tableY - 3, C.wood);
  for (let i = x + 4; i < x + w - 4; i += 6) rect(ctx, i, tableY + 3, 1, BASE - tableY - 3, C.woodShade);
  const [stripe, white] = AWNINGS[Math.floor(rand() * AWNINGS.length)];
  // A cloth draped over the front of the table, in the awning colour
  rect(ctx, x + 2, tableY + 3, w - 4, 6, white);
  for (let i = x + 2; i < x + w - 2; i += 6) rect(ctx, i, tableY + 3, 3, 6, stripe);
  rect(ctx, x + 2, tableY + 9, w - 4, 1, OUTLINE);
  // Fruit and veg piled on the table in trays
  const kinds = ['orange', 'apple', 'lemon', 'grape', 'melon'];
  let fx = x + 4;
  while (fx < x + w - 16) {
    const tw = 12 + Math.floor(rand() * 8);
    const kind = kinds[Math.floor(rand() * kinds.length)];
    rect(ctx, fx, tableY - 2, tw, 2, C.woodShade);
    rect(ctx, fx, tableY - 3, tw, 1, OUTLINE);
    fruitPile(ctx, fx, tableY - 11, tw, kind);
    // Little price card on a stick
    if (rand() < 0.5) {
      rect(ctx, fx + tw - 3, tableY - 16, 1, 6, OUTLINE);
      rect(ctx, fx + tw - 6, tableY - 20, 7, 5, '#fff6e0');
      rect(ctx, fx + tw - 5, tableY - 18, 4, 1, '#c0392b');
    }
    fx += tw + 2;
  }
  // Striped awning with a scalloped edge
  rect(ctx, x - 3, awnY, w + 6, 11, OUTLINE);
  for (let ax = x - 2; ax < x + w + 2; ax += 6) {
    rect(ctx, ax, awnY + 1, 3, 9, stripe);
    rect(ctx, ax + 3, awnY + 1, 3, 9, white);
  }
  rect(ctx, x - 2, awnY + 1, w + 4, 1, '#ffffff');
  for (let ax = x - 2; ax < x + w + 2; ax += 6) {
    rect(ctx, ax, awnY + 10, 3, 2, stripe);
    rect(ctx, ax + 1, awnY + 12, 1, 1, stripe);
    rect(ctx, ax, awnY + 12, 1, 1, OUTLINE);
    rect(ctx, ax + 2, awnY + 12, 1, 1, OUTLINE);
  }
  // A paper lantern hanging from the awning
  if (rand() < 0.6) {
    const lx = x + Math.floor(w / 2) + Math.floor(rand() * 10) - 5;
    rect(ctx, lx + 2, awnY + 12, 1, 4, OUTLINE);
    box(ctx, lx, awnY + 16, 6, 8, { fill: '#ff6b4a', light: '#ffb08a', shade: '#c0392b' });
    rect(ctx, lx + 1, awnY + 19, 4, 1, '#ffd98a');
    dither(ctx, lx - 3, awnY + 14, 12, 12, '#ffb08a44');
  }
}

function crateStack(ctx, x) {
  // Spare crates and sacks between the stalls
  for (const [cx, cy] of [
    [x, BASE - 9],
    [x + 11, BASE - 9],
    [x + 5, BASE - 18],
  ]) {
    box(ctx, cx, cy, 11, 9, { fill: C.wood, light: C.woodLight, shade: C.woodShade });
    rect(ctx, cx + 1, cy + 4, 9, 1, C.woodDark);
  }
  box(ctx, x + 23, BASE - 12, 9, 12, { fill: '#c9a57e', light: '#e0bf96', shade: '#a2805f' });
  rect(ctx, x + 25, BASE - 13, 5, 2, OUTLINE);
}

// Where the string-light bulbs hang, so they can twinkle
function makeNear(rand) {
  const W = 1600;
  const [canvas, ctx] = makeCanvas(W, NEAR_H);
  const posts = [];
  let x = 6;
  while (x < W - 70) {
    const w = 56 + 4 * Math.floor(rand() * 8);
    if (x + w > W - 6) break;
    stall(ctx, x, w, rand);
    posts.push(x + 1, x + w - 2);
    x += w;
    if (rand() < 0.45) {
      crateStack(ctx, x + 4);
      x += 40;
    } else {
      x += 8 + Math.floor(rand() * 10);
    }
  }
  // Tall poles carrying the string lights, then the wires between them
  const bulbs = [];
  const poles = [];
  for (let px = 30; px < W - 10; px += 120) poles.push(px);
  for (const px of poles) {
    rect(ctx, px, 8, 2, BASE - 8, OUTLINE);
    rect(ctx, px, 8, 1, BASE - 8, '#4a4266');
  }
  for (let i = 0; i + 1 < poles.length; i++) {
    const a = poles[i] + 1;
    const b = poles[i + 1] + 1;
    const span = b - a;
    for (let k = 0; k <= span; k++) {
      const sag = Math.round(Math.sin((k / span) * Math.PI) * 16);
      rect(ctx, a + k, 12 + sag, 1, 1, C.wire);
      if (k % 10 === 5) bulbs.push([a + k, 13 + sag]);
    }
  }
  for (const [bx, by] of bulbs) {
    rect(ctx, bx, by, 1, 1, C.wire);
    rect(ctx, bx - 1, by + 1, 3, 3, '#c98a4b');
    rect(ctx, bx, by + 1, 1, 2, C.bulb);
  }
  return { canvas, bulbs };
}

// Two overlays of brighter bulbs with a glow; swapping them makes the lights twinkle
function makeBulbGlow(W, bulbs, which) {
  const [canvas, ctx] = makeCanvas(W, NEAR_H);
  bulbs.forEach(([bx, by], i) => {
    if (i % 2 !== which) return;
    dither(ctx, bx - 3, by - 2, 7, 8, '#ffd98a66');
    rect(ctx, bx - 1, by + 1, 3, 3, C.bulb);
    rect(ctx, bx, by + 1, 1, 2, C.bulbHot);
  });
  return canvas;
}

// ---------- Ground: cobblestones, a gutter, more cobbles in front ----------

function makeGround(rand) {
  const W = 960;
  const H = HEIGHT - 222;
  const [canvas, ctx] = makeCanvas(W, H);
  rect(ctx, 0, 0, W, 1, OUTLINE);
  // The street he rides on (rows 1..21): tidy cobbles in rows
  rect(ctx, 0, 1, W, 21, '#5b4e68');
  for (let row = 0; row < 5; row++) {
    const y = 1 + row * 4 + (row > 2 ? 1 : 0);
    const h = 3;
    const offset = row % 2 ? 4 : 0;
    for (let x = -offset; x < W; x += 8) {
      const shade = rand();
      const fill = shade < 0.12 ? '#766680' : shade > 0.9 ? '#85758e' : C.cobble;
      rect(ctx, x + 1, y + 1, 6, h, fill);
      rect(ctx, x + 2, y + 1, 4, 1, '#8b7c95');
    }
  }
  // Squashed fruit and leaves here and there
  for (let i = 0; i < 10; i++) {
    const lx = Math.floor(rand() * W);
    const ly = 4 + Math.floor(rand() * 15);
    rect(ctx, lx, ly, 2, 1, ['#ff8a3d', '#4f9a55', '#e0474c'][i % 3]);
  }
  // Stone gutter and curb
  rect(ctx, 0, 22, W, 1, '#b8aac4');
  rect(ctx, 0, 23, W, 3, '#8d7f9a');
  rect(ctx, 0, 25, W, 1, '#6b5f78');
  rect(ctx, 0, 26, W, 1, OUTLINE);
  // Darker cobbles in front, bigger (they're closer to us)
  rect(ctx, 0, 27, W, H - 27, '#2f2740');
  for (let row = 0; row < 4; row++) {
    const y = 28 + row * 6;
    const offset = row % 2 ? 6 : 0;
    for (let x = -offset; x < W; x += 12) {
      rect(ctx, x + 1, y, 10, 5, '#5b4e6a');
      rect(ctx, x + 1, y, 9, 1, '#6f6180');
      rect(ctx, x + 10, y + 1, 1, 4, '#463b55');
    }
  }
  return canvas;
}

// ---------- The obstacles: things to smash through ----------

const FRUIT = {
  apple: [C.apple, C.appleLight, C.appleShade],
  orange: [C.orange, C.orangeLight, C.orangeShade],
  lemon: [C.lemon, C.lemonLight, C.lemonShade],
  grape: [C.grape, C.grapeLight, '#5e3a9a'],
};

// One round piece of fruit, 5 x 5, with its top-left at (x, y)
function fruit(ctx, x, y, kind) {
  const [fill, light, shade] = FRUIT[kind];
  rect(ctx, x + 1, y, 3, 5, OUTLINE);
  rect(ctx, x, y + 1, 5, 3, OUTLINE);
  rect(ctx, x + 1, y + 1, 3, 3, fill);
  rect(ctx, x + 1, y + 1, 1, 1, light);
  rect(ctx, x + 3, y + 3, 1, 1, shade);
  rect(ctx, x + 2, y + 3, 1, 1, shade);
}

function makeCrates() {
  const [canvas, ctx] = makeCanvas(16, 22);
  // Oranges peeking out of the top crate
  fruit(ctx, 2, 2, 'orange');
  fruit(ctx, 9, 2, 'orange');
  fruit(ctx, 5, 0, 'orange');
  rect(ctx, 7, 0, 2, 1, C.leaf);
  // Two wooden crates: the top one a little smaller
  const crate = (x, y, w, h, label) => {
    box(ctx, x, y, w, h, { fill: C.wood, light: C.woodLight, shade: C.woodShade });
    rect(ctx, x + 1, y + Math.floor(h / 2), w - 2, 1, C.woodDark);
    rect(ctx, x + 2, y + 1, 1, h - 2, C.woodDark);
    rect(ctx, x + w - 3, y + 1, 1, h - 2, C.woodDark);
    if (label) {
      rect(ctx, x + 5, y + 2, w - 10, 3, '#fff1e6');
      rect(ctx, x + 6, y + 3, w - 12, 1, '#e0474c');
    }
  };
  crate(1, 6, 14, 8, false);
  crate(0, 13, 16, 9, true);
  return canvas;
}

function makeCart() {
  const [canvas, ctx] = makeCanvas(32, 24);
  // Handles reaching back to the left, and the back leg
  rect(ctx, 0, 11, 7, 3, OUTLINE);
  rect(ctx, 1, 12, 6, 1, C.woodLight);
  rect(ctx, 8, 17, 3, 7, OUTLINE);
  rect(ctx, 9, 17, 1, 6, C.wood);
  // Fruit heaped on top (back row first, so the front row overlaps it)
  const heap = [
    [12, 1, 'lemon'],
    [17, 0, 'apple'],
    [22, 1, 'grape'],
    [8, 5, 'apple'],
    [13, 4, 'orange'],
    [18, 4, 'lemon'],
    [23, 4, 'apple'],
    [27, 5, 'orange'],
  ];
  for (const [fx, fy, k] of heap) fruit(ctx, fx, fy, k);
  rect(ctx, 19, 0, 2, 1, C.leafLight);
  // A bunch of bananas hanging off the side
  rect(ctx, 28, 9, 4, 2, OUTLINE);
  rect(ctx, 29, 9, 2, 1, C.lemon);
  // The cart body: green painted boards
  box(ctx, 5, 9, 27, 9, { fill: '#3f8f5a', light: '#6fbf7f', shade: '#2c6b42' });
  rect(ctx, 6, 13, 25, 1, '#2c6b42');
  rect(ctx, 6, 11, 25, 1, '#4fa86a');
  rect(ctx, 12, 14, 12, 2, '#fff1e6'); // a little name board
  rect(ctx, 13, 14, 10, 1, '#c0392b');
  // Big spoked wheel
  circle(ctx, 23, 19, 5, OUTLINE);
  circle(ctx, 23, 19, 4, C.wood);
  circle(ctx, 23, 19, 3, OUTLINE);
  rect(ctx, 23, 16, 1, 7, C.woodLight);
  rect(ctx, 20, 19, 7, 1, C.woodLight);
  rect(ctx, 22, 18, 3, 3, C.woodDark);
  rect(ctx, 23, 19, 1, 1, '#d9cbb6');
  return canvas;
}

// A pixel line, for the bike frame
function line(ctx, x1, y1, x2, y2, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  for (let i = 0; i <= steps; i++) {
    rect(ctx, Math.round(x1 + ((x2 - x1) * i) / steps), Math.round(y1 + ((y2 - y1) * i) / steps), 1, 1, color);
  }
}

function makeBike() {
  const [canvas, ctx] = makeCanvas(28, 18);
  const wheel = (cx) => {
    circle(ctx, cx, 12, 5, OUTLINE);
    circle(ctx, cx, 12, 4, '#4a4266');
    circle(ctx, cx, 12, 3, OUTLINE);
    // Spokes over the dark middle
    rect(ctx, cx, 10, 1, 5, '#9a90b6');
    rect(ctx, cx - 2, 12, 5, 1, '#9a90b6');
    rect(ctx, cx - 1, 11, 1, 1, '#9a90b6');
    rect(ctx, cx + 1, 13, 1, 1, '#9a90b6');
    rect(ctx, cx, 12, 1, 1, '#d9d2ea');
    rect(ctx, cx - 3, 8, 2, 1, '#6b6188'); // tyre shine
  };
  wheel(5);
  wheel(21);
  // Frame: back hub > seat > crank > handlebars > front hub, in two shades
  const frame = '#2fb3a8';
  const frameLight = '#7fe8de';
  for (const [a, b, c, d] of [
    [5, 12, 10, 5],
    [10, 5, 12, 12],
    [5, 12, 12, 12],
    [12, 12, 19, 5],
    [10, 5, 19, 5],
    [19, 5, 21, 12],
  ]) {
    line(ctx, a, b + 1, c, d + 1, OUTLINE);
    line(ctx, a, b, c, d, frame);
  }
  line(ctx, 10, 5, 19, 5, frameLight);
  // Seat and handlebars
  rect(ctx, 8, 2, 5, 2, OUTLINE);
  rect(ctx, 9, 2, 3, 1, '#5e3a22');
  rect(ctx, 10, 4, 1, 1, OUTLINE);
  rect(ctx, 18, 1, 1, 4, OUTLINE);
  rect(ctx, 16, 1, 4, 1, OUTLINE);
  rect(ctx, 15, 1, 2, 1, '#5e3a22');
  // Crank and pedal
  rect(ctx, 11, 11, 3, 3, OUTLINE);
  rect(ctx, 12, 12, 1, 1, '#d9d2ea');
  rect(ctx, 13, 14, 3, 1, OUTLINE);
  // A wicker basket on the front with a baguette and flowers
  rect(ctx, 20, 3, 8, 6, OUTLINE);
  rect(ctx, 21, 4, 6, 4, '#c98a4b');
  for (let i = 21; i < 27; i += 2) rect(ctx, i, 4, 1, 4, '#a86a3c');
  rect(ctx, 21, 4, 6, 1, '#e3aa6a');
  rect(ctx, 22, 0, 2, 4, OUTLINE);
  rect(ctx, 22, 1, 1, 3, '#e3aa6a');
  rect(ctx, 25, 1, 1, 3, C.leaf);
  rect(ctx, 24, 0, 3, 2, '#ff6b8b');
  rect(ctx, 25, 0, 1, 1, '#ffd23f');
  // Kickstand
  line(ctx, 12, 13, 10, 17, OUTLINE);
  return canvas;
}

// One pigeon, facing right, 10 x 9, head up (pecking = false) or down
function makePigeon(pecking) {
  const [canvas, ctx] = makeCanvas(10, 9);
  const body = '#bcc4dc';
  const light = '#e8ecf8';
  const shade = '#8a92b2';
  // Tail and body
  rect(ctx, 0, 4, 3, 2, OUTLINE);
  rect(ctx, 1, 4, 2, 1, shade);
  rect(ctx, 2, 3, 6, 5, OUTLINE);
  rect(ctx, 3, 4, 5, 3, body);
  rect(ctx, 3, 4, 3, 1, light);
  rect(ctx, 3, 5, 3, 1, '#4b5374'); // wing bar
  rect(ctx, 5, 5, 1, 1, '#4b5374');
  rect(ctx, 4, 6, 3, 1, shade);
  // Feet
  rect(ctx, 4, 8, 1, 1, C.orange);
  rect(ctx, 6, 8, 1, 1, C.orange);
  if (!pecking) {
    // Shiny neck and head held up
    rect(ctx, 6, 1, 3, 4, OUTLINE);
    rect(ctx, 7, 2, 1, 2, '#5fb3a0');
    rect(ctx, 6, 3, 1, 1, '#9a6ad0');
    rect(ctx, 7, 0, 2, 2, OUTLINE);
    rect(ctx, 7, 1, 2, 1, '#9aa3c0');
    rect(ctx, 8, 1, 1, 1, C.orange); // eye
    rect(ctx, 9, 2, 1, 1, '#d9cbb6'); // beak
  } else {
    // Head down, pecking at a crumb
    rect(ctx, 7, 4, 3, 4, OUTLINE);
    rect(ctx, 8, 5, 1, 1, '#5fb3a0');
    rect(ctx, 7, 5, 1, 1, '#9a6ad0');
    rect(ctx, 8, 6, 1, 1, '#9aa3c0');
    rect(ctx, 9, 6, 1, 1, C.orange);
    rect(ctx, 9, 8, 1, 1, '#d9cbb6');
  }
  return canvas;
}

export function createMarket() {
  const rand = sceneryRandom(31337);
  const near = makeNear(rand);
  const layers = {
    sky: makeSky(),
    far: makeFar(rand),
    mid: makeMid(rand),
    near: near.canvas,
    glowA: makeBulbGlow(near.canvas.width, near.bulbs, 0),
    glowB: makeBulbGlow(near.canvas.width, near.bulbs, 1),
    ground: makeGround(rand),
  };
  const sprites = {
    [KIND.CRATES]: makeCrates(),
    [KIND.CART]: makeCart(),
    [KIND.BIKE]: makeBike(),
  };
  const pigeonUp = makePigeon(false);
  const pigeonDown = makePigeon(true);

  function drawPigeons(ctx, x, y, time) {
    // Three birds; each pecks on its own rhythm. The middle one faces left.
    const birds = [
      [0, 3, false, 0.0],
      [8, 2, true, 0.37],
      [14, 3, false, 0.71],
    ];
    for (const [bx, by, flip, phase] of birds) {
      const t = (time * 1.7 + phase + x * 0.013) % 1;
      const sprite = t < 0.35 ? pigeonDown : pigeonUp;
      if (flip) {
        ctx.save();
        ctx.translate(x + bx + 10, y + by);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0);
        ctx.restore();
      } else {
        ctx.drawImage(sprite, x + bx, y + by);
      }
    }
    // Crumbs they're pecking at
    rect(ctx, x + 11, y + 11, 1, 1, '#e3aa6a');
    rect(ctx, x + 20, y + 11, 1, 1, '#e3aa6a');
  }

  return {
    drawBack(ctx, scroll, time) {
      ctx.drawImage(layers.sky, 0, 0);
      drawStrip(ctx, layers.far, scroll * 0.1, SKY_BOTTOM - layers.far.height);
      drawStrip(ctx, layers.mid, scroll * 0.25, 216 - MID_H);
      const nearY = 222 - NEAR_H;
      drawStrip(ctx, layers.near, scroll * 0.55, nearY);
      drawStrip(ctx, Math.floor(time * 2.5) % 2 ? layers.glowA : layers.glowB, scroll * 0.55, nearY);
      drawStrip(ctx, layers.ground, scroll, 222);
    },

    drawObstacle(ctx, o, time) {
      const { x, y, w, h } = o;
      // A soft shadow on the cobbles grounds everything
      rect(ctx, x + 1, y + h, w - 2, 1, '#3d3350');
      rect(ctx, x + 3, y + h + 1, w - 6, 1, '#4a3f5c');
      if (o.kind === KIND.PIGEONS) {
        drawPigeons(ctx, x, y, time);
        return;
      }
      const sprite = sprites[o.kind];
      if (sprite) ctx.drawImage(sprite, x, y);
    },

    // The bits that fly when he smashes something
    debris: {
      [KIND.CRATES]: [C.wood, C.woodLight, C.woodDark, C.orange, C.orangeLight],
      [KIND.CART]: ['#3f8f5a', C.apple, C.lemon, C.orange, C.wood],
      [KIND.BIKE]: ['#2fb3a8', '#7fe8de', '#4a4266', '#c98a4b', '#ff6b8b'],
      [KIND.PIGEONS]: ['#c4cbe0', '#9aa3c0', '#ffffff', '#6b7393'],
    },
  };
}
