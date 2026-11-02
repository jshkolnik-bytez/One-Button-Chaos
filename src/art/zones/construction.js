// zones/construction.js: the Construction Site, drawn in code as pixel art.
//
// Dusk over a building site: half-built towers, tower cranes, scaffolding,
// work lights and a chain-link fence. The boy rides along steel road plates
// and must DUCK under steel beams and concrete buckets swinging on cranes.
//
// Layers (slow to fast): sky + sun (still) > streaky clouds > far skyline of
// half-built towers > concrete frames and cranes > the site behind the fence >
// steel plates on the ground (full speed). Each layer is drawn ONCE into a
// long strip when the game starts; every frame we just copy the strips.
import { WIDTH, HEIGHT, KIND } from '../../world.js';
import { mixHex, spriteFromMap } from '../palette.js';
import { makeCanvas, rect, box, circle, dither, pixelText, sceneryRandom, OUTLINE } from '../pixel.js';
import { drawStrip } from '../strip.js';

// ---------- Colours of the site at dusk ----------

const C = {
  outline: OUTLINE,
  // sky
  sky: ['#2e2058', '#4b2a6e', '#7a3478', '#b8457a', '#e8646a', '#ff8f5a', '#ffb466'],
  sun: '#ffd27a',
  sunEdge: '#ff9f5a',
  sunCore: '#fff0c2',
  cloud: '#f08a86',
  cloudLight: '#ffb59a',
  cloudShade: '#b9567c',
  // far: hazy towers
  far: '#6a3a78',
  farLight: '#7f4a8c',
  farDark: '#5a3068',
  farWindow: '#c57aa0',
  // mid: concrete frames
  concrete: '#5d5478',
  concreteLight: '#766c94',
  concreteShade: '#463f60',
  slab: '#8a80a8',
  slabShade: '#6a6188',
  inside: '#2b2440',
  insideDeep: '#211b33',
  work: '#ffd166',
  workGlow: '#ffe7a8',
  net: '#3c8f7c',
  netLight: '#55b39a',
  tarp: '#3f7fd0',
  tarpLight: '#6aa6ec',
  // cranes
  yellow: '#ffcc00',
  yellowLight: '#ffe680',
  yellowShade: '#c99400',
  red: '#ff4d4d',
  // site
  fence: '#a9a4c4',
  fencePost: '#8d88aa',
  fenceDark: '#6b6688',
  screen: '#2f7d6a',
  screenLight: '#3f9a83',
  cabin: '#d9d3ea',
  cabinShade: '#a9a2c2',
  blueLoo: '#3a7bd5',
  orange: '#ff8a3d',
  orangeLight: '#ffb27a',
  orangeShade: '#d4612b',
  sand: '#d9a066',
  sandLight: '#f0c088',
  sandShade: '#a8744a',
  // ground
  plate: '#6f6a8a',
  plateLight: '#8e88aa',
  plateShade: '#565170',
  tread: '#7f7a9c',
  dirt: '#5c4048',
  dirtLight: '#74545c',
  dirtShade: '#43303a',
  black: '#2b2440',
  // the beams and buckets
  beam: '#e0532f',
  beamLight: '#ff8a5c',
  beamShade: '#a8381f',
  cable: '#2b2440',
  cableLight: '#5e5580',
  steel: '#8794b5',
  steelLight: '#b9c4dd',
  steelShade: '#5f6a8c',
};

const SKY_BOTTOM = 214; // the horizon line where the sky's last band sits

// ---------- Sky: deep purple to hot orange, with a big low sun ----------

function makeSky() {
  const [canvas, ctx] = makeCanvas(WIDTH, HEIGHT);
  const stops = C.sky;
  const bands = 13;
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

  // A few early stars in the purple at the top
  const rand = sceneryRandom(77);
  for (let i = 0; i < 26; i++) rect(ctx, Math.floor(rand() * WIDTH), 4 + Math.floor(rand() * 44), 1, 1, i % 3 ? '#8a6fc0' : '#e2d6ff');

  // The sun, big and low, sinking behind the site
  const cx = 360;
  const cy = 168;
  dither(ctx, cx - 50, cy - 50, 100, 100, '#ffb06655');
  circle(ctx, cx, cy, 44, C.sunEdge);
  circle(ctx, cx, cy, 41, C.sun);
  circle(ctx, cx - 10, cy - 12, 22, '#ffe39a');
  circle(ctx, cx - 14, cy - 16, 10, C.sunCore);
  // Haze bands crossing the sun
  [
    [cy + 6, 2],
    [cy + 14, 2],
    [cy + 22, 3],
    [cy + 31, 4],
  ].forEach(([y, h]) => {
    const color = colors[Math.min(bands - 1, Math.floor(y / bandHeight))];
    rect(ctx, cx - 46, y, 92, h, color);
  });
  return canvas;
}

// ---------- Clouds: long thin streaks lit from below ----------

function makeClouds(rand) {
  const [canvas, ctx] = makeCanvas(960, 130);
  for (let x = 0; x < 900; x += 90 + Math.floor(rand() * 120)) {
    const y = 20 + Math.floor(rand() * 96);
    const w = 50 + Math.floor(rand() * 90);
    const rows = 2 + Math.floor(rand() * 3);
    for (let r = 0; r < rows; r++) {
      const inset = r * (4 + Math.floor(rand() * 6));
      const rw = w - inset * 2 - Math.floor(rand() * 10);
      if (rw < 10) break;
      rect(ctx, x + inset, y + r * 3, rw, 3, C.cloud);
      rect(ctx, x + inset + 2, y + r * 3 + 2, rw - 4, 1, C.cloudLight); // lit from the sun below
      rect(ctx, x + inset, y + r * 3, Math.min(rw, 6), 1, C.cloudShade);
    }
  }
  return canvas;
}

// ---------- A tower crane: lattice mast, long jib, cab and hook ----------

function towerCrane(ctx, x, baseY, mastH, jibLeft, jibRight, col) {
  const { fill, light, shade, cab } = col;
  const top = baseY - mastH;
  // Mast: two rails with a zig-zag lattice between them
  rect(ctx, x, top, 1, mastH, fill);
  rect(ctx, x + 5, top, 1, mastH, shade);
  for (let y = top; y < baseY - 3; y += 6) {
    for (let i = 0; i < 6; i++) rect(ctx, x + 1 + Math.floor(i * 0.7), y + i, 1, 1, light);
    rect(ctx, x + 1, y, 4, 1, fill);
  }
  // Slewing unit and cab
  rect(ctx, x - 2, top - 4, 10, 4, fill);
  rect(ctx, x - 2, top - 4, 10, 1, light);
  if (cab) {
    rect(ctx, x + 6, top - 3, 5, 5, cab);
    rect(ctx, x + 7, top - 2, 3, 2, '#fff0b5');
  }
  // Top tower and the tie bars down to both ends of the jib
  rect(ctx, x + 2, top - 16, 2, 12, fill);
  for (let i = 0; i < jibRight; i += 2) rect(ctx, x + 3 + i, top - 16 + Math.floor((i / jibRight) * 11), 1, 1, shade);
  for (let i = 0; i < jibLeft; i += 2) rect(ctx, x + 2 - i, top - 16 + Math.floor((i / jibLeft) * 11), 1, 1, shade);
  // Jib (long, to the right) with a lattice
  rect(ctx, x, top - 7, jibRight, 1, fill);
  rect(ctx, x, top - 4, jibRight, 1, fill);
  for (let i = 0; i < jibRight; i += 4) {
    rect(ctx, x + i, top - 6, 1, 2, light);
    rect(ctx, x + i + 2, top - 6, 1, 1, light);
  }
  // Counter-jib (short, to the left) with the concrete counterweight
  rect(ctx, x - jibLeft, top - 7, jibLeft, 1, fill);
  rect(ctx, x - jibLeft, top - 4, jibLeft, 1, fill);
  rect(ctx, x - jibLeft, top - 6, 7, 6, shade);
  rect(ctx, x - jibLeft, top - 6, 7, 1, light);
  // A red warning light at the tip and on the top tower
  rect(ctx, x + jibRight - 1, top - 9, 2, 2, C.red);
  rect(ctx, x + 2, top - 18, 2, 2, C.red);
  // Trolley with its hook hanging down
  const tx = x + Math.floor(jibRight * 0.62);
  rect(ctx, tx - 1, top - 4, 4, 2, shade);
  const hookLen = 18 + (x % 24);
  rect(ctx, tx, top - 2, 1, hookLen, shade);
  rect(ctx, tx - 1, top - 2 + hookLen, 3, 3, fill);
  rect(ctx, tx, top + 1 + hookLen, 1, 2, shade);
}

// ---------- Far skyline: hazy towers, some still steel skeletons ----------

function makeFar(rand) {
  const W = 960;
  const H = 150;
  const [canvas, ctx] = makeCanvas(W, H);
  let x = 0;
  const cranes = [];
  while (x < W) {
    const w = Math.min(W - x, 20 + Math.floor(rand() * 30));
    const h = 40 + Math.floor(rand() * 70);
    const top = H - h;
    const skeleton = rand() < 0.35;
    if (skeleton) {
      // Finished floors at the bottom, bare steel frame on top
      const done = Math.floor(h * (0.4 + rand() * 0.3));
      rect(ctx, x, H - done, w, done, C.far);
      rect(ctx, x, H - done, w, 1, C.farLight);
      for (let y = top; y < H - done; y += 5) rect(ctx, x, y, w, 1, C.farDark);
      for (let cx = x; cx < x + w; cx += 6) rect(ctx, cx, top, 1, h - done, C.farDark);
      rect(ctx, x + w - 1, top, 1, h - done, C.farDark);
      if (rand() < 0.6) cranes.push(x + Math.floor(w / 2));
    } else {
      rect(ctx, x, top, w, h, C.far);
      rect(ctx, x, top, w, 1, C.farLight);
      if (rand() < 0.4) rect(ctx, x + Math.floor(w / 2), top - 9, 1, 9, C.far);
    }
    for (let wy = top + 5; wy < H - 3; wy += 6) {
      for (let wx = x + 3; wx < x + w - 3; wx += 4) {
        if (rand() < 0.1 && (!skeleton || wy > top + h * 0.5)) rect(ctx, wx, wy, 1, 2, C.farWindow);
      }
    }
    x += w + (rand() < 0.3 ? 2 + Math.floor(rand() * 5) : 0);
  }
  // Little far-away cranes on top of the skeleton towers
  const col = { fill: C.farDark, light: C.farLight, shade: C.farDark };
  for (const cx of cranes.slice(0, 5)) towerCrane(ctx, cx, 70, 40, 10, 34 + (cx % 20), col);
  return canvas;
}

// ---------- Mid: concrete frames being built, scaffolding, a big crane ----------

function concreteFrame(ctx, x, w, H, rand) {
  const floors = 3 + Math.floor(rand() * 7);
  const floorH = 16;
  const builtTo = 2 + Math.floor(rand() * (floors - 2)); // floors with walls and windows
  const top = H - floors * floorH;
  // The bare frame: columns and slabs
  for (let f = 0; f < floors; f++) {
    const y = H - (f + 1) * floorH;
    if (f < builtTo) {
      // Finished floor: wall with a strip of windows, some lit
      box(ctx, x, y, w, floorH + 1, { fill: C.concrete, light: C.concreteLight, shade: C.concreteShade });
      for (let wx = x + 4; wx < x + w - 6; wx += 8) {
        const lit = rand() < 0.35;
        rect(ctx, wx, y + 5, 5, 7, lit ? C.work : C.inside);
        if (lit) rect(ctx, wx, y + 5, 5, 1, C.workGlow);
      }
    } else {
      // Open floor: dark inside, columns, maybe a work lamp glowing
      rect(ctx, x, y, w, floorH, C.insideDeep);
      rect(ctx, x + 2, y + 3, w - 4, floorH - 3, C.inside);
      for (let cx = x; cx < x + w; cx += 12) {
        rect(ctx, cx, y, 3, floorH, C.concrete);
        rect(ctx, cx, y, 1, floorH, C.concreteLight);
      }
      rect(ctx, x + w - 3, y, 3, floorH, C.concrete);
      if (rand() < 0.45) {
        const lx = x + 6 + Math.floor(rand() * (w - 14));
        rect(ctx, lx, y + 8, 3, 3, C.work);
        rect(ctx, lx + 1, y + 8, 1, 1, '#ffffff');
        dither(ctx, lx - 3, y + 6, 9, 9, '#ffd16666');
      }
    }
    // The floor slab edge
    rect(ctx, x - 1, y, w + 2, 2, C.slab);
    rect(ctx, x - 1, y + 2, w + 2, 1, C.slabShade);
  }
  // Rebar sticking up from the top slab
  for (let rx = x + 1; rx < x + w; rx += 3) rect(ctx, rx, top - 3 - (rx % 2), 1, 3 + (rx % 2), C.concreteShade);
  // Safety netting or a tarp on part of the face
  if (rand() < 0.55) {
    const nf = builtTo + Math.floor(rand() * Math.max(1, floors - builtTo));
    const ny = H - (nf + 1) * floorH;
    const nh = floorH * (1 + Math.floor(rand() * 2));
    const tarp = rand() < 0.4;
    const nx = x + 2;
    const nw = Math.floor(w * (0.4 + rand() * 0.5));
    if (tarp) {
      rect(ctx, nx, ny + 2, nw, nh - 2, C.tarp);
      rect(ctx, nx, ny + 2, nw, 1, C.tarpLight);
      for (let i = nx + 3; i < nx + nw; i += 7) rect(ctx, i, ny + 3, 1, nh - 4, '#3268ad');
    } else {
      dither(ctx, nx, ny + 2, nw, nh - 2, C.net);
      rect(ctx, nx, ny + 2, nw, 1, C.netLight);
    }
  }
  return top;
}

function scaffolding(ctx, x, w, top, H) {
  const pole = '#9a8fb8';
  const poleLight = '#c4bbda';
  for (let px = x; px <= x + w; px += 12) {
    rect(ctx, px, top, 1, H - top, pole);
  }
  for (let y = top; y < H; y += 12) {
    rect(ctx, x - 1, y, w + 3, 1, poleLight);
    // Boards to walk on, with a yellow toe board
    rect(ctx, x, y + 1, w + 1, 1, '#a8744a');
    for (let px = x; px < x + w; px += 12) {
      rect(ctx, px + 1, y + 2, 1, 1, pole);
      rect(ctx, px + 2, y + 3, 1, 1, pole);
      rect(ctx, px + 3, y + 4, 1, 1, pole);
    }
  }
}

function makeMid(rand) {
  const W = 1440;
  const H = 214;
  const [canvas, ctx] = makeCanvas(W, H);
  let x = 6;
  let craneAt = 120 + Math.floor(rand() * 80);
  while (x < W - 40) {
    const w = Math.min(W - x - 6, 4 * (8 + Math.floor(rand() * 9)));
    if (w < 28) break;
    const top = concreteFrame(ctx, x, w, H, rand);
    if (rand() < 0.45) scaffolding(ctx, x - 4, Math.min(w + 4, 48), top + 16 * (1 + Math.floor(rand() * 2)), H);
    x += w + 18 + Math.floor(rand() * 54);
    if (x > craneAt && craneAt < W - 160) {
      const col = { fill: C.yellow, light: C.yellowLight, shade: C.yellowShade, cab: C.yellowShade };
      towerCrane(ctx, craneAt, H, 150 + Math.floor(rand() * 30), 26, 110 + Math.floor(rand() * 40), col);
      craneAt += 460 + Math.floor(rand() * 200);
    }
  }
  return canvas;
}

// ---------- Near: the site behind the chain-link fence ----------

const NEAR_H = 132; // strip height; its bottom sits on the back edge of the ground (222)

function siteCabin(ctx, x, base) {
  // A portable office cabin, stacked two high sometimes
  box(ctx, x, base - 26, 46, 26, { fill: C.cabin, light: '#f4f0fc', shade: C.cabinShade });
  for (let i = x + 3; i < x + 44; i += 4) rect(ctx, i, base - 24, 1, 22, '#c4bdd8');
  box(ctx, x + 5, base - 20, 14, 9, { fill: C.work, light: C.workGlow });
  rect(ctx, x + 12, base - 20, 1, 9, C.outline);
  box(ctx, x + 30, base - 22, 10, 22, { fill: '#3a7bd5', light: '#6aa6ec' });
  rect(ctx, x + 37, base - 12, 2, 1, '#e8f0ff');
  rect(ctx, x - 1, base - 27, 48, 2, C.outline);
  // Its sign
  box(ctx, x + 22, base - 33, 22, 7, { fill: C.yellow, light: C.yellowLight });
  rect(ctx, x + 24, base - 31, 18, 1, C.black);
  rect(ctx, x + 24, base - 29, 12, 1, C.black);
}

function portaLoo(ctx, x, base) {
  box(ctx, x, base - 24, 12, 24, { fill: C.blueLoo, light: '#6aa6ec', shade: '#2b5ea8' });
  rect(ctx, x - 1, base - 26, 14, 3, C.outline);
  rect(ctx, x, base - 25, 12, 1, '#e8f0ff');
  rect(ctx, x + 3, base - 18, 6, 1, '#2b5ea8');
  rect(ctx, x + 9, base - 12, 1, 2, '#e8f0ff');
  rect(ctx, x + 2, base - 21, 4, 2, C.red); // the little "busy" sign
}

function pipeStack(ctx, x, base) {
  // Big concrete drain pipes, end-on
  const rings = [
    [x + 8, base - 8],
    [x + 24, base - 8],
    [x + 16, base - 22],
  ];
  for (const [cx, cy] of rings) {
    circle(ctx, cx, cy, 8, C.outline);
    circle(ctx, cx, cy, 7, '#9a90b6');
    circle(ctx, cx, cy, 4, C.inside);
    rect(ctx, cx - 5, cy - 6, 4, 1, '#c4bbda');
  }
}

function sandPile(ctx, x, base, rand) {
  const w = 40 + Math.floor(rand() * 20);
  for (let i = 0; i < w; i++) {
    const t = i / w;
    const h = Math.floor(Math.sin(t * Math.PI) * 18);
    rect(ctx, x + i, base - h, 1, h, t < 0.45 ? C.sandLight : t < 0.75 ? C.sand : C.sandShade);
    rect(ctx, x + i, base - h - 1, 1, 1, C.outline);
  }
  // A shovel stuck in it
  rect(ctx, x + Math.floor(w * 0.6), base - 30, 1, 16, '#a8744a');
  rect(ctx, x + Math.floor(w * 0.6) - 1, base - 15, 3, 4, C.steel);
}

function cementMixer(ctx, x, base) {
  // Orange drum on a little stand with a wheel
  rect(ctx, x + 6, base - 6, 1, 6, C.outline);
  rect(ctx, x + 18, base - 6, 1, 6, C.outline);
  circle(ctx, x + 18, base - 3, 3, C.outline);
  circle(ctx, x + 18, base - 3, 1, '#9a90b6');
  for (let r = 0; r < 14; r++) {
    const w = 18 - Math.abs(r - 7);
    rect(ctx, x + 12 - Math.floor(w / 2) + Math.floor(r / 2), base - 22 + r, w, 1, r < 4 ? C.orangeLight : r < 10 ? C.orange : C.orangeShade);
  }
  rect(ctx, x + 14, base - 23, 6, 2, C.outline); // the drum's mouth
}

function lightTower(ctx, x, base) {
  // A tall work-light mast with four lamps and a soft glow
  rect(ctx, x, base - 96, 2, 96, '#7c7299');
  rect(ctx, x, base - 96, 1, 96, '#9a90b6');
  rect(ctx, x - 6, base - 6, 14, 6, C.yellowShade);
  rect(ctx, x - 6, base - 6, 14, 1, C.yellow);
  rect(ctx, x - 8, base - 100, 18, 3, C.outline);
  for (let i = 0; i < 4; i++) {
    rect(ctx, x - 7 + i * 4, base - 106, 3, 6, C.outline);
    rect(ctx, x - 6 + i * 4, base - 105, 1, 4, '#fff8dc');
  }
  dither(ctx, x - 22, base - 112, 46, 22, '#fff0b544');
}

function warningSign(ctx, x, y, text) {
  box(ctx, x, y, text.length * 8 + 6, 12, { fill: C.yellow, light: C.yellowLight, shade: C.yellowShade });
  pixelText(ctx, text, x + 3, y + 2, { color: C.black });
}

// Chain-link fence: posts, a top rail and a diamond mesh you can see through
function fence(ctx, W, top, base, rand) {
  // Mesh, drawn as a diagonal pattern with gaps
  for (let y = top + 2; y < base; y++) {
    for (let x = 0; x < W; x++) {
      const a = (x + y) % 8 === 0;
      const b = (x - y + 800) % 8 === 0;
      if (a || b) rect(ctx, x, y, 1, 1, a && b ? C.fence : C.fenceDark);
    }
  }
  // Green privacy screen on some panels, with a sign zip-tied on
  const signs = ['KEEP OUT', 'HARD HAT AREA', 'DANGER', 'NO ENTRY'];
  for (let x = 0; x < W; x += 64) {
    rect(ctx, x, top - 6, 2, base - top + 6, C.fenceDark); // post
    rect(ctx, x, top - 6, 1, base - top + 6, C.fence);
    rect(ctx, x - 1, base - 3, 4, 3, C.outline); // foot block
    if (rand() < 0.45) {
      rect(ctx, x + 2, top + 4, 62, base - top - 8, C.screen);
      rect(ctx, x + 2, top + 4, 62, 1, C.screenLight);
      for (let i = x + 6; i < x + 62; i += 8) rect(ctx, i, top + 6, 1, base - top - 12, '#29705f');
      if (rand() < 0.75) {
        const text = signs[Math.floor(rand() * signs.length)];
        const sw = text.length * 8 + 6;
        if (sw < 60) warningSign(ctx, x + 2 + Math.floor((62 - sw) / 2), top + 8, text);
      }
    }
  }
  // Top rail with a coil of barbed wire
  rect(ctx, 0, top - 1, W, 2, C.fenceDark);
  rect(ctx, 0, top - 1, W, 1, C.fence);
  for (let x = 0; x < W; x += 4) {
    rect(ctx, x, top - 4, 2, 1, C.fenceDark);
    rect(ctx, x + 1, top - 5, 1, 1, C.fence);
  }
}

function makeNear(rand) {
  const W = 1600;
  const [canvas, ctx] = makeCanvas(W, NEAR_H);
  const base = NEAR_H - 4;
  // Stuff behind the fence
  let x = 10;
  while (x < W - 80) {
    const pick = rand();
    if (pick < 0.18) {
      lightTower(ctx, x + 10, base);
      x += 34;
    } else if (pick < 0.36) {
      siteCabin(ctx, x, base);
      if (rand() < 0.4) siteCabin(ctx, x + 2, base - 27);
      x += 56;
    } else if (pick < 0.5) {
      portaLoo(ctx, x, base);
      if (rand() < 0.5) portaLoo(ctx, x + 14, base);
      x += 34;
    } else if (pick < 0.64) {
      pipeStack(ctx, x, base);
      x += 40;
    } else if (pick < 0.8) {
      sandPile(ctx, x, base, rand);
      x += 64;
    } else {
      cementMixer(ctx, x, base);
      x += 34;
    }
    x += 6 + Math.floor(rand() * 26);
  }
  // The fence itself, in front of all that
  fence(ctx, W, base - 36, base, rand);
  // Cones and a hazard barrier in front of the fence now and then
  for (let cx = 40; cx < W - 30; cx += 90 + Math.floor(rand() * 120)) {
    if (rand() < 0.5) {
      // A striped barrier on two feet
      rect(ctx, cx, base - 12, 28, 6, C.outline);
      for (let i = 0; i < 26; i += 4) rect(ctx, cx + 1 + i, base - 11, 2, 4, i % 8 ? C.yellow : C.black);
      for (let i = 2; i < 26; i += 8) rect(ctx, cx + 1 + i, base - 11, 2, 4, C.black);
      rect(ctx, cx + 3, base - 6, 2, 6, C.outline);
      rect(ctx, cx + 23, base - 6, 2, 6, C.outline);
    } else {
      rect(ctx, cx + 3, base - 10, 3, 2, C.orange);
      rect(ctx, cx + 2, base - 8, 5, 2, '#f4eefc');
      rect(ctx, cx + 1, base - 6, 7, 4, C.orange);
      rect(ctx, cx, base - 2, 9, 2, C.outline);
    }
  }
  // Ground strip under it all, so it meets the plates
  rect(ctx, 0, base, W, NEAR_H - base, C.dirtShade);
  return canvas;
}

// ---------- Ground: steel road plates over dirt, with a hazard edge ----------

function makeGround(rand) {
  const W = 960;
  const H = HEIGHT - 222;
  const [canvas, ctx] = makeCanvas(W, H);
  // Back edge
  rect(ctx, 0, 0, W, 1, C.outline);
  // Steel plates (the floor band he rides on: rows 1..19)
  for (let x = 0; x < W; x += 60) {
    rect(ctx, x, 1, 60, 19, C.plate);
    rect(ctx, x, 1, 60, 1, C.plateLight);
    rect(ctx, x, 1, 1, 19, C.plateLight);
    rect(ctx, x + 59, 1, 1, 19, C.plateShade);
    rect(ctx, x, 19, 60, 1, C.plateShade);
    // Diamond tread pattern, kept faint so obstacles read
    for (let ty = 4; ty < 18; ty += 4) {
      for (let tx = x + 3 + ((ty / 4) % 2) * 3; tx < x + 57; tx += 6) rect(ctx, tx, ty, 2, 1, C.tread);
    }
    // Bolts in the corners
    for (const [bx, by] of [
      [x + 2, 3],
      [x + 56, 3],
      [x + 2, 16],
      [x + 56, 16],
    ]) {
      rect(ctx, bx, by, 2, 2, C.plateShade);
      rect(ctx, bx, by, 1, 1, C.plateLight);
    }
  }
  // Muddy tyre marks across the plates
  for (let i = 0; i < 18; i++) {
    const mx = Math.floor(rand() * W);
    rect(ctx, mx, 12 + Math.floor(rand() * 6), 4 + Math.floor(rand() * 10), 1, '#615571');
  }
  // Hazard stripe along the front edge of the plates
  rect(ctx, 0, 20, W, 1, C.outline);
  for (let x = 0; x < W; x++) {
    for (let y = 21; y < 25; y++) rect(ctx, x, y, 1, 1, Math.floor((x + y) / 4) % 2 ? C.yellow : C.black);
  }
  rect(ctx, 0, 21, W, 1, C.yellowLight);
  rect(ctx, 0, 25, W, 1, C.outline);
  // Dirt in front, with gravel, puddles and stray planks
  rect(ctx, 0, 26, W, H - 26, C.dirt);
  dither(ctx, 0, 26, W, 2, C.dirtShade);
  for (let i = 0; i < 320; i++) {
    rect(ctx, Math.floor(rand() * W), 28 + Math.floor(rand() * (H - 28)), 1 + Math.floor(rand() * 2), 1, rand() < 0.5 ? C.dirtLight : C.dirtShade);
  }
  for (const px of [140, 520, 800]) {
    rect(ctx, px, 36, 30, 3, '#4a5d8a');
    rect(ctx, px + 2, 36, 26, 1, '#7a92c4');
    rect(ctx, px + 6, 37, 6, 1, '#ffb466');
  }
  for (const px of [330, 700]) {
    rect(ctx, px, 31, 36, 4, C.outline);
    rect(ctx, px + 1, 32, 34, 2, '#c98a4b');
    rect(ctx, px + 1, 32, 34, 1, '#e3aa6a');
    rect(ctx, px + 4, 33, 1, 1, C.outline);
    rect(ctx, px + 30, 33, 1, 1, C.outline);
  }
  return canvas;
}

// ---------- The obstacles: things on cranes to duck under ----------

// A steel I-beam of any width, painted in red primer, with hazard-striped ends
function makeBeam(w) {
  const [canvas, ctx] = makeCanvas(w, 8);
  // Top and bottom flanges
  rect(ctx, 0, 0, w, 2, C.outline);
  rect(ctx, 0, 6, w, 2, C.outline);
  rect(ctx, 1, 1, w - 2, 1, C.beamLight);
  rect(ctx, 1, 6, w - 2, 1, C.beam);
  // The web between them, darker, with bolt holes
  rect(ctx, 0, 2, w, 4, C.outline);
  rect(ctx, 2, 2, w - 4, 4, C.beamShade);
  rect(ctx, 2, 2, w - 4, 1, C.beam);
  for (let x = 6; x < w - 6; x += 8) {
    rect(ctx, x, 3, 2, 2, C.outline);
    rect(ctx, x, 3, 1, 1, '#5e2414');
  }
  // Hazard stripes on both ends so it pops
  for (const ex of [1, w - 7]) {
    for (let i = 0; i < 6; i++) {
      for (let y = 1; y < 7; y++) rect(ctx, ex + i, y, 1, 1, Math.floor((i + y) / 2) % 2 ? C.yellow : C.black);
    }
  }
  rect(ctx, 0, 0, 1, 8, C.outline);
  rect(ctx, w - 1, 0, 1, 8, C.outline);
  return canvas;
}

// The crane's hook block: yellow pulley with a hook underneath, 11 x 15
const HOOK_BLOCK = spriteFromMap(
  [
    '....ooo....',
    '..ooYYYoo..',
    '.oYyYYYYSo.',
    'oYyYooYYYSo',
    'oYYo..oYYSo',
    'oYYo..oYYSo',
    'oYYYooYYYSo',
    '.oSYYYYYSo.',
    '..oooooSo..',
    '....oMo....',
    '....oMo....',
    '...oMMo....',
    '..oMo.oo...',
    '..oMo.oMo..',
    '...oMMMo...',
  ],
  { o: OUTLINE, Y: C.yellow, y: C.yellowLight, S: C.yellowShade, M: C.steel }
);

// Concrete bucket: a steel bell with a yellow rim, hung from a bail, 16 x 18
const BUCKET = spriteFromMap(
  [
    '.......oo.......',
    '......oMMo......',
    '.....oMooMo.....',
    '....oMo..oMo....',
    '...oMo....oMo...',
    'oooooooooooooooo',
    'oYyYYYYYYYYYYYSo',
    'oSSSSSSSSSSSSSSo',
    'oooooooooooooooo',
    'ogGGGGGGGGGGGHHo',
    '.ogGGcGGGGGGHHo.',
    '.ogGGGGGGGGGHHo.',
    '..ogGGGGGcGHHo..',
    '..ogGGGGGGGHHo..',
    '...ogGGGGGHHo...',
    '...oooYYYYSooo..',
    '.....oDDDDo.....',
    '......oooo......',
  ],
  { o: OUTLINE, Y: C.yellow, y: C.yellowLight, S: C.yellowShade, G: '#8a92b2', g: '#bcc4dc', H: '#5f6a8c', c: '#e2dcef', M: C.steelLight, D: '#43303a' }
);

// A cable from (x1, y1) up to (x2, y2), drawn pixel by pixel so it stays crisp
function cable(ctx, x1, y1, x2, y2) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x1 + ((x2 - x1) * i) / steps);
    const y = Math.round(y1 + ((y2 - y1) * i) / steps);
    rect(ctx, x + 1, y, 1, 1, C.cable);
    rect(ctx, x, y, 1, 1, '#c4bbda');
  }
}

// A straight rope going up off the top of the screen, with a glint now and then
function ropeUp(ctx, x, bottom) {
  rect(ctx, x, 0, 2, bottom, C.cable);
  rect(ctx, x, 0, 1, bottom, '#8d86a8');
  for (let y = 6; y < bottom; y += 10) rect(ctx, x, y, 1, 3, '#c4bbda');
}

// A soft shadow on the plates below, so it's easy to see it's in the air
function floorShadow(ctx, x, w) {
  dither(ctx, x + 2, 235, w - 4, 2, '#3f3a58');
}

export function createConstruction() {
  const rand = sceneryRandom(424242);
  const layers = {
    sky: makeSky(),
    clouds: makeClouds(rand),
    far: makeFar(rand),
    mid: makeMid(rand),
    near: makeNear(rand),
    ground: makeGround(rand),
  };
  const beams = new Map(); // one beam picture per width, made when first needed

  function beamOf(w) {
    if (!beams.has(w)) beams.set(w, makeBeam(w));
    return beams.get(w);
  }

  return {
    drawBack(ctx, scroll, time) {
      ctx.drawImage(layers.sky, 0, 0);
      drawStrip(ctx, layers.clouds, scroll * 0.04 + time * 2, 0);
      drawStrip(ctx, layers.far, scroll * 0.1, SKY_BOTTOM - layers.far.height);
      drawStrip(ctx, layers.mid, scroll * 0.25, 216 - layers.mid.height);
      drawStrip(ctx, layers.near, scroll * 0.55, 222 - NEAR_H);
      drawStrip(ctx, layers.ground, scroll, 222);
    },

    drawObstacle(ctx, o, time) {
      const { x, y, w, h } = o;
      if (o.kind === KIND.BEAM) {
        floorShadow(ctx, x, w);
        // Two cables from the beam up to a hook block that sways a little
        const sway = Math.round(Math.sin(time * 1.6 + x * 0.05) * 1.5);
        const hx = x + Math.floor(w / 2) + sway;
        const hy = y - 44;
        cable(ctx, x + Math.floor(w * 0.18), y, hx - 2, hy + 14);
        cable(ctx, x + Math.ceil(w * 0.82) - 1, y, hx + 2, hy + 14);
        ropeUp(ctx, hx, hy + 1);
        ctx.drawImage(HOOK_BLOCK, hx - 5, hy);
        ctx.drawImage(beamOf(w), x, y);
      } else if (o.kind === KIND.BUCKET) {
        floorShadow(ctx, x, w);
        ropeUp(ctx, x + 7, y + 1);
        ctx.drawImage(BUCKET, x, y);
        // A drip of wet concrete now and then
        const drip = (time * 1.3 + x * 0.01) % 1;
        if (drip < 0.6) rect(ctx, x + 7, y + h + Math.floor(drip * 18), 1, 2, '#c4bbda');
      }
    },
  };
}
