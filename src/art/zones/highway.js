// zones/highway.js: the Highway, a city flyover at dusk turning into night.
//
// Layers (back to front): dusk sky + moon + stars (still) > thin clouds >
// far skyline > towers with lit windows and a lower road full of light trails >
// street lights and overhead gantry signs > OUR road: a crash barrier, the
// back lane (wheels at y 220), a dashed lane line, the front lane (wheels at
// y 234), the kerb, and the side of the flyover.
// Every layer is drawn once into a long strip; each frame just copies them.
//
// Obstacles: STALLED_CAR, ROADWORK and POTHOLE, on either lane.
import { WIDTH, HEIGHT, KIND } from '../../world.js';
import { mixHex } from '../palette.js';
import { makeCanvas, rect, box, circle, dither, pixelText, sceneryRandom, OUTLINE } from '../pixel.js';
import { drawStrip } from '../strip.js';

const O = OUTLINE;
const ROAD_TOP = 200; // top of the road strip (the crash barrier starts here)
const BARRIER_Y = 206; // the steel crash barrier at the back of the road
const BACK_LANE = 213; // back lane asphalt starts here (its wheel line is 220)
const LANE_LINE = 227; // the dashed white line between the lanes
const EDGE_LINE = 240; // solid white edge line (front lane wheel line is 234)
const KERB_Y = 242;

const SKY = ['#120f2e', '#1d1846', '#2f2160', '#4b2a73', '#71327c', '#9c3f7d', '#c85a78', '#e98374'];

function skyColor(t) {
  const f = Math.min(0.999, Math.max(0, t)) * (SKY.length - 1);
  const i = Math.floor(f);
  return mixHex(SKY[i], SKY[i + 1], f - i);
}

// ---------- Sky: deep blue at the top, sunset glow at the horizon, a moon, stars ----------

function makeSky(rand) {
  const [canvas, ctx] = makeCanvas(WIDTH, HEIGHT);
  const bottom = 200;
  const bands = 14;
  const bandH = bottom / bands;
  const colors = [];
  for (let i = 0; i < bands; i++) colors.push(skyColor(i / (bands - 1)));
  colors.forEach((c, i) => rect(ctx, 0, Math.floor(i * bandH), WIDTH, Math.ceil(bandH) + 1, c));
  rect(ctx, 0, bottom, WIDTH, HEIGHT - bottom, colors[bands - 1]);
  for (let i = 1; i < bands; i++) dither(ctx, 0, Math.floor(i * bandH) - 1, WIDTH, 2, colors[i]);
  // Stars, only up where it's dark
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rand() * WIDTH);
    const y = Math.floor(rand() * 90);
    rect(ctx, x, y, 1, 1, rand() < 0.3 ? '#ffffff' : '#9a95d6');
  }
  // A big pale moon with craters
  const mx = 92;
  const my = 70;
  circle(ctx, mx, my, 15, '#3b3473');
  circle(ctx, mx, my, 13, '#e8e4f7');
  circle(ctx, mx + 3, my + 2, 12, '#cfc8ec');
  circle(ctx, mx - 2, my - 2, 11, '#f5f2ff');
  circle(ctx, mx + 4, my + 4, 2, '#c2badf');
  circle(ctx, mx - 5, my + 3, 1, '#c2badf');
  rect(ctx, mx + 1, my - 6, 2, 2, '#d8d1f0');
  return canvas;
}

function makeClouds(rand) {
  const [canvas, ctx] = makeCanvas(960, 120);
  for (let x = 20; x < 900; x += 140 + Math.floor(rand() * 160)) {
    const y = 40 + Math.floor(rand() * 70);
    const w = 50 + Math.floor(rand() * 70);
    rect(ctx, x, y, w, 2, '#5b3478');
    rect(ctx, x + 8, y - 2, w - 22, 2, '#7a4185');
    rect(ctx, x + 14, y - 3, w - 40, 1, '#a35587');
    rect(ctx, x + 4, y + 2, w - 10, 1, '#432a66');
  }
  return canvas;
}

// ---------- Far skyline: flat silhouettes with a few lit windows ----------

function makeFar(rand) {
  const W = 960;
  const H = 120;
  const [canvas, ctx] = makeCanvas(W, H);
  let x = 0;
  while (x < W) {
    const w = 14 + Math.floor(rand() * 30);
    const h = 30 + Math.floor(rand() * 85);
    rect(ctx, x, H - h, w, h, '#3a2766');
    rect(ctx, x, H - h, w, 1, '#4c3480');
    if (rand() < 0.3) rect(ctx, x + Math.floor(w / 2), H - h - 10, 1, 10, '#3a2766');
    if (rand() < 0.15) rect(ctx, x + Math.floor(w / 2), H - h - 11, 1, 1, '#ff4d6d');
    for (let wy = H - h + 4; wy < H - 3; wy += 5) {
      for (let wx = x + 2; wx < x + w - 2; wx += 3) {
        if (rand() < 0.1) rect(ctx, wx, wy, 1, 2, '#c08bd6');
      }
    }
    x += w + (rand() < 0.2 ? 3 : 0);
  }
  return canvas;
}

// ---------- Mid towers, and a lower road with light trails ----------

function makeMid(rand) {
  const W = 1200;
  const H = 150;
  const [canvas, ctx] = makeCanvas(W, H);
  let x = 0;
  while (x < W - 20) {
    const w = 26 + Math.floor(rand() * 40);
    const h = 60 + Math.floor(rand() * 85);
    const top = H - h;
    box(ctx, x, top, w, h + 1, { fill: '#241a44', light: '#32265a', shade: '#1a1334' });
    const lit = 0.25 + rand() * 0.35;
    const warm = rand() < 0.6;
    for (let wy = top + 6; wy < H - 6; wy += 7) {
      for (let wx = x + 4; wx < x + w - 5; wx += 6) {
        if (rand() < lit) {
          rect(ctx, wx, wy, 3, 4, warm ? '#ffcf6b' : '#8fe3ff');
          rect(ctx, wx, wy, 3, 1, warm ? '#fff0b8' : '#d6f6ff');
        } else rect(ctx, wx, wy, 3, 4, '#1a1334');
      }
    }
    // Rooftop beacons and logos
    if (rand() < 0.35) {
      rect(ctx, x + Math.floor(w / 2), top - 6, 1, 6, O);
      rect(ctx, x + Math.floor(w / 2) - 1, top - 8, 3, 2, '#ff4d6d');
    }
    x += w + Math.floor(rand() * 6);
  }
  return canvas;
}

// A lower road far behind: just its edge, lit by streams of head/tail lights (animated)
function drawLightTrails(ctx, scroll, time) {
  const y0 = 186;
  // The lower road's deck, its railing, and the dark underside
  rect(ctx, 0, y0, WIDTH, ROAD_TOP - y0, '#1f1638');
  rect(ctx, 0, y0, WIDTH, 1, '#4a3878');
  rect(ctx, 0, y0 + 7, WIDTH, 1, '#3a2b62');
  const off = Math.round((((scroll * 0.3) % 10) + 10) % 10);
  for (let x = -off; x < WIDTH; x += 10) rect(ctx, x, y0 - 2, 1, 2, '#3a2b62');
  rect(ctx, 0, y0 - 2, WIDTH, 1, '#3a2b62');
  // Red tail lights going one way, white headlights coming back
  for (let lane = 0; lane < 2; lane++) {
    const y = y0 + 2 + lane * 3;
    const speed = lane === 0 ? 70 : -90;
    const color = lane === 0 ? '#ff4d6d' : '#fff4d1';
    const dim = lane === 0 ? '#8a2449' : '#9d8f78';
    for (let i = 0; i < 14; i++) {
      const base = (i * 53 + lane * 21) % 742;
      const x = Math.round((((base + time * speed - scroll * 0.3) % 742) + 742) % 742) - 130;
      rect(ctx, x, y, 9, 1, dim);
      rect(ctx, x + (lane === 0 ? 7 : 0), y, 2, 1, color);
      rect(ctx, x + (lane === 0 ? 7 : 0), y - 1, 2, 1, dim);
    }
  }
}

// ---------- Street lights and gantry signs (full speed) ----------

function streetLight(ctx, x) {
  rect(ctx, x, 128, 3, 80, O);
  rect(ctx, x + 1, 129, 1, 78, '#5d5478');
  // A long arm curving over the road
  rect(ctx, x + 1, 124, 18, 3, O);
  rect(ctx, x + 2, 125, 16, 1, '#5d5478');
  rect(ctx, x + 14, 126, 9, 3, O);
  rect(ctx, x + 15, 127, 7, 1, '#ffb347');
  // Sodium glow under the lamp
  rect(ctx, x + 16, 129, 5, 1, '#ffd27a');
  dither(ctx, x + 14, 130, 9, 2, '#ffb347');
}

function gantry(ctx, x, rand, signs) {
  // Two legs and a lattice beam over the road
  for (const lx of [x, x + 150]) {
    rect(ctx, lx, 96, 5, 112, O);
    rect(ctx, lx + 1, 97, 3, 110, '#6b6488');
    rect(ctx, lx + 1, 97, 1, 110, '#8a83a8');
  }
  rect(ctx, x, 94, 155, 8, O);
  rect(ctx, x + 1, 95, 153, 6, '#5d5478');
  for (let i = 4; i < 150; i += 6) rect(ctx, x + i, 96, 3, 4, i % 12 < 6 ? '#3f3858' : '#7b7398');
  // Green motorway signs hanging from the beam
  let sx = x + 12;
  for (const [label, arrow] of signs) {
    const w = label.length * 8 + 24;
    box(ctx, sx, 104, w, 22, { fill: '#1d7a46', light: '#2b9a5b', shade: '#125132' });
    rect(ctx, sx + 2, 106, w - 4, 1, '#e8f5ec');
    rect(ctx, sx + 2, 123, w - 4, 1, '#e8f5ec');
    pixelText(ctx, label, sx + 6, 111, { color: '#ffffff' });
    const ax = sx + w - 13;
    if (arrow === 'up') {
      rect(ctx, ax + 3, 111, 2, 9, '#ffffff');
      rect(ctx, ax + 1, 113, 6, 1, '#ffffff');
      rect(ctx, ax + 2, 112, 4, 1, '#ffffff');
    } else {
      rect(ctx, ax, 115, 8, 2, '#ffffff');
      rect(ctx, ax + 6, 113, 1, 6, '#ffffff');
      rect(ctx, ax + 7, 114, 1, 4, '#ffffff');
    }
    sx += w + 6;
  }
}

function makeFurniture(rand) {
  const W = 1440;
  const [canvas, ctx] = makeCanvas(W, HEIGHT);
  const signSets = [
    [['CITY', 'up'], ['AIRPORT', 'right']],
    [['DOCKS', 'right'], ['NORTH', 'up']],
    [['CHAOS ST', 'up']],
  ];
  gantry(ctx, 120, rand, signSets[0]);
  gantry(ctx, 820, rand, signSets[1]);
  for (let x = 40; x < W - 30; x += 140) {
    if ((x > 100 && x < 290) || (x > 800 && x < 990)) continue;
    streetLight(ctx, x);
  }
  return canvas;
}

// ---------- Our road ----------

function makeRoad(rand) {
  const W = 960;
  const [canvas, ctx] = makeCanvas(W, HEIGHT - ROAD_TOP);
  const y = (v) => v - ROAD_TOP;
  // The dark drop behind the barrier
  rect(ctx, 0, 0, W, y(BARRIER_Y + 6), '#1f1638');
  rect(ctx, 0, 0, W, 1, '#2c2150');
  // Crash barrier: posts and a corrugated steel beam with reflectors
  for (let x = 4; x < W; x += 24) {
    rect(ctx, x, y(BARRIER_Y - 2), 3, 9, O);
    rect(ctx, x + 1, y(BARRIER_Y - 1), 1, 7, '#8a83a8');
  }
  rect(ctx, 0, y(BARRIER_Y), W, 6, O);
  rect(ctx, 0, y(BARRIER_Y + 1), W, 4, '#a9a6bf');
  rect(ctx, 0, y(BARRIER_Y + 1), W, 1, '#d8d6e6');
  rect(ctx, 0, y(BARRIER_Y + 3), W, 1, '#7b7898');
  for (let x = 12; x < W; x += 48) rect(ctx, x, y(BARRIER_Y + 2), 2, 2, '#ffb347');
  rect(ctx, 0, y(BARRIER_Y + 6), W, 1, '#1b1630');
  // Asphalt: both lanes, with a few speckles and patches
  rect(ctx, 0, y(BACK_LANE), W, EDGE_LINE + 2 - BACK_LANE, '#3a3550');
  rect(ctx, 0, y(BACK_LANE), W, 1, '#2a253d');
  for (let i = 0; i < 380; i++) {
    rect(ctx, Math.floor(rand() * W), y(BACK_LANE + 1) + Math.floor(rand() * 27), 1, 1, rand() < 0.5 ? '#433d5b' : '#322d47');
  }
  for (let i = 0; i < 6; i++) {
    const px = Math.floor(rand() * (W - 40));
    const py = y(BACK_LANE + 2) + Math.floor(rand() * 20);
    rect(ctx, px, py, 18 + Math.floor(rand() * 20), 3, '#34304a');
  }
  // Faint tyre tracks along each lane
  rect(ctx, 0, y(219), W, 1, '#35304b');
  rect(ctx, 0, y(233), W, 1, '#35304b');
  // Dashed lane line between the lanes
  for (let x = 6; x < W; x += 32) {
    rect(ctx, x, y(LANE_LINE), 16, 2, '#e9e4f2');
    rect(ctx, x, y(LANE_LINE + 1), 16, 1, '#b9b3cc');
  }
  // Solid edge line, then the kerb
  rect(ctx, 0, y(EDGE_LINE), W, 2, '#f2eadb');
  rect(ctx, 0, y(KERB_Y), W, 1, O);
  rect(ctx, 0, y(KERB_Y + 1), W, 3, '#8b85a6');
  rect(ctx, 0, y(KERB_Y + 1), W, 1, '#b2acc9');
  for (let x = 0; x < W; x += 16) rect(ctx, x, y(KERB_Y + 1), 1, 3, '#6d6789');
  rect(ctx, 0, y(KERB_Y + 4), W, 1, O);
  // The side of the flyover: a concrete beam, then the dark drop with the city lights far below
  rect(ctx, 0, y(KERB_Y + 5), W, 9, '#5a5274');
  rect(ctx, 0, y(KERB_Y + 5), W, 1, '#7a7296');
  for (let x = 0; x < W; x += 60) {
    rect(ctx, x, y(KERB_Y + 5), 1, 9, '#463f5e');
    rect(ctx, x + 30, y(KERB_Y + 9), 2, 2, '#ffb347');
  }
  rect(ctx, 0, y(KERB_Y + 14), W, 1, O);
  rect(ctx, 0, y(KERB_Y + 15), W, HEIGHT - KERB_Y - 15, '#1a1430');
  for (let i = 0; i < 120; i++) {
    const c = ['#ffcf6b', '#8fe3ff', '#ff6b9a', '#fff4d1'][Math.floor(rand() * 4)];
    rect(ctx, Math.floor(rand() * W), y(KERB_Y + 17) + Math.floor(rand() * 10), 1, 1, c);
  }
  // Support pillars going down
  for (let x = 90; x < W; x += 240) {
    rect(ctx, x, y(KERB_Y + 15), 14, HEIGHT - KERB_Y - 15, O);
    rect(ctx, x + 1, y(KERB_Y + 15), 12, HEIGHT - KERB_Y - 15, '#3d3656');
    rect(ctx, x + 1, y(KERB_Y + 15), 3, HEIGHT - KERB_Y - 15, '#4d4569');
  }
  return canvas;
}

// ---------- Obstacles ----------

const CAR_PAINT = [
  { body: '#4aa3df', light: '#8fd0ff', shade: '#2c6c9a' },
  { body: '#e0474c', light: '#ff8a80', shade: '#a3303d' },
  { body: '#f2b632', light: '#ffe08a', shade: '#b8821a' },
  { body: '#7bd389', light: '#b5f0bf', shade: '#3f8f52' },
];

// A broken-down car, 44 x 22, facing left, its bonnet up. `blink` = hazard lights on.
function makeCar({ body, light, shade }, blink) {
  const [canvas, ctx] = makeCanvas(44, 22);
  // Bonnet propped up at the front (left)
  rect(ctx, 2, 0, 9, 2, O);
  rect(ctx, 3, 0, 7, 1, light);
  rect(ctx, 9, 1, 1, 6, O);
  // Cabin with a sloped windscreen
  for (let row = 0; row <= 7; row++) {
    const left = 13 - Math.floor(row * 0.8);
    const right = 31 + Math.floor(row * 0.6);
    rect(ctx, left, 3 + row, right - left, 1, O);
    if (row > 0) rect(ctx, left + 1, 3 + row, right - left - 2, 1, row < 6 ? '#bfe6ff' : body);
  }
  rect(ctx, 14, 4, 17, 1, light);
  rect(ctx, 22, 4, 1, 6, body); // pillar between the windows
  rect(ctx, 15, 5, 3, 1, '#ffffff');
  // Body
  rect(ctx, 1, 10, 42, 8, O);
  rect(ctx, 2, 11, 40, 6, body);
  rect(ctx, 2, 11, 40, 1, light);
  rect(ctx, 2, 15, 40, 2, shade);
  rect(ctx, 22, 11, 1, 5, shade); // door line
  rect(ctx, 25, 13, 3, 1, O);
  // Hazard lights: front-left and back-right, blinking amber
  const lamp = blink ? '#ffb000' : '#7a5418';
  rect(ctx, 2, 12, 2, 2, lamp);
  rect(ctx, 40, 12, 2, 2, lamp);
  if (blink) {
    rect(ctx, 0, 12, 1, 2, '#ffe08a');
    rect(ctx, 43, 12, 1, 2, '#ffe08a');
  }
  rect(ctx, 1, 17, 4, 1, '#5e5580'); // bumpers
  rect(ctx, 39, 17, 4, 1, '#5e5580');
  // Wheels
  for (const wx of [10, 34]) {
    circle(ctx, wx, 17, 4, O);
    circle(ctx, wx, 17, 3, '#2b2440');
    rect(ctx, wx - 1, 16, 2, 2, '#9a90b6');
  }
  // A little cloud of steam from under the bonnet
  rect(ctx, 4, 2, 2, 1, '#d9d4e8');
  return canvas;
}

function makeBarrier(lampOn) {
  const [canvas, ctx] = makeCanvas(22, 18);
  // Amber lamp on top
  rect(ctx, 9, 0, 4, 4, O);
  rect(ctx, 10, 1, 2, 2, lampOn ? '#ffb000' : '#6e4d1c');
  if (lampOn) rect(ctx, 10, 1, 1, 1, '#fff2b3');
  // The striped board
  rect(ctx, 0, 4, 22, 7, O);
  for (let i = 1; i < 21; i++) {
    for (let j = 5; j < 10; j++) rect(ctx, i, j, 1, 1, (i + j) % 8 < 4 ? '#e8414c' : '#f6f1f6');
  }
  rect(ctx, 1, 5, 20, 1, '#ffffff');
  // Legs and feet
  for (const lx of [3, 16]) {
    rect(ctx, lx, 11, 3, 6, O);
    rect(ctx, lx + 1, 11, 1, 5, '#b8b3cc');
  }
  rect(ctx, 1, 16, 7, 2, O);
  rect(ctx, 14, 16, 7, 2, O);
  rect(ctx, 2, 16, 5, 1, '#5d5478');
  rect(ctx, 15, 16, 5, 1, '#5d5478');
  return canvas;
}

function makePothole() {
  const [canvas, ctx] = makeCanvas(30, 7);
  // Cracks running out from the hole
  for (const [x, y] of [[0, 3], [1, 2], [2, 2], [28, 4], [29, 5], [27, 1], [28, 0]]) rect(ctx, x, y, 1, 1, '#211c33');
  // The broken lip (lit on the far side), the dark hole, a puddle at the bottom
  rect(ctx, 4, 0, 22, 1, '#8a83a8');
  rect(ctx, 3, 1, 24, 4, O);
  rect(ctx, 5, 1, 20, 1, '#0b0914');
  rect(ctx, 4, 2, 22, 2, '#120f1e');
  rect(ctx, 8, 3, 12, 1, '#2d3b5c');
  rect(ctx, 10, 3, 4, 1, '#7fa6e0');
  rect(ctx, 3, 5, 24, 1, '#8a83a8');
  rect(ctx, 5, 6, 20, 1, '#2a253d');
  // Loose chunks of tarmac
  rect(ctx, 1, 5, 2, 1, '#5d5778');
  rect(ctx, 27, 2, 2, 1, '#5d5778');
  return canvas;
}

export function createHighway() {
  const rand = sceneryRandom(7007);
  const layers = {
    sky: makeSky(rand),
    clouds: makeClouds(rand),
    far: makeFar(rand),
    mid: makeMid(rand),
    furniture: makeFurniture(rand),
    road: makeRoad(rand),
  };
  const cars = CAR_PAINT.map((p) => [makeCar(p, false), makeCar(p, true)]);
  const barrier = [makeBarrier(false), makeBarrier(true)];
  const pothole = makePothole();

  return {
    drawBack(ctx, scroll, time) {
      ctx.drawImage(layers.sky, 0, 0);
      drawStrip(ctx, layers.clouds, scroll * 0.04 + time * 2, 0);
      drawStrip(ctx, layers.far, scroll * 0.1, 192 - layers.far.height);
      drawStrip(ctx, layers.mid, scroll * 0.25, 190 - layers.mid.height);
      drawLightTrails(ctx, scroll, time);
      drawStrip(ctx, layers.road, scroll, ROAD_TOP);
      drawStrip(ctx, layers.furniture, scroll, 0);
    },

    drawObstacle(ctx, o, time) {
      const blink = Math.floor(time * 3 + o.x * 0.01) % 2 === 0;
      if (o.kind === KIND.STALLED_CAR) {
        rect(ctx, o.x + 3, o.y + o.h, o.w - 6, 1, '#1d1930');
        ctx.drawImage(cars[(o.a | 0) & 3][blink ? 1 : 0], o.x, o.y);
      } else if (o.kind === KIND.ROADWORK) {
        rect(ctx, o.x + 1, o.y + o.h, o.w - 2, 1, '#1d1930');
        ctx.drawImage(barrier[blink ? 1 : 0], o.x, o.y);
      } else if (o.kind === KIND.POTHOLE) {
        ctx.drawImage(pothole, o.x - 2, o.y - 1);
      }
    },
  };
}

