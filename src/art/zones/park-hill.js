// zones/park-hill.js: Park Hill, a bright late-afternoon park on a hill.
//
// Layers (back to front): blue sky with a warm sun > fluffy clouds and kites >
// hazy far hills with a windmill and the city far away > green hills with a
// sparkling lake and a bandstand > big round trees, benches, lamp posts,
// flower beds and an ice-cream van > the park path > tall grass in front.
//
// No obstacles here: instead a GIANT runaway donut rolls after the boy.
// drawDonut() draws it, picking one of 16 pre-drawn rolling frames.
import { WIDTH, HEIGHT, GROUND_Y, DONUT_SIZE } from '../../world.js';
import { mixHex } from '../palette.js';
import { makeCanvas, rect, box, circle, dither, sceneryRandom, OUTLINE } from '../pixel.js';
import { drawStrip } from '../strip.js';

const C = {
  skyTop: '#5fb0ee',
  skyBottom: '#ffe2b0',
  sun: '#fff6cf',
  sunEdge: '#ffe08a',
  halo: '#ffeeb8',
  cloud: '#ffffff',
  cloudShade: '#d8e6f6',
  cloudDeep: '#bccde6',
  city: '#b7b2dc',
  cityLight: '#c9c4e8',
  hillFar: '#a5cfc0',
  hillFarLight: '#bfe0d2',
  hillMid: '#86c16c',
  hillMidLight: '#a7d987',
  hillMidShade: '#6aa858',
  lake: '#5fb3e0',
  lakeLight: '#8fd3f5',
  lakeDeep: '#4596c8',
  sparkle: '#f2fbff',
  leaf: '#4fa64a',
  leafLight: '#7fd068',
  leafShine: '#b4ec8a',
  leafShade: '#357a3c',
  trunk: '#8a5a3a',
  trunkLight: '#a8744c',
  trunkShade: '#64402a',
  hedge: '#3f8f45',
  hedgeLight: '#5cb85c',
  path: '#e7c28b',
  pathLight: '#f6dcaa',
  pathShade: '#c99e60',
  pathEdge: '#b8ad98',
  grass: '#6cc04a',
  grassLight: '#86d65e',
  grassShade: '#58a83e',
  grassDeep: '#3f8f3a',
};

const FLOWERS = ['#ff6b6b', '#ffd166', '#ffffff', '#c38bff', '#ff8fd0', '#5ff2e8'];

// A seamless wavy line: the sum of sines whose waves fit the strip exactly
function wave(width, parts, rand) {
  const waves = parts.map(([amp, k]) => ({ amp, k, phase: rand() * Math.PI * 2 }));
  return (x) => waves.reduce((sum, w) => sum + w.amp * Math.sin((x / width) * Math.PI * 2 * w.k + w.phase), 0);
}

// ---------- Sky with the sun ----------

function makeSky() {
  const [canvas, ctx] = makeCanvas(WIDTH, HEIGHT);
  const bands = 12;
  const bottom = 210;
  const h = bottom / bands;
  const colors = [];
  for (let i = 0; i < bands; i++) colors.push(mixHex(C.skyTop, C.skyBottom, Math.pow(i / (bands - 1), 1.4)));
  colors.forEach((color, i) => rect(ctx, 0, Math.floor(i * h), WIDTH, Math.ceil(h) + 1, color));
  rect(ctx, 0, bottom, WIDTH, HEIGHT - bottom, colors[bands - 1]);
  for (let i = 1; i < bands; i++) dither(ctx, 0, Math.floor(i * h) - 1, WIDTH, 2, colors[i]);

  // Warm sun with two rings of halo
  const sx = 372;
  const sy = 84;
  const bandAt = (y) => colors[Math.min(bands - 1, Math.floor(y / h))];
  for (let y = sy - 40; y <= sy + 40; y++) {
    for (let x = sx - 40; x <= sx + 40; x++) {
      const d = Math.hypot(x - sx, y - sy);
      if (d < 40 && d > 26 && (x + y) % 2 === 0) rect(ctx, x, y, 1, 1, mixHex(bandAt(y), C.halo, d < 32 ? 0.7 : 0.45));
    }
  }
  circle(ctx, sx, sy, 24, C.sunEdge);
  circle(ctx, sx, sy, 22, C.sun);
  circle(ctx, sx - 5, sy - 6, 12, '#fffbe6');
  rect(ctx, sx - 14, sy - 14, 4, 2, '#ffffff');
  rect(ctx, sx - 16, sy - 11, 2, 3, '#ffffff');
  return canvas;
}

// ---------- Fluffy clouds ----------

function makeCloud(rand) {
  const w = 44 + Math.floor(rand() * 50);
  const [canvas, ctx] = makeCanvas(w + 6, 28);
  const puffs = [];
  for (let x = 9; x < w - 4; x += 7 + Math.floor(rand() * 6)) puffs.push([x, 15 - Math.floor(rand() * 8), 6 + Math.floor(rand() * 4)]);
  for (const [x, y, r] of puffs) circle(ctx, x, y + 1, r + 1, C.cloudDeep);
  rect(ctx, 3, 15, w - 4, 7, C.cloudDeep);
  for (const [x, y, r] of puffs) circle(ctx, x, y, r, C.cloudShade);
  rect(ctx, 4, 14, w - 6, 6, C.cloudShade);
  for (const [x, y, r] of puffs) circle(ctx, x - 1, y - 1, r - 1, C.cloud);
  rect(ctx, 5, 13, w - 10, 4, C.cloud);
  return canvas;
}

function makeClouds(rand) {
  const [canvas, ctx] = makeCanvas(960, 130);
  for (let x = 16; x < 880; x += 130 + Math.floor(rand() * 150)) ctx.drawImage(makeCloud(rand), x, 8 + Math.floor(rand() * 84));
  return canvas;
}

// ---------- Kites (drawn every frame, so their tails flutter) ----------

const KITES = [
  { x: 150, y: 70, body: '#ff6b6b', light: '#ff9a9a', cross: '#ffd166', speed: 0.05 },
  { x: 430, y: 52, body: '#3fd6c8', light: '#8af0e6', cross: '#ffffff', speed: 0.06 },
  { x: 700, y: 92, body: '#c38bff', light: '#ddb8ff', cross: '#ffd166', speed: 0.045 },
];

function drawKite(ctx, k, scroll, time) {
  const span = WIDTH + 260;
  const x = Math.round((((k.x - scroll * k.speed) % span) + span) % span) - 100;
  const y = Math.round(k.y + Math.sin(time * 1.3 + k.x) * 4);
  if (x < -30 || x > WIDTH + 30) return;
  // String down to a kid we can't see
  for (let i = 1; i < 40; i++) rect(ctx, x - Math.round(i * 1.6), y + 12 + i * 3, 1, 1, '#ffffff');
  // Tail: little bows on a wavy ribbon
  for (let i = 1; i <= 7; i++) {
    const tx = x + Math.round(Math.sin(time * 5 + i * 0.9) * 2) - i;
    const ty = y + 12 + i * 3;
    rect(ctx, tx, ty, 1, 2, '#ffffff');
    if (i % 2 === 0) {
      rect(ctx, tx - 1, ty, 3, 1, k.cross);
      rect(ctx, tx, ty + 1, 1, 1, k.cross);
    }
  }
  // Diamond body with a cross
  for (let r = 0; r <= 12; r++) {
    const half = r <= 4 ? r : Math.round((12 - r) * 0.55);
    rect(ctx, x - half - 1, y + r, half * 2 + 3, 1, OUTLINE);
  }
  for (let r = 1; r <= 11; r++) {
    const half = r <= 4 ? r : Math.round((12 - r) * 0.55);
    rect(ctx, x - half, y + r, half + 1, 1, k.light);
    rect(ctx, x + 1, y + r, half, 1, k.body);
  }
  rect(ctx, x, y + 1, 1, 11, k.cross);
  rect(ctx, x - 3, y + 4, 7, 1, k.cross);
}

// ---------- Far hills, the city far away, a windmill ----------

function makeFar(rand) {
  const W = 960;
  const H = 120;
  const [canvas, ctx] = makeCanvas(W, H);
  // The city they came from, small and hazy
  for (let x = 40; x < 300; ) {
    const w = 6 + Math.floor(rand() * 10);
    const h = 18 + Math.floor(rand() * 34);
    rect(ctx, x, H - 40 - h, w, h + 40, C.city);
    rect(ctx, x, H - 40 - h, w, 1, C.cityLight);
    if (rand() < 0.3) rect(ctx, x + Math.floor(w / 2), H - 48 - h, 1, 8, C.city);
    x += w + (rand() < 0.3 ? 2 : 0);
  }
  const hill = wave(W, [[9, 2], [6, 5], [3, 11]], rand);
  for (let x = 0; x < W; x++) {
    const top = Math.round(H - 48 + hill(x));
    rect(ctx, x, top, 1, H - top, C.hillFar);
    rect(ctx, x, top, 1, 1, C.hillFarLight);
    // Tiny trees dotted along the hills
    if (x % 9 === 0 && rand() < 0.5) {
      rect(ctx, x, top - 3, 2, 3, '#86b8a4');
      rect(ctx, x, top - 4, 2, 1, '#9ccab6');
    }
  }
  // A windmill on a hill top
  const wx = 620;
  const wt = Math.round(H - 48 + hill(wx));
  rect(ctx, wx - 2, wt - 16, 5, 16, '#e8e2d6');
  rect(ctx, wx - 3, wt - 18, 7, 3, '#c97b6b');
  rect(ctx, wx, wt - 26, 1, 17, '#f4f0e8');
  rect(ctx, wx - 8, wt - 18, 17, 1, '#f4f0e8');
  rect(ctx, wx, wt - 18, 1, 1, '#8a6a5a');
  return canvas;
}

// ---------- Green hills with a lake and a bandstand (two versions: sparkles move) ----------

function makeMid(phase) {
  const rand = sceneryRandom(9091);
  const W = 1440;
  const H = 100;
  const [canvas, ctx] = makeCanvas(W, H);
  const hill = wave(W, [[12, 3], [6, 7], [2, 17]], rand);
  const lakeTop = H - 22;
  for (let x = 0; x < W; x++) {
    const top = Math.round(H - 58 + hill(x));
    rect(ctx, x, top, 1, H - top, C.hillMid);
    rect(ctx, x, top, 1, 2, C.hillMidLight);
    // Mowing stripes
    if (Math.floor(x / 24) % 2 === 0) for (let y = top + 6; y < lakeTop; y += 2) rect(ctx, x, y + (x % 2), 1, 1, C.hillMidShade);
  }
  // Little round trees along the hills
  for (let x = 12; x < W - 12; x += 22 + Math.floor(rand() * 30)) {
    const top = Math.round(H - 58 + hill(x));
    rect(ctx, x, top - 4, 2, 6, C.trunkShade);
    circle(ctx, x + 1, top - 8, 5, C.leafShade);
    circle(ctx, x, top - 9, 4, C.leaf);
    rect(ctx, x - 2, top - 12, 2, 1, C.leafLight);
  }
  // The lake along the bottom, with reeds and sparkles
  rect(ctx, 0, lakeTop - 1, W, 1, '#4f8f6a');
  rect(ctx, 0, lakeTop, W, H - lakeTop, C.lake);
  rect(ctx, 0, lakeTop, W, 1, C.lakeLight);
  for (let y = lakeTop + 4; y < H; y += 4) dither(ctx, 0, y, W, 1, C.lakeDeep);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rand() * W);
    const y = lakeTop + 2 + Math.floor(rand() * 18);
    const on = (i + phase) % 3 !== 0;
    if (on) rect(ctx, x, y, 3, 1, C.sparkle);
  }
  for (let x = 8; x < W; x += 60 + Math.floor(rand() * 60)) {
    for (let i = 0; i < 5; i++) rect(ctx, x + i * 2, lakeTop - 4 + (i % 2), 1, 5 - (i % 2), '#4f8f3a');
  }
  // A white bandstand with a red roof, and a little rowing boat
  const bx = 300;
  const bt = lakeTop - 24;
  rect(ctx, bx - 1, bt + 4, 24, 3, OUTLINE);
  for (let r = 0; r < 6; r++) rect(ctx, bx + 11 - r * 2, bt - 2 + r, r * 4 + 1, 1, r === 0 ? OUTLINE : '#e05a5a');
  rect(ctx, bx, bt + 5, 22, 1, '#ffffff');
  for (const px of [bx + 1, bx + 7, bx + 14, bx + 20]) rect(ctx, px, bt + 7, 1, 13, '#f4f0e8');
  rect(ctx, bx - 1, bt + 20, 24, 3, '#e8e2d6');
  rect(ctx, bx - 1, bt + 22, 24, 1, '#b8ad98');
  const boat = 820 + phase * 2;
  rect(ctx, boat, lakeTop + 8, 14, 1, OUTLINE);
  rect(ctx, boat + 1, lakeTop + 9, 12, 2, '#e07a5f');
  rect(ctx, boat + 2, lakeTop + 11, 10, 1, OUTLINE);
  rect(ctx, boat + 6, lakeTop + 4, 2, 4, '#ffd166');
  rect(ctx, boat + 6, lakeTop + 3, 2, 1, '#f2c09a');
  return canvas;
}

// ---------- Near: big trees, benches, lamps, flower beds, an ice-cream van ----------

const NEAR_H = 140;

function bigTree(ctx, x, rand) {
  const base = NEAR_H;
  const trunkH = 34 + Math.floor(rand() * 18);
  const r = 18 + Math.floor(rand() * 8);
  // Trunk with a fork
  rect(ctx, x - 4, base - trunkH, 9, trunkH, OUTLINE);
  rect(ctx, x - 3, base - trunkH, 7, trunkH, C.trunk);
  rect(ctx, x - 3, base - trunkH, 2, trunkH, C.trunkLight);
  rect(ctx, x + 2, base - trunkH, 2, trunkH, C.trunkShade);
  for (let y = base - trunkH + 6; y < base - 4; y += 7) rect(ctx, x - 1 + (y % 2), y, 2, 1, C.trunkShade);
  rect(ctx, x - 6, base - 3, 13, 3, OUTLINE);
  rect(ctx, x - 5, base - 3, 11, 2, C.trunk);
  // Canopy: a cluster of round puffs, outline first, then shade, mid, light
  const cy = base - trunkH - r + 6;
  const puffs = [
    [0, 0, r],
    [-r * 0.7, 6, r * 0.7],
    [r * 0.7, 6, r * 0.7],
    [-r * 0.35, -r * 0.55, r * 0.65],
    [r * 0.4, -r * 0.5, r * 0.6],
  ].map(([dx, dy, rr]) => [Math.round(x + dx), Math.round(cy + dy), Math.round(rr)]);
  for (const [px, py, rr] of puffs) circle(ctx, px, py, rr + 1, OUTLINE);
  for (const [px, py, rr] of puffs) circle(ctx, px, py, rr, C.leafShade);
  for (const [px, py, rr] of puffs) circle(ctx, px - 2, py - 2, rr - 2, C.leaf);
  for (const [px, py, rr] of puffs) circle(ctx, px - 4, py - 4, Math.max(1, rr - 7), C.leafLight);
  // Leafy texture and a few shiny leaves
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2;
    const d = rand() * r;
    const lx = Math.round(x + Math.cos(a) * d);
    const ly = Math.round(cy + Math.sin(a) * d * 0.8);
    rect(ctx, lx, ly, 2, 1, Math.sin(a) > 0.2 ? C.leafShade : C.leafShine);
  }
  // Sometimes red apples
  if (rand() < 0.35) for (let i = 0; i < 5; i++) rect(ctx, x - r + 6 + Math.floor(rand() * (r * 2 - 12)), cy - 4 + Math.floor(rand() * 14), 2, 2, '#e0474c');
}

function bench(ctx, x) {
  const b = NEAR_H;
  rect(ctx, x, b - 15, 28, 3, OUTLINE);
  rect(ctx, x + 1, b - 14, 26, 1, '#b8794a');
  rect(ctx, x, b - 11, 28, 3, OUTLINE);
  rect(ctx, x + 1, b - 10, 26, 1, '#b8794a');
  rect(ctx, x - 1, b - 7, 30, 3, OUTLINE);
  rect(ctx, x, b - 6, 28, 1, '#d29462');
  for (const lx of [x + 2, x + 24]) rect(ctx, lx, b - 15, 2, 15, OUTLINE);
}

function parkLamp(ctx, x) {
  const b = NEAR_H;
  rect(ctx, x, b - 58, 3, 58, OUTLINE);
  rect(ctx, x + 1, b - 57, 1, 56, '#4a4a5e');
  rect(ctx, x - 2, b - 6, 7, 6, OUTLINE);
  rect(ctx, x - 3, b - 66, 9, 9, OUTLINE);
  rect(ctx, x - 2, b - 65, 7, 7, '#fff4cf');
  rect(ctx, x - 2, b - 65, 2, 7, '#ffffff');
  rect(ctx, x - 4, b - 68, 11, 2, OUTLINE);
  rect(ctx, x, b - 70, 3, 2, OUTLINE);
}

function flowerBed(ctx, x, w, rand) {
  const b = NEAR_H;
  for (let i = 0; i < w; i++) {
    const hgt = Math.round(5 + Math.sin((i / w) * Math.PI) * 5);
    rect(ctx, x + i, b - hgt - 1, 1, 1, OUTLINE);
    rect(ctx, x + i, b - hgt, 1, hgt, '#6a4a3a');
  }
  for (let i = 2; i < w - 2; i += 2) {
    const hgt = Math.round(5 + Math.sin((i / w) * Math.PI) * 5);
    rect(ctx, x + i, b - hgt - 3, 1, 3, C.leafShade);
    const color = FLOWERS[Math.floor(rand() * FLOWERS.length)];
    rect(ctx, x + i - 1, b - hgt - 5, 3, 2, color);
    rect(ctx, x + i, b - hgt - 5, 1, 1, '#ffe066');
  }
}

function iceCreamVan(ctx, x) {
  const b = NEAR_H;
  const top = b - 38;
  // Body
  rect(ctx, x, top + 6, 60, 26, OUTLINE);
  rect(ctx, x + 1, top + 7, 58, 24, '#ffb3d6');
  rect(ctx, x + 1, top + 7, 58, 2, '#ffd6ea');
  rect(ctx, x + 1, top + 25, 58, 6, '#ff7eb6');
  // Wavy white trim
  for (let i = 0; i < 58; i++) rect(ctx, x + 1 + i, top + 22 + Math.round(Math.sin(i * 0.6)), 1, 2, '#ffffff');
  // Cab with a windscreen at the front (right)
  rect(ctx, x + 44, top + 9, 13, 10, OUTLINE);
  rect(ctx, x + 45, top + 10, 11, 8, '#8fd3f5');
  rect(ctx, x + 46, top + 11, 3, 1, '#ffffff');
  // Serving hatch with an awning and ice creams
  rect(ctx, x + 6, top + 10, 32, 12, OUTLINE);
  rect(ctx, x + 7, top + 11, 30, 10, '#fff4cf');
  for (let ax = x + 5; ax < x + 39; ax += 4) {
    rect(ctx, ax, top + 7, 2, 3, '#ff5fa2');
    rect(ctx, ax + 2, top + 7, 2, 3, '#ffffff');
  }
  for (const [ix, c] of [[x + 10, '#ffffff'], [x + 18, '#ff8fd0'], [x + 26, '#a8744c']]) {
    rect(ctx, ix, top + 15, 4, 3, c);
    rect(ctx, ix + 1, top + 18, 2, 3, '#e0a15a');
  }
  // Giant cone on the roof
  rect(ctx, x + 22, top - 6, 10, 2, OUTLINE);
  circle(ctx, x + 27, top - 8, 5, OUTLINE);
  circle(ctx, x + 27, top - 8, 4, '#ffffff');
  rect(ctx, x + 25, top - 10, 2, 1, '#ff8fd0');
  for (let r = 0; r < 8; r++) rect(ctx, x + 23 + Math.floor(r / 2), top - 4 + r, 8 - r, 1, r % 2 ? '#c98a4a' : '#e0a15a');
  // Wheels
  for (const wx of [x + 12, x + 47]) {
    circle(ctx, wx, b - 5, 5, OUTLINE);
    circle(ctx, wx, b - 5, 3, '#4a4a5e');
    rect(ctx, wx, b - 5, 1, 1, '#d8d8e8');
  }
}

function makeNear(rand) {
  const W = 1600;
  const [canvas, ctx] = makeCanvas(W, NEAR_H);
  // Things along the path, spaced out
  let x = 30;
  let vanPlaced = false;
  while (x < W - 70) {
    const pick = rand();
    if (pick < 0.42) {
      bigTree(ctx, x + 24, rand);
      x += 60 + Math.floor(rand() * 30);
    } else if (pick < 0.56) {
      bench(ctx, x);
      x += 40;
    } else if (pick < 0.7) {
      parkLamp(ctx, x + 4);
      x += 30;
    } else if (pick < 0.85 || vanPlaced) {
      flowerBed(ctx, x, 30 + Math.floor(rand() * 20), rand);
      x += 56;
    } else {
      iceCreamVan(ctx, x);
      vanPlaced = true;
      x += 80;
    }
  }
  if (!vanPlaced) iceCreamVan(ctx, W - 160);
  return canvas;
}

// The grassy bank between the lake and the path (drawn under the near things)
function lawnBank(ctx, W) {
  const top = NEAR_H - 14;
  for (let x = 0; x < W; x++) {
    const t = top + Math.round(Math.sin(x * 0.05) * 1.5 + Math.sin(x * 0.013) * 2);
    rect(ctx, x, t - 1, 1, 1, '#4f8f3a');
    rect(ctx, x, t, 1, NEAR_H - t, C.grass);
    rect(ctx, x, t, 1, 1, C.grassLight);
    if (x % 5 === 0) rect(ctx, x, t - 2, 1, 2, C.grassShade);
  }
}

function makeNearWithBank(rand) {
  const canvas = makeNear(rand);
  const [out, ctx] = makeCanvas(canvas.width, NEAR_H);
  lawnBank(ctx, canvas.width);
  ctx.drawImage(canvas, 0, 0);
  hedge(ctx, canvas.width);
  return out;
}

function hedge(ctx, W) {
  // A low hedge along the back of the path
  for (let hx = 0; hx < W; hx++) {
    const h = 6 + Math.round(Math.sin(hx * 0.35) * 1.2 + Math.sin(hx * 0.11) * 1.5);
    rect(ctx, hx, NEAR_H - h - 1, 1, 1, OUTLINE);
    rect(ctx, hx, NEAR_H - h, 1, h, C.hedge);
    if (hx % 3 === 0) rect(ctx, hx, NEAR_H - h, 1, 1, C.hedgeLight);
  }
}

// ---------- The park path and the grass in front ----------

const BAND_TOP = 222;

function makeGround(rand) {
  const W = 960;
  const H = HEIGHT - BAND_TOP;
  const [canvas, ctx] = makeCanvas(W, H);
  // Grass verge behind the path
  rect(ctx, 0, 0, W, 4, C.grass);
  rect(ctx, 0, 0, W, 1, C.grassShade);
  // Stone edging, sandy path with pebbles, stone edging
  rect(ctx, 0, 4, W, 1, OUTLINE);
  rect(ctx, 0, 5, W, 1, C.pathEdge);
  rect(ctx, 0, 6, W, 18, C.path);
  rect(ctx, 0, 6, W, 1, C.pathLight);
  for (let x = 0; x < W; x += 12) rect(ctx, x, 5, 1, 1, '#8f8676');
  for (let i = 0; i < 220; i++) rect(ctx, Math.floor(rand() * W), 7 + Math.floor(rand() * 16), 1, 1, i % 3 ? C.pathShade : C.pathLight);
  for (let i = 0; i < 40; i++) {
    const px = Math.floor(rand() * W);
    const py = 8 + Math.floor(rand() * 13);
    rect(ctx, px, py, 2, 1, '#b8ad98');
    rect(ctx, px, py + 1, 2, 1, '#8f8676');
  }
  rect(ctx, 0, 23, W, 1, C.pathShade);
  rect(ctx, 0, 24, W, 1, C.pathEdge);
  rect(ctx, 0, 25, W, 1, OUTLINE);
  // Lawn with mowing stripes, clover and flowers
  rect(ctx, 0, 26, W, H - 26, C.grass);
  for (let x = 0; x < W; x += 32) rect(ctx, x, 26, 16, H - 26, C.grassLight);
  rect(ctx, 0, 26, W, 1, C.grassDeep);
  for (let i = 0; i < 260; i++) rect(ctx, Math.floor(rand() * W), 28 + Math.floor(rand() * (H - 29)), 1, 2, C.grassShade);
  for (let i = 0; i < 70; i++) {
    const fx = Math.floor(rand() * W);
    const fy = 30 + Math.floor(rand() * (H - 33));
    const color = FLOWERS[Math.floor(rand() * FLOWERS.length)];
    rect(ctx, fx - 1, fy, 3, 1, color);
    rect(ctx, fx, fy - 1, 1, 3, color);
    rect(ctx, fx, fy, 1, 1, '#ffe066');
  }
  return canvas;
}

// Tall grass and flowers right in front of us (moves faster than the path)
function makeFront(rand) {
  const W = 960;
  const H = 26;
  const [canvas, ctx] = makeCanvas(W, H);
  for (let x = 10; x < W - 20; x += 40 + Math.floor(rand() * 70)) {
    const n = 5 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
      const bx = x + i * 2 + Math.floor(rand() * 2);
      const bh = 8 + Math.floor(rand() * 14);
      const lean = rand() < 0.5 ? -1 : 1;
      for (let y = 0; y < bh; y++) {
        const ox = Math.round((y / bh) * (y / bh) * 3 * lean);
        rect(ctx, bx + ox, H - y, 1, 1, i % 2 ? C.grassDeep : '#4f9f42');
      }
    }
    if (rand() < 0.6) {
      // A daisy or a poppy on a long stalk
      const fx = x + Math.floor(n);
      const fh = 14 + Math.floor(rand() * 8);
      rect(ctx, fx, H - fh, 1, fh, C.grassDeep);
      const petal = rand() < 0.5 ? '#ffffff' : '#ff6b6b';
      rect(ctx, fx - 2, H - fh - 1, 5, 1, petal);
      rect(ctx, fx - 1, H - fh - 2, 3, 3, petal);
      rect(ctx, fx, H - fh - 3, 1, 5, petal);
      rect(ctx, fx, H - fh - 1, 1, 1, '#ffd166');
    }
  }
  return canvas;
}

// ---------- The giant runaway donut ----------

const DONUT_FRAMES = 16;

function makeDonutFrames() {
  const S = DONUT_SIZE;
  const c = S / 2;
  const R = c - 0.4; // outer edge
  const HOLE = 8.6;
  const rand = sceneryRandom(424242);
  // Sprinkles live on the icing: where (radius, angle), which way, which colour
  const sprinkles = [];
  for (let i = 0; i < 30; i++) {
    sprinkles.push({
      r: 11.5 + rand() * 7.5,
      a: rand() * Math.PI * 2,
      dir: rand() * Math.PI,
      color: ['#ffffff', '#ffe066', '#5ff2e8', '#7b6cff', '#52d273', '#ff6b6b'][i % 6],
    });
  }
  // Wobbly icing edge with a few drips
  const drips = [0.4, 1.5, 2.6, 3.9, 5.1].map((a) => a + rand() * 0.3);
  const icingEdge = (am) => {
    let e = 19.2 + 1.1 * Math.sin(am * 7) + 0.6 * Math.sin(am * 3 + 1);
    for (const d of drips) {
      let diff = Math.abs(((am - d + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff < 0.16) e += 3.2 * (1 - diff / 0.16);
    }
    return e;
  };

  const frames = [];
  for (let f = 0; f < DONUT_FRAMES; f++) {
    const spin = (f / DONUT_FRAMES) * Math.PI * 2;
    const [canvas, ctx] = makeCanvas(S, S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - c;
        const dy = y + 0.5 - c;
        const d = Math.hypot(dx, dy);
        if (d > R || d < HOLE) continue;
        const as = Math.atan2(dy, dx); // angle on screen (the light comes from the top left)
        const am = as - spin; // angle on the donut itself (turns as it rolls)
        const light = Math.cos(as + Math.PI * 0.75); // 1 = top left, -1 = bottom right
        let color;
        if (d > R - 1.2 || d < HOLE + 1.1) color = OUTLINE;
        else if (d > icingEdge(am)) {
          // Dough
          color = light > 0.45 ? '#f6c88a' : light < -0.35 ? '#b9773c' : '#e3a35e';
          if (d > R - 2.4 && light < 0) color = '#a8672f';
        } else if (d > icingEdge(am) - 1.1) color = '#d94a8c';
        else {
          // Pink icing with a shine on the top left
          color = light > 0.55 && d > 12 && d < 17 ? '#ffc2de' : light < -0.4 ? '#e8609f' : '#ff7eb6';
          if (d < HOLE + 2.2 && light > 0.2) color = '#e8609f'; // shadow inside the hole
        }
        rect(ctx, x, y, 1, 1, color);
      }
    }
    // Sprinkles: 2-pixel sticks that turn with the donut
    for (const s of sprinkles) {
      const a = s.a + spin;
      const px = Math.round(c + Math.cos(a) * s.r - 0.5);
      const py = Math.round(c + Math.sin(a) * s.r - 0.5);
      const am = s.a;
      if (s.r > icingEdge(am) - 1.6) continue;
      const turn = Math.round(((s.dir + spin) / Math.PI) * 4) % 4; // 0 flat, 1 diagonal, 2 upright, 3 other diagonal
      const [ox, oy] = [[1, 0], [1, 1], [0, 1], [-1, 1]][turn];
      rect(ctx, px, py, 1, 1, s.color);
      rect(ctx, px + ox, py + oy, 1, 1, s.color);
    }
    // A cheeky face that stays the right way up: angry eyebrows, eyes looking at the boy
    const face = [
      // angry eyebrows, sloping down toward the middle
      [14, 7, 3, 2, OUTLINE], [17, 8, 2, 2, OUTLINE], [19, 9, 3, 2, OUTLINE],
      [35, 7, 3, 2, OUTLINE], [33, 8, 2, 2, OUTLINE], [30, 9, 3, 2, OUTLINE],
      // eyes, looking right at the boy
      [15, 12, 7, 7, OUTLINE], [16, 13, 5, 5, '#ffffff'], [19, 14, 2, 3, OUTLINE],
      [29, 12, 7, 7, OUTLINE], [30, 13, 5, 5, '#ffffff'], [33, 14, 2, 3, OUTLINE],
      // grin with teeth
      [18, 37, 16, 1, OUTLINE], [17, 38, 18, 4, OUTLINE], [19, 42, 14, 1, OUTLINE],
      [19, 38, 14, 2, '#ffffff'], [22, 38, 1, 2, '#d8d0e8'], [26, 38, 1, 2, '#d8d0e8'], [30, 38, 1, 2, '#d8d0e8'],
      [21, 40, 10, 2, '#a8304a'], [23, 41, 6, 1, '#ff6b8a'],
    ];
    for (const [fx, fy, fw, fh, col] of face) rect(ctx, fx, fy, fw, fh, col);
    frames.push(canvas);
  }
  return frames;
}

// ---------- Putting it all together ----------

export function createParkHill() {
  const rand = sceneryRandom(1234567);
  const layers = {
    sky: makeSky(),
    clouds: makeClouds(rand),
    far: makeFar(rand),
    midA: makeMid(0),
    midB: makeMid(1),
    near: makeNearWithBank(rand),
    ground: makeGround(rand),
    front: makeFront(rand),
  };
  const donut = makeDonutFrames();

  return {
    drawBack(ctx, scroll, time) {
      ctx.drawImage(layers.sky, 0, 0);
      drawStrip(ctx, layers.clouds, scroll * 0.04 + time * 4, 0);
      for (const k of KITES) drawKite(ctx, k, scroll, time);
      drawStrip(ctx, layers.far, scroll * 0.1, 206 - layers.far.height);
      drawStrip(ctx, Math.floor(time * 3) % 2 ? layers.midB : layers.midA, scroll * 0.25, 214 - layers.midA.height);
      drawStrip(ctx, layers.near, scroll * 0.55, BAND_TOP - NEAR_H);
      drawStrip(ctx, layers.ground, scroll, BAND_TOP);
    },

    // Tall grass close to us
    drawFront(ctx, scroll) {
      drawStrip(ctx, layers.front, scroll * 1.25, HEIGHT - layers.front.height);
    },

    drawObstacle() {}, // nothing to dodge here: just the donut

    // The giant donut: (x, y) is the top left of its 52 x 52 box.
    // spin = how far it has rolled, in radians (clockwise, rolling right).
    drawDonut(ctx, x, y, time, spin) {
      const turn = ((spin / (Math.PI * 2)) % 1 + 1) % 1;
      const frame = donut[Math.floor(turn * DONUT_FRAMES) % DONUT_FRAMES];
      // A shadow on the path underneath
      const sx = Math.round(x) + 8;
      rect(ctx, sx, GROUND_Y - 1, DONUT_SIZE - 16, 2, C.pathShade);
      rect(ctx, sx + 4, GROUND_Y + 1, DONUT_SIZE - 24, 1, C.pathShade);
      // A little bounce as it thumps along
      const bounce = Math.abs(Math.sin(spin * 2)) > 0.92 ? -1 : 0;
      ctx.drawImage(frame, Math.round(x), Math.round(y) + bounce);
    },
  };
}
