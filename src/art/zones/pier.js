// zones/pier.js: Seaside Pier, a bright summer day by the sea.
//
// Layers (back to front): summer sky + sun and the sea (still) > fluffy
// clouds > the far coast: a lighthouse, a Ferris wheel, beach huts and a
// helter-skelter > sailboats out at sea > twinkling sparkles on the water >
// OUR pier: white railings with lamps and bunting, the wooden deck (wheels at
// y 234), the deck's edge, and iron legs standing in the waves.
// Every layer is drawn once into a long strip; each frame just copies them.
//
// Obstacles: WATER_GAP (a broken bit of pier: fall in = splash!) and GULLS.
// Also exports drawKite(), the kite he flies with while you hold the button.
import { WIDTH, HEIGHT, KIND } from '../../world.js';
import { mixHex, spriteFromMap } from '../palette.js';
import { makeCanvas, rect, box, circle, dither, sceneryRandom, OUTLINE } from '../pixel.js';
import { drawStrip } from '../strip.js';

const O = OUTLINE;
const HORIZON = 152; // where the sky meets the sea
const PIER_TOP = 188; // the pier strip starts here (lamp tops)
const RAIL_Y = 206; // top rail of the railing behind the deck
const DECK_Y = 222; // the deck: planks from here...
const EDGE_Y = 236; // ...then the deck's front edge beam...
const LEGS_Y = 244; // ...then the iron legs down into the sea
const WAVE_Y = 254; // the water line around the legs

const WOOD = { light: '#f0c58a', fill: '#d79f62', shade: '#a86f3e', dark: '#704324' };
const RAIL = { light: '#ffffff', fill: '#e9eef2', shade: '#aebcc9' };
const IRON = { light: '#5f7c9c', fill: '#3f5875', shade: '#2a3b52' };

const SKY = ['#2f86e0', '#4aa1ee', '#6cbaf5', '#94d2fb', '#c4ecff'];
const SEA = ['#1f78c2', '#2e8fd6', '#3aa1e2', '#349ad9', '#2a86c6', '#2273b2', '#1b5f98'];

function ramp(list, t) {
  const f = Math.min(0.999, Math.max(0, t)) * (list.length - 1);
  const i = Math.floor(f);
  return mixHex(list[i], list[i + 1], f - i);
}

// The sea's colour at a given height, in bands, so a gap in the pier can
// show exactly the same water as the background.
const SEA_BANDS = 12;
function seaBand(y) {
  const t = (y - HORIZON) / (HEIGHT - HORIZON);
  return Math.max(0, Math.min(SEA_BANDS - 1, Math.floor(t * SEA_BANDS)));
}
const SEA_COLORS = Array.from({ length: SEA_BANDS }, (_, i) => ramp(SEA, i / (SEA_BANDS - 1)));
function bandTop(i) {
  return HORIZON + Math.ceil((i * (HEIGHT - HORIZON)) / SEA_BANDS);
}

// Paints the plain sea between y0 and the bottom of the screen, x0..x1
function paintSea(ctx, x0, w, y0) {
  for (let i = seaBand(y0); i < SEA_BANDS; i++) {
    const top = Math.max(y0, bandTop(i));
    const bottom = i === SEA_BANDS - 1 ? HEIGHT : bandTop(i + 1);
    if (bottom > top) rect(ctx, x0, top, w, bottom - top, SEA_COLORS[i]);
    if (i > 0 && bandTop(i) >= y0) dither(ctx, x0, bandTop(i) - 1, w, 1, SEA_COLORS[i]);
  }
}

// ---------- Sky and sea ----------

function makeSkyAndSea() {
  const [canvas, ctx] = makeCanvas(WIDTH, HEIGHT);
  const bands = 10;
  const bandH = HORIZON / bands;
  const colors = [];
  for (let i = 0; i < bands; i++) colors.push(ramp(SKY, i / (bands - 1)));
  colors.forEach((c, i) => rect(ctx, 0, Math.floor(i * bandH), WIDTH, Math.ceil(bandH) + 1, c));
  for (let i = 1; i < bands; i++) dither(ctx, 0, Math.floor(i * bandH) - 1, WIDTH, 2, colors[i]);
  // The sun, with a ring of light and little rays
  const sx = 404;
  const sy = 74;
  circle(ctx, sx, sy, 17, '#bfe8ff');
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    for (let r = 20; r < 25; r++) rect(ctx, sx + Math.round(Math.cos(ang) * r), sy + Math.round(Math.sin(ang) * r), 1, 1, '#fff6c2');
  }
  circle(ctx, sx, sy, 14, '#ffd84a');
  circle(ctx, sx - 1, sy - 1, 12, '#ffe777');
  circle(ctx, sx - 4, sy - 4, 5, '#fff6c2');
  // The sea
  paintSea(ctx, 0, WIDTH, HORIZON);
  rect(ctx, 0, HORIZON, WIDTH, 1, '#1b5f98');
  // The sun's glitter path on the water
  for (let y = HORIZON + 2; y < 200; y += 3) {
    const half = 4 + Math.floor((y - HORIZON) / 6);
    for (let x = sx - half; x < sx + half; x += 5 + ((y * 3) % 4)) rect(ctx, x + ((y * 7) % 3), y, 2, 1, '#bfe8ff');
  }
  return canvas;
}

function cloud(ctx, x, y, w) {
  const h = Math.max(8, Math.floor(w / 4));
  // Puffs: an outline pass, then white, then a blue-grey shade underneath
  const puffs = [
    [0.18, 0.55, 0.3],
    [0.42, 0.35, 0.42],
    [0.66, 0.5, 0.32],
    [0.84, 0.65, 0.22],
  ];
  for (const pass of [0, 1]) {
    for (const [px, py, pr] of puffs) {
      const r = Math.round(w * pr * 0.5) + (pass === 0 ? 1 : 0);
      circle(ctx, x + Math.round(w * px), y + Math.round(h * py), r, pass === 0 ? '#5ea7e0' : '#ffffff');
    }
    rect(ctx, x + 2 - (pass === 0 ? 1 : 0), y + h - 2, w - 4 + (pass === 0 ? 2 : 0), 3 + (pass === 0 ? 1 : 0), pass === 0 ? '#5ea7e0' : '#ffffff');
  }
  rect(ctx, x + 3, y + h - 1, w - 6, 2, '#d5e9f7');
  dither(ctx, x + 4, y + h - 3, w - 8, 2, '#d5e9f7');
}

function makeClouds(rand) {
  const [canvas, ctx] = makeCanvas(1100, 150);
  for (let x = 10; x < 1000; x += 170 + Math.floor(rand() * 140)) {
    cloud(ctx, x, 60 + Math.floor(rand() * 60), 44 + Math.floor(rand() * 40));
  }
  // Far-away gulls: little 'v' shapes
  for (let i = 0; i < 9; i++) {
    const gx = Math.floor(rand() * 1080);
    const gy = 40 + Math.floor(rand() * 70);
    rect(ctx, gx, gy, 1, 1, '#2a3b52');
    rect(ctx, gx + 1, gy + 1, 1, 1, '#2a3b52');
    rect(ctx, gx + 2, gy, 1, 1, '#2a3b52');
  }
  return canvas;
}

// ---------- The far coast ----------

function lighthouse(ctx, x, base) {
  // Rocky headland
  for (let i = 0; i < 46; i++) {
    const h = Math.round(10 + Math.sin(i * 0.18) * 6 + (i % 5 === 0 ? 2 : 0));
    rect(ctx, x - 10 + i, base - h, 1, h, i % 7 < 3 ? '#5c7a5a' : '#6f8f68');
  }
  rect(ctx, x - 10, base - 2, 46, 2, '#4d6a55');
  // Tower: red and white stripes, getting thinner at the top
  const top = base - 64;
  for (let y = top; y < base - 12; y++) {
    const t = (y - top) / 52;
    const half = Math.round(4 + t * 3);
    const stripe = Math.floor((y - top) / 8) % 2 === 0;
    rect(ctx, x + 12 - half - 1, y, half * 2 + 2, 1, O);
    rect(ctx, x + 12 - half, y, half * 2, 1, stripe ? '#e64b4b' : '#f5f2ee');
    rect(ctx, x + 12 + half - 2, y, 2, 1, stripe ? '#b03440' : '#c9c3cf');
  }
  // Gallery, lamp room and roof
  rect(ctx, x + 5, top - 2, 15, 3, O);
  rect(ctx, x + 6, top - 1, 13, 1, '#3b4a63');
  rect(ctx, x + 7, top - 8, 11, 6, O);
  rect(ctx, x + 8, top - 7, 9, 4, '#fff6a8');
  rect(ctx, x + 10, top - 7, 2, 4, '#ffd84a');
  rect(ctx, x + 7, top - 11, 11, 3, O);
  rect(ctx, x + 9, top - 13, 7, 2, O);
  rect(ctx, x + 8, top - 10, 9, 1, '#e64b4b');
  rect(ctx, x + 12, top - 15, 1, 2, O);
  rect(ctx, x + 11, base - 22, 3, 5, O); // door
}

function ferrisWheel(ctx, cx, cy, r, base) {
  // Legs
  for (let y = cy; y < base; y++) {
    const s = Math.round(((y - cy) / (base - cy)) * 14);
    rect(ctx, cx - s - 1, y, 2, 1, '#6d6a8a');
    rect(ctx, cx + s, y, 2, 1, '#6d6a8a');
  }
  // Rim and spokes
  for (let a = 0; a < 360; a += 2) {
    const ang = (a * Math.PI) / 180;
    rect(ctx, cx + Math.round(Math.cos(ang) * r), cy + Math.round(Math.sin(ang) * r), 1, 1, '#f5f2ee');
    rect(ctx, cx + Math.round(Math.cos(ang) * (r - 3)), cy + Math.round(Math.sin(ang) * (r - 3)), 1, 1, '#c9c3cf');
  }
  const cabins = ['#e64b4b', '#ffd84a', '#4fc3f7', '#7bd389', '#ff8ad8', '#ff9f43'];
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    for (let k = 2; k < r; k += 2) rect(ctx, cx + Math.round(Math.cos(ang) * k), cy + Math.round(Math.sin(ang) * k), 1, 1, '#c9c3cf');
    const bx = cx + Math.round(Math.cos(ang) * r);
    const by = cy + Math.round(Math.sin(ang) * r);
    rect(ctx, bx - 2, by, 5, 5, O);
    rect(ctx, bx - 1, by + 1, 3, 3, cabins[i % cabins.length]);
  }
  circle(ctx, cx, cy, 2, O);
  rect(ctx, cx, cy, 1, 1, '#ffd84a');
}

function helterSkelter(ctx, x, base) {
  const top = base - 28;
  for (let y = top; y < base; y++) {
    const half = Math.round(1 + ((y - top) / 28) * 4);
    rect(ctx, x - half - 1, y, half * 2 + 2, 1, O);
    rect(ctx, x - half, y, half * 2, 1, Math.floor((y - top + 2) / 5) % 2 ? '#ffd84a' : '#e64b4b');
  }
  rect(ctx, x, top - 5, 1, 5, O);
  rect(ctx, x + 1, top - 5, 3, 2, '#4fc3f7');
}

function makeCoast(rand) {
  const W = 1300;
  const H = 90;
  const [canvas, ctx] = makeCanvas(W, H);
  const base = H; // sits on the horizon
  // A low green-and-sand coastline all along
  for (let x = 0; x < W; x++) {
    const h = Math.round(9 + Math.sin(x * 0.02) * 3 + Math.sin(x * 0.07) * 1.5);
    rect(ctx, x, base - h, 1, h - 3, x % 9 < 5 ? '#7fae6e' : '#8cbc79');
    rect(ctx, x, base - 3, 1, 3, '#f0d79a');
  }
  const hutColors = ['#e64b4b', '#4fc3f7', '#ffd84a', '#7bd389', '#ff8ad8', '#ff9f43'];
  const huts = (from, to) => {
    for (let x = from; x < to; x += 9) {
      const c = hutColors[Math.floor(rand() * hutColors.length)];
      rect(ctx, x, base - 13, 7, 10, O);
      rect(ctx, x + 1, base - 11, 5, 8, c);
      rect(ctx, x + 2, base - 11, 1, 8, '#ffffff');
      rect(ctx, x + 4, base - 11, 1, 8, '#ffffff');
      rect(ctx, x + 1, base - 14, 5, 1, O);
      rect(ctx, x + 2, base - 15, 3, 1, O);
    }
  };
  const houses = (from, to) => {
    for (let x = from; x < to; x += 14) {
      const h = 14 + Math.floor(rand() * 10);
      const c = ['#f5f2ee', '#ffe9b0', '#cde9ff', '#ffd1dc'][Math.floor(rand() * 4)];
      rect(ctx, x, base - 3 - h, 12, h, O);
      rect(ctx, x + 1, base - 2 - h, 10, h - 1, c);
      rect(ctx, x, base - 5 - h, 12, 2, '#c45a4a');
      for (let wy = base - h; wy < base - 6; wy += 5) rect(ctx, x + 3, wy, 2, 2, '#3b6fa0');
    }
  };
  huts(30, 250);
  ferrisWheel(ctx, 320, base - 44, 30, base - 3);
  helterSkelter(ctx, 380, base - 3);
  houses(410, 560);
  huts(780, 960);
  houses(1000, 1160);
  ferrisWheel(ctx, 1220, base - 36, 24, base - 3);
  lighthouse(ctx, 640, base);
  return canvas;
}

// ---------- Sailboats ----------

function sailboat(ctx, x, y, sail) {
  rect(ctx, x, y + 10, 16, 3, O);
  rect(ctx, x + 1, y + 10, 14, 1, '#f5f2ee');
  rect(ctx, x + 2, y + 13, 12, 1, O);
  rect(ctx, x + 7, y - 2, 1, 12, O);
  for (let r = 0; r < 10; r++) {
    const w = Math.round(r * 0.7);
    rect(ctx, x + 8, y + r, w + 1, 1, O);
    if (w > 0) rect(ctx, x + 8, y + r, w, 1, sail);
  }
  for (let r = 3; r < 10; r++) rect(ctx, x + 6 - Math.round((r - 3) * 0.6), y + r, Math.round((r - 3) * 0.6) + 1, 1, '#f5f2ee');
  rect(ctx, x + 7, y - 3, 3, 1, '#e64b4b');
}

function makeBoats(rand) {
  const W = 1500;
  const [canvas, ctx] = makeCanvas(W, 40);
  const sails = ['#e64b4b', '#ffd84a', '#ff8ad8', '#f5f2ee'];
  for (let x = 60; x < W - 40; x += 110 + Math.floor(rand() * 140)) {
    const y = 6 + Math.floor(rand() * 16);
    sailboat(ctx, x, y, sails[Math.floor(rand() * sails.length)]);
  }
  return canvas;
}

// Twinkling sparkles on the water. Nearer water (lower down) moves faster.
// x0..x1 limits where they're drawn, so a gap in the pier can use it too.
function seaSparkles(ctx, scroll, time, x0, x1, y0) {
  for (let i = 0; i < 46; i++) {
    const y = HORIZON + 4 + ((i * 37) % (HEIGHT - HORIZON - 6));
    if (y < y0) continue;
    const depth = (y - HORIZON) / (HEIGHT - HORIZON);
    const span = 560;
    const x = Math.round(((((i * 97) % span) - scroll * (0.15 + depth * 0.6)) % span + span) % span) - 40;
    if (x < x0 || x + 3 > x1) continue;
    const phase = (time * 2.2 + i * 0.37) % 2;
    if (phase < 0.6) {
      rect(ctx, x, y, 3, 1, '#ffffff');
      rect(ctx, x + 1, y - 1, 1, 3, '#ffffff');
    } else if (phase < 1.2) rect(ctx, x, y, 2, 1, '#bfe8ff');
    else if (y > 200) rect(ctx, x - 2, y, 5, 1, '#5fb6ec'); // a little wave
  }
}

// ---------- The pier ----------

function makePier(rand) {
  const W = 960;
  const [canvas, ctx] = makeCanvas(W, HEIGHT - PIER_TOP);
  const y = (v) => v - PIER_TOP;
  // Iron legs and cross-bracing, standing in the sea
  for (let x = 6; x < W; x += 48) {
    rect(ctx, x, y(LEGS_Y), 6, HEIGHT - LEGS_Y, O);
    rect(ctx, x + 1, y(LEGS_Y), 4, HEIGHT - LEGS_Y, IRON.fill);
    rect(ctx, x + 1, y(LEGS_Y), 1, HEIGHT - LEGS_Y, IRON.light);
    rect(ctx, x + 4, y(LEGS_Y), 1, HEIGHT - LEGS_Y, IRON.shade);
    // Barnacles and green weed near the water line
    rect(ctx, x + 1, y(WAVE_Y - 2), 4, 3, '#4f8a5e');
    rect(ctx, x + 2, y(WAVE_Y + 2), 2, 1, '#cfd8c9');
    // An X brace to the next leg
    for (let i = 0; i < 42; i++) {
      const t = i / 42;
      rect(ctx, x + 6 + i, y(LEGS_Y + 1) + Math.round(t * 9), 1, 2, IRON.shade);
      rect(ctx, x + 6 + i, y(LEGS_Y + 10) - Math.round(t * 9), 1, 2, IRON.shade);
    }
  }
  rect(ctx, 0, y(LEGS_Y), W, 2, IRON.shade);
  // The deck's front edge beam, with bolts
  rect(ctx, 0, y(EDGE_Y), W, LEGS_Y - EDGE_Y, O);
  rect(ctx, 0, y(EDGE_Y + 1), W, LEGS_Y - EDGE_Y - 2, WOOD.shade);
  rect(ctx, 0, y(EDGE_Y + 1), W, 1, WOOD.fill);
  for (let x = 4; x < W; x += 16) rect(ctx, x, y(EDGE_Y + 3), 2, 2, IRON.fill);
  for (let x = 12; x < W; x += 48) rect(ctx, x, y(EDGE_Y + 2), 1, 5, WOOD.dark);
  // The deck: long planks seen from the side, with gaps between them and nails
  rect(ctx, 0, y(DECK_Y), W, EDGE_Y - DECK_Y, WOOD.fill);
  rect(ctx, 0, y(DECK_Y), W, 1, O);
  rect(ctx, 0, y(DECK_Y + 1), W, 1, WOOD.light);
  for (const ry of [DECK_Y + 5, DECK_Y + 9]) rect(ctx, 0, y(ry), W, 1, WOOD.shade);
  rect(ctx, 0, y(EDGE_Y - 1), W, 1, WOOD.shade);
  for (let row = 0; row < 3; row++) {
    const top = DECK_Y + 1 + row * 4;
    for (let x = (row * 13) % 37; x < W; x += 30 + Math.floor(rand() * 18)) {
      rect(ctx, x, y(top), 1, 4, WOOD.dark);
      rect(ctx, x + 2, y(top + 1), 1, 1, '#8c7e70');
      // Some planks are a little darker (older wood)
      if (rand() < 0.3) dither(ctx, x + 1, y(top + 1), 14, 3, WOOD.shade);
    }
  }
  // Railing behind the deck: white posts, a top rail and a middle rail
  for (let x = 0; x < W; x += 12) {
    rect(ctx, x, y(RAIL_Y), 3, DECK_Y - RAIL_Y, O);
    rect(ctx, x + 1, y(RAIL_Y + 1), 1, DECK_Y - RAIL_Y - 1, RAIL.fill);
  }
  for (const ry of [RAIL_Y, RAIL_Y + 8]) {
    rect(ctx, 0, y(ry), W, 3, O);
    rect(ctx, 0, y(ry + 1), W, 1, RAIL.light);
  }
  // Lamp posts with glass globes, and bunting strung between them
  const flags = ['#e64b4b', '#ffd84a', '#4fc3f7', '#7bd389', '#ff8ad8'];
  for (let x = 30; x < W; x += 96) {
    rect(ctx, x, y(PIER_TOP + 7), 4, RAIL_Y - PIER_TOP - 7, O);
    rect(ctx, x + 1, y(PIER_TOP + 8), 2, RAIL_Y - PIER_TOP - 8, '#3b4a63');
    rect(ctx, x - 1, y(PIER_TOP + 6), 6, 2, O);
    circle(ctx, x + 2, y(PIER_TOP + 3), 3, O);
    circle(ctx, x + 2, y(PIER_TOP + 3), 2, '#fff6c2');
    rect(ctx, x + 1, y(PIER_TOP + 2), 1, 1, '#ffffff');
    // Bunting to the next lamp: a sagging string with little flags
    for (let i = 6; i < 92; i++) {
      const sag = Math.round(Math.sin((i / 96) * Math.PI) * 9);
      const by = y(PIER_TOP + 7) + sag;
      rect(ctx, x + i, by, 1, 1, '#5a4a6a');
      if (i % 8 === 2) {
        const c = flags[(i / 8 + x) % flags.length | 0];
        rect(ctx, x + i - 1, by + 1, 5, 1, O);
        rect(ctx, x + i, by + 1, 3, 2, c);
        rect(ctx, x + i + 1, by + 3, 1, 1, c);
        rect(ctx, x + i - 1, by + 2, 1, 1, O);
        rect(ctx, x + i + 3, by + 2, 1, 1, O);
        rect(ctx, x + i, by + 3, 1, 1, O);
        rect(ctx, x + i + 2, by + 3, 1, 1, O);
        rect(ctx, x + i + 1, by + 4, 1, 1, O);
      }
    }
  }
  // Now and then a lifebuoy hangs on the railing
  for (let x = 70; x < W; x += 192) {
    circle(ctx, x + 4, y(RAIL_Y + 8), 5, O);
    circle(ctx, x + 4, y(RAIL_Y + 8), 4, '#f56a3a');
    for (const [dx, dy] of [[-4, 0], [3, 0], [0, -4], [0, 3]]) rect(ctx, x + 4 + dx, y(RAIL_Y + 8) + dy, 2, 2, '#ffffff');
    circle(ctx, x + 4, y(RAIL_Y + 8), 2, O);
    rect(ctx, x + 4, y(RAIL_Y + 8), 1, 1, '#2e8fd6');
  }
  return canvas;
}

// Foam around the legs and little waves along the water line (animated)
function drawWaves(ctx, scroll, time, x0, x1) {
  const off = ((scroll % 48) + 48) % 48;
  for (let lx = 6 - off - 48; lx < x1; lx += 48) {
    const x = Math.round(lx);
    if (x + 10 < x0 || x - 3 > x1) continue;
    const bob = Math.floor(time * 4 + lx * 0.1) % 2;
    rect(ctx, Math.max(x0, x - 2), WAVE_Y + bob, 10, 1, '#ffffff');
    rect(ctx, Math.max(x0, x - 1), WAVE_Y + 1 + bob, 8, 1, '#bfe8ff');
  }
  for (let i = 0; i < 16; i++) {
    const x = Math.round((((i * 61 - scroll * 0.9 + time * 12) % 520) + 520) % 520) - 20;
    if (x < x0 || x + 6 > x1) continue;
    const yy = WAVE_Y + 3 + ((i * 5) % 12);
    rect(ctx, x, yy, 6, 1, '#6fc4f2');
    rect(ctx, x + 1, yy - 1, 3, 1, '#d6f1ff');
  }
}

// ---------- Obstacles ----------

// A broken bit of pier: the planks have fallen into the sea
function drawGap(ctx, o, scroll, time) {
  const x0 = o.x;
  const w = o.w;
  const top = PIER_TOP + 2;
  paintSea(ctx, x0, w, top);
  seaSparkles(ctx, scroll, time, x0, x0 + w, top);
  // Waves and a splashy wash right under the gap
  for (let i = 0; i < w; i += 7) {
    const bob = Math.floor(time * 5 + i * 0.3) % 3;
    rect(ctx, x0 + i, WAVE_Y + bob, 4, 1, '#d6f1ff');
  }
  drawWaves(ctx, scroll, time, x0, x0 + w);
  // A floating broken plank bobbing in the water
  const fx = x0 + Math.floor(w * 0.55);
  const fb = Math.round(Math.sin(time * 3) * 1.5);
  rect(ctx, fx, WAVE_Y - 2 + fb, 18, 4, O);
  rect(ctx, fx + 1, WAVE_Y - 1 + fb, 16, 2, WOOD.fill);
  rect(ctx, fx + 1, WAVE_Y - 1 + fb, 16, 1, WOOD.light);
  rect(ctx, fx + 5, WAVE_Y - 1 + fb, 1, 1, '#8c7e70');

  // Broken ends: jagged planks sticking out over the water on both sides
  const jag = [5, 2, 7, 3, 4];
  for (const side of [0, 1]) {
    const ex = side === 0 ? x0 : x0 + w;
    const dir = side === 0 ? 1 : -1;
    for (let r = 0; r < 3; r++) {
      const len = jag[(r + side * 2) % jag.length];
      const top2 = DECK_Y + 1 + r * 4;
      const sx = side === 0 ? ex : ex - len;
      rect(ctx, sx, top2 - (r === 0 ? 1 : 0), len, 4 + (r === 0 ? 1 : 0), O);
      rect(ctx, sx + (side === 0 ? 0 : 1), top2, len - 1, 3, r === 1 ? WOOD.shade : WOOD.fill);
      // splintered tip
      rect(ctx, ex + dir * (len - 1) - (side === 0 ? 0 : 1), top2 + 1, 1, 1, WOOD.light);
    }
    // The edge beam snapped off
    const bx = side === 0 ? ex : ex - 3;
    rect(ctx, bx, EDGE_Y, 3, LEGS_Y - EDGE_Y, O);
    rect(ctx, bx + (side === 0 ? 0 : 1), EDGE_Y + 1, 2, LEGS_Y - EDGE_Y - 2, WOOD.shade);
    // The last leg standing at each end
    const lx = side === 0 ? ex : ex - 6;
    rect(ctx, lx, LEGS_Y, 6, HEIGHT - LEGS_Y, O);
    rect(ctx, lx + 1, LEGS_Y, 4, HEIGHT - LEGS_Y, IRON.fill);
    rect(ctx, lx + 1, LEGS_Y, 1, HEIGHT - LEGS_Y, IRON.light);
    rect(ctx, lx + 1, WAVE_Y - 2, 4, 3, '#4f8a5e');
    // The railing ends in a broken post
    const px = side === 0 ? ex : ex - 3;
    rect(ctx, px, RAIL_Y - 2, 3, DECK_Y - RAIL_Y + 2, O);
    rect(ctx, px + 1, RAIL_Y - 1, 1, DECK_Y - RAIL_Y, RAIL.fill);
    const rl = 6;
    rect(ctx, side === 0 ? ex : ex - rl, RAIL_Y, rl, 3, O);
    rect(ctx, side === 0 ? ex : ex - rl, RAIL_Y + 1, rl - 1, 1, RAIL.light);
  }
  // A warning sign on the near end, wobbling in the wind
  const wob = Math.floor(time * 2) % 2;
  const sx = x0 + 2;
  const sy = RAIL_Y - 20;
  rect(ctx, sx + 6, sy + 12, 2, 10, O);
  for (let r = 0; r < 12; r++) {
    const half = Math.floor(r / 2) + 1;
    rect(ctx, sx + 7 - half - 1 + wob, sy + r, half * 2 + 2, 1, O);
    if (r > 0 && r < 11) rect(ctx, sx + 7 - half + wob, sy + r, half * 2, 1, '#ffd84a');
  }
  rect(ctx, sx + 6 + wob, sy + 4, 2, 4, O);
  rect(ctx, sx + 6 + wob, sy + 9, 2, 1, O);
}

const GULL_FRAMES = [
  [
    'k..........k',
    'oG........Go',
    '.oGG....GGo.',
    '..oGWWWWGo..',
    '.ooWWWWWWWo.',
    'YoWWWWWWWWoo',
    '.oooooooooo.',
  ],
  [
    '............',
    '............',
    'kooo....oook',
    'oGGGWWWWGGGo',
    '.ooWWWWWWWo.',
    'YoWWWWWWWWoo',
    '.oooooooooo.',
  ],
  [
    '............',
    '............',
    '...oooooo...',
    '..oWWWWWWo..',
    '.ooWWWWWWWo.',
    'YoGGWWWWGGoo',
    'oGo......oGo',
    'k..........k',
  ],
];
const GULL_LEGEND = { o: O, W: '#ffffff', G: '#a9b8c8', k: '#1a1626', Y: '#ff9f2a' };

export function createPier() {
  const rand = sceneryRandom(8088);
  const layers = {
    sky: makeSkyAndSea(),
    clouds: makeClouds(rand),
    coast: makeCoast(rand),
    boats: makeBoats(rand),
    pier: makePier(rand),
  };
  const gulls = GULL_FRAMES.map((rows) => spriteFromMap(rows, GULL_LEGEND));
  let lastScroll = 0;

  return {
    drawBack(ctx, scroll, time) {
      lastScroll = scroll;
      ctx.drawImage(layers.sky, 0, 0);
      drawStrip(ctx, layers.clouds, scroll * 0.04 + time * 3, 0);
      drawStrip(ctx, layers.coast, scroll * 0.1, HORIZON - layers.coast.height);
      drawStrip(ctx, layers.boats, scroll * 0.18 + time * 4, HORIZON + 2);
      seaSparkles(ctx, scroll, time, -10, WIDTH + 10, HORIZON);
      drawStrip(ctx, layers.pier, scroll, PIER_TOP);
      drawWaves(ctx, scroll, time, -10, WIDTH + 10);
    },

    drawObstacle(ctx, o, time) {
      if (o.kind === KIND.WATER_GAP) {
        drawGap(ctx, o, lastScroll, time);
      } else if (o.kind === KIND.GULLS) {
        const spots = [[0, 6], [14, 5], [7, 0]];
        spots.forEach(([dx, dy], i) => {
          const f = Math.floor(time * 7 + i * 1.3) % 4;
          const frame = gulls[f === 3 ? 1 : f];
          const bob = f === 0 ? 0 : 1;
          ctx.drawImage(frame, o.x + dx, o.y + dy + bob - 1);
        });
      }
    },
  };
}

// ---------- The kite ----------

const KITE_COLORS = ['#e64b4b', '#ffd84a', '#4fc3f7', '#7bd389'];

// His kite, centred at kiteX,kiteY, on a string to his hand. A diamond in
// four colours with a fluttering tail of bows.
export function drawKite(ctx, handX, handY, kiteX, kiteY, time) {
  const kx = Math.round(kiteX);
  const ky = Math.round(kiteY);
  const hx = Math.round(handX);
  const hy = Math.round(handY);
  // The string: a straight-ish line with a little sag, one pixel at a time
  const bx = kx;
  const by = ky + 4; // where the string ties on
  const dx = hx - bx;
  const dy = hy - by;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const sag = Math.min(10, Math.hypot(dx, dy) * 0.07);
  let px = null;
  let py = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(bx + dx * t);
    const y = Math.round(by + dy * t + Math.sin(t * Math.PI) * sag);
    if (x !== px || y !== py) rect(ctx, x, y, 1, 1, '#f5f2ee');
    px = x;
    py = y;
  }

  // The tail streams out behind (to the left) and flutters
  for (let i = 1; i <= 22; i++) {
    const wave = Math.round(Math.sin(time * 9 - i * 0.55) * Math.min(3, i * 0.25));
    const nx = kx - Math.round(i * 0.8);
    const ny = ky + 11 + i + wave;
    rect(ctx, nx, ny, 1, 1, O);
    if (i % 6 === 0) {
      // A little bow tie
      const c = KITE_COLORS[(i / 6) % 4];
      const flap = Math.floor(time * 10 + i) % 2;
      rect(ctx, nx - 3, ny - 1 + flap, 1, 3 - flap, O);
      rect(ctx, nx + 3, ny - 1 + flap, 1, 3 - flap, O);
      rect(ctx, nx - 2, ny - 1 + flap, 2, 3 - flap, c);
      rect(ctx, nx + 1, ny - 1 + flap, 2, 3 - flap, c);
      rect(ctx, nx, ny, 1, 1, O);
    }
  }

  // The diamond: outline, four coloured quarters, a highlight, and the spars
  const H = 11; // half height
  const Wd = 8; // half width at the widest point (a third of the way down)
  const mid = -3;
  const halfAt = (r) => (r <= mid ? Math.round((Wd * (r + H)) / (mid + H)) : Math.round((Wd * (H - r)) / (H - mid)));
  for (let r = -H - 1; r <= H + 1; r++) {
    const half = r < -H || r > H ? 0 : halfAt(r) + 1;
    rect(ctx, kx - half, ky + r, half * 2 + 1, 1, O);
  }
  for (let r = -H + 1; r <= H - 1; r++) {
    const half = halfAt(r);
    if (half <= 0) continue;
    const top = r <= mid;
    rect(ctx, kx - half + 1, ky + r, half - 1, 1, KITE_COLORS[top ? 0 : 2]);
    rect(ctx, kx + 1, ky + r, half - 1, 1, KITE_COLORS[top ? 1 : 3]);
  }
  // Highlights on the upper quarters
  rect(ctx, kx - 3, ky - 6, 2, 1, '#ff9a8f');
  rect(ctx, kx + 2, ky - 6, 2, 1, '#fff1a8');
  // The spars (a cross of thin sticks)
  rect(ctx, kx, ky - H, 1, H * 2, '#704324');
  rect(ctx, kx - Wd + 1, ky + mid, Wd * 2 - 1, 1, '#704324');
  // A little smiley face, because kites are happy
  rect(ctx, kx - 3, ky + 1, 1, 1, O);
  rect(ctx, kx + 3, ky + 1, 1, 1, O);
  rect(ctx, kx - 2, ky + 4, 5, 1, O);
  rect(ctx, kx - 3, ky + 3, 1, 1, O);
  rect(ctx, kx + 3, ky + 3, 1, 1, O);
}
