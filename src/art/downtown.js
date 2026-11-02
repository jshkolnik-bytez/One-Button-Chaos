// downtown.js: the Downtown backdrop, drawn in code as pixel art.
//
// It's made of layers that scroll at different speeds (parallax):
//   sky + sun (still) > clouds > far skyline > mid buildings > shops >
//   lamp posts and traffic lights > pavement and road (full speed)
// Each layer is drawn ONCE into a long strip when the game starts; every
// frame we just copy the strips, which keeps it fast on a Chromebook.
import { WIDTH, HEIGHT } from '../world.js';
import { P, mixHex, spriteFromMap } from './palette.js';
import { makeCanvas, rect, box, circle, dither, pixelText, sceneryRandom } from './pixel.js';
import { drawStrip } from './strip.js';

const SHOP_BASE = 222; // the bottom of the shop fronts (the back edge of the pavement)
const SHOP_H = 120; // height of the shop strip

// ---------- Sky: purple fading to peach, with a big setting sun ----------

function makeSky() {
  const [canvas, ctx] = makeCanvas(WIDTH, HEIGHT);
  const bands = 11;
  const bottom = 216;
  const bandHeight = bottom / bands;
  const colors = [];
  for (let i = 0; i < bands; i++) colors.push(mixHex(P.skyTop, P.skyBottom, i / (bands - 1)));
  colors.forEach((color, i) => rect(ctx, 0, Math.floor(i * bandHeight), WIDTH, Math.ceil(bandHeight) + 1, color));
  rect(ctx, 0, bottom, WIDTH, HEIGHT - bottom, colors[bands - 1]);
  // A checkerboard row between bands blends them the pixel-art way
  for (let i = 1; i < bands; i++) dither(ctx, 0, Math.floor(i * bandHeight) - 1, WIDTH, 2, colors[i]);

  // The sun, with retro stripes cut across its lower half
  const cx = 300;
  const cy = 98;
  circle(ctx, cx, cy, 34, P.sunEdge);
  circle(ctx, cx, cy, 32, P.sun);
  circle(ctx, cx - 8, cy - 10, 18, '#fff1c4');
  circle(ctx, cx, cy, 32, P.sun);
  [
    [cy + 10, 2],
    [cy + 17, 3],
    [cy + 25, 4],
  ].forEach(([y, h]) => {
    const color = colors[Math.min(bands - 1, Math.floor(y / bandHeight))];
    rect(ctx, cx - 36, y, 72, h, color);
  });
  // Highlight on the sun's upper left
  rect(ctx, cx - 18, cy - 24, 8, 2, '#fff7dc');
  rect(ctx, cx - 22, cy - 20, 4, 4, '#fff7dc');
  return canvas;
}

// ---------- Clouds: soft pink puffs ----------

function makeCloud(rand) {
  const w = 40 + Math.floor(rand() * 40);
  const [canvas, ctx] = makeCanvas(w + 4, 22);
  const puffs = [];
  for (let x = 8; x < w - 4; x += 7 + Math.floor(rand() * 5)) puffs.push([x, 12 - Math.floor(rand() * 6), 5 + Math.floor(rand() * 4)]);
  // Shade first, then the body a pixel higher, then a highlight on top
  for (const [x, y, r] of puffs) circle(ctx, x, y + 1, r, '#c886b8');
  rect(ctx, 4, 13, w - 6, 5, '#c886b8');
  for (const [x, y, r] of puffs) circle(ctx, x, y, r, '#eaa6c4');
  rect(ctx, 4, 12, w - 6, 4, '#eaa6c4');
  for (const [x, y, r] of puffs) rect(ctx, x - r + 2, y - r + 1, r, 1, '#ffd2df');
  return canvas;
}

function makeClouds(rand) {
  const [canvas, ctx] = makeCanvas(960, 120);
  for (let x = 10; x < 900; x += 120 + Math.floor(rand() * 140)) {
    ctx.drawImage(makeCloud(rand), x, 10 + Math.floor(rand() * 80));
  }
  return canvas;
}

// ---------- Far skyline: hazy purple towers ----------

function makeFarSkyline(rand) {
  const W = 960;
  const H = 130;
  const [canvas, ctx] = makeCanvas(W, H);
  let x = 0;
  while (x < W) {
    const w = Math.min(W - x, 18 + Math.floor(rand() * 34));
    const h = 48 + Math.floor(rand() * 80);
    const top = H - h;
    rect(ctx, x, top, w, h, P.far);
    rect(ctx, x, top, w, 1, P.farLight);
    // Some towers have a narrower top, a spire or an antenna
    const style = rand();
    if (style < 0.3 && w > 14) {
      const sw = Math.floor(w / 2);
      rect(ctx, x + Math.floor((w - sw) / 2), top - 10, sw, 10, P.far);
      rect(ctx, x + Math.floor((w - sw) / 2), top - 10, sw, 1, P.farLight);
    } else if (style < 0.5) {
      rect(ctx, x + Math.floor(w / 2), top - 12, 1, 12, P.far);
    }
    // A few faint lit windows
    for (let wy = top + 5; wy < H - 4; wy += 6) {
      for (let wx = x + 3; wx < x + w - 3; wx += 4) {
        if (rand() < 0.12) rect(ctx, wx, wy, 1, 2, P.farWindow);
      }
    }
    x += w;
  }
  return canvas;
}

// ---------- Mid buildings: dark blocks with warm windows and rooftop stuff ----------

function waterTower(ctx, x, top) {
  // Legs
  rect(ctx, x + 1, top - 6, 1, 6, P.outline);
  rect(ctx, x + 10, top - 6, 1, 6, P.outline);
  rect(ctx, x + 1, top - 4, 10, 1, P.outline);
  // Tank and roof
  box(ctx, x, top - 17, 12, 12, { fill: '#7a5245', light: '#9a6a58', shade: '#5e3d34' });
  rect(ctx, x + 1, top - 12, 10, 1, '#5e3d34');
  rect(ctx, x + 1, top - 20, 10, 3, P.outline);
  rect(ctx, x + 2, top - 22, 8, 2, P.outline);
  rect(ctx, x + 2, top - 19, 8, 1, '#5e3d34');
}

function makeMidBuildings(rand) {
  const W = 1440;
  const H = 190;
  const [canvas, ctx] = makeCanvas(W, H);
  let x = 0;
  while (x < W - 30) {
    x += rand() < 0.35 ? 4 + Math.floor(rand() * 8) : 0; // sometimes a gap between buildings
    const w = Math.min(W - x, 2 * (22 + Math.floor(rand() * 24)));
    if (w < 24) break;
    const h = 78 + Math.floor(rand() * 84);
    const top = H - h;
    box(ctx, x, top, w, h + 1, { fill: P.building, light: P.buildingLight, shade: P.buildingShade });
    // Roof ledge
    rect(ctx, x - 1, top, w + 2, 4, P.outline);
    rect(ctx, x, top + 1, w, 2, '#544a76');
    // Windows in a grid: some lit, some dark
    const lit = 0.3 + rand() * 0.35;
    for (let wy = top + 9; wy < H - 6; wy += 9) {
      for (let wx = x + 5; wx < x + w - 7; wx += 7) {
        if (rand() < lit) {
          rect(ctx, wx, wy, 3, 5, P.window);
          rect(ctx, wx, wy, 3, 1, P.windowLight);
        } else {
          rect(ctx, wx, wy, 3, 5, P.windowOff);
        }
      }
    }
    // Rooftop details
    const extra = rand();
    if (extra < 0.3 && w > 30) {
      waterTower(ctx, x + 6 + Math.floor(rand() * (w - 20)), top);
    } else if (extra < 0.55) {
      const ax = x + 4 + Math.floor(rand() * (w - 8));
      const ah = 10 + Math.floor(rand() * 12);
      rect(ctx, ax, top - ah, 1, ah, P.outline);
      rect(ctx, ax - 1, top - ah - 1, 3, 2, '#ff4d6d'); // little red warning light
    } else if (extra < 0.8) {
      const count = 1 + Math.floor(rand() * 2);
      for (let i = 0; i < count; i++) {
        box(ctx, x + 5 + i * 12, top - 5, 9, 6, { fill: '#6c6488', light: '#857ca3', shade: '#524a6d' });
      }
    }
    x += w;
  }
  return canvas;
}

// ---------- Shops: the street right behind the pavement ----------

const FACADES = [
  { fill: '#7b4b5e', light: '#93617a', shade: '#5f3a4b', brick: '#6a3f51' }, // brick
  { fill: '#5b4f7c', light: '#6d6092', shade: '#463d63' }, // plaster
  { fill: '#3f5a73', light: '#4f6f8a', shade: '#30475c' }, // painted blue
  { fill: '#6e5a4e', light: '#86705f', shade: '#544339', brick: '#5e4b40' }, // brown brick
];
const AWNINGS = [
  ['#ff5fa2', '#ffe3f1'],
  ['#3fd6c8', '#e6fffb'],
  ['#ffb347', '#fff2d6'],
  ['#7b6cff', '#ece9ff'],
];
const NEON = [
  ['#ff5fa2', '#7a1d4c'],
  ['#5ff2e8', '#16605c'],
  ['#ffe066', '#7a5a10'],
  ['#b08cff', '#46307f'],
];
const SIGNS = ['PIZZA', 'OPEN', 'CAFE', '24/7', 'DONUTS', 'RAMEN', 'VINYL', 'TACOS', 'ARCADE', 'COMICS', 'BOBA', 'SNACKS'];

function shopFront(ctx, x, w, h, rand) {
  const top = SHOP_H - h;
  const look = FACADES[Math.floor(rand() * FACADES.length)];
  box(ctx, x, top, w, h + 1, { fill: look.fill, light: look.light, shade: look.shade });
  // Brick pattern: mortar lines with staggered joints
  if (look.brick) {
    for (let y = top + 6; y < SHOP_H - 2; y += 4) {
      rect(ctx, x + 2, y, w - 4, 1, look.brick);
      for (let bx = x + 2 + ((y / 4) % 2) * 4; bx < x + w - 3; bx += 8) rect(ctx, bx, y - 3, 1, 3, look.brick);
    }
  }
  // Cornice along the top
  rect(ctx, x - 1, top, w + 2, 4, P.outline);
  rect(ctx, x, top + 1, w, 2, look.light);

  // Upstairs windows with sills (and the odd flower box)
  for (let wx = x + 6; wx < x + w - 12; wx += 16) {
    const wy = top + 9;
    const lit = rand() < 0.55;
    box(ctx, wx, wy, 10, 13, { fill: lit ? P.window : P.windowOff, light: lit ? P.windowLight : '#3a3352' });
    rect(ctx, wx + 1, wy + 6, 8, 1, P.outline); // window frame bar
    rect(ctx, wx - 1, wy + 13, 12, 2, '#c4bbda');
    rect(ctx, wx - 1, wy + 15, 12, 1, P.outline);
    if (rand() < 0.25) {
      rect(ctx, wx, wy + 11, 10, 2, '#4f9a55');
      for (let fx = wx + 1; fx < wx + 10; fx += 3) rect(ctx, fx, wy + 10, 1, 1, '#ff8fb8');
    }
  }

  // Shop window, glowing warm, with shelves and things on them
  const windowW = Math.floor(w * 0.52);
  const winTop = SHOP_H - 30;
  box(ctx, x + 5, winTop, windowW, 26, { fill: P.window, light: P.windowLight, shade: '#e0a84a' });
  rect(ctx, x + 6, winTop + 13, windowW - 2, 1, '#c98b3b');
  for (let ix = x + 8; ix < x + windowW; ix += 5 + Math.floor(rand() * 4)) {
    const ih = 3 + Math.floor(rand() * 5);
    rect(ctx, ix, winTop + 13 - ih, 3, ih, ['#e07a5f', '#7b6cff', '#3fb8aa', '#c95f8f'][Math.floor(rand() * 4)]);
  }
  // Door with a lit glass panel and a handle
  const doorX = x + w - 20;
  box(ctx, doorX, SHOP_H - 28, 14, 28, { fill: '#2b2440', light: '#3a3352' });
  rect(ctx, doorX + 3, SHOP_H - 25, 8, 9, P.window);
  rect(ctx, doorX + 10, SHOP_H - 13, 2, 1, '#efe3cc');

  // A poster pasted on the wall between the window and the door
  const room = doorX - (x + 5 + windowW);
  if (room >= 14 && rand() < 0.7) {
    const px = x + 5 + windowW + Math.floor((room - 10) / 2);
    const py = SHOP_H - 26;
    const color = ['#ff5fa2', '#3fd6c8', '#ffd166', '#7b6cff'][Math.floor(rand() * 4)];
    box(ctx, px, py, 10, 13, { fill: '#efe3cc', shade: '#c9bfa6' });
    rect(ctx, px + 2, py + 2, 6, 5, color);
    rect(ctx, px + 2, py + 9, 6, 1, '#7c7299');
  }

  // Striped awning with a scalloped edge
  const [stripe, white] = AWNINGS[Math.floor(rand() * AWNINGS.length)];
  const awnTop = winTop - 9;
  rect(ctx, x + 2, awnTop, w - 4, 8, P.outline);
  for (let ax = x + 3; ax < x + w - 3; ax += 4) rect(ctx, ax, awnTop + 1, 2, 6, stripe);
  for (let ax = x + 5; ax < x + w - 3; ax += 4) rect(ctx, ax, awnTop + 1, 2, 6, white);
  for (let ax = x + 3; ax < x + w - 3; ax += 4) rect(ctx, ax, awnTop + 7, 2, 1, stripe);
  rect(ctx, x + 3, awnTop + 1, w - 6, 1, '#ffffff');

  // A neon sign over the awning
  const word = SIGNS[Math.floor(rand() * SIGNS.length)];
  if (word.length * 8 + 10 <= w) {
    const [neon, glow] = NEON[Math.floor(rand() * NEON.length)];
    const signW = word.length * 8 + 8;
    const sx = x + Math.floor((w - signW) / 2);
    box(ctx, sx, awnTop - 15, signW, 13, { fill: '#221c33', light: '#2f2845' });
    pixelText(ctx, word, sx + 4, awnTop - 12, { color: neon, outline: glow });
  }
}

function makeShops(rand) {
  const W = 1600;
  const [canvas, ctx] = makeCanvas(W, SHOP_H);
  let x = 0;
  while (x < W - 60) {
    const w = Math.min(W - x, 84 + 4 * Math.floor(rand() * 12));
    if (w < 70) break;
    shopFront(ctx, x, w, 64 + Math.floor(rand() * 40), rand);
    x += w;
    // Now and then a narrow dark alley with a drainpipe
    if (rand() < 0.3 && x < W - 80) {
      rect(ctx, x, SHOP_H - 70, 8, 70, '#241f36');
      rect(ctx, x + 3, SHOP_H - 70, 2, 70, '#3a3352');
      // A splash of graffiti low on the alley wall
      const tag = ['#ff5fa2', '#5ff2e8', '#ffd166'][Math.floor(rand() * 3)];
      rect(ctx, x + 1, SHOP_H - 16, 2, 5, tag);
      rect(ctx, x + 2, SHOP_H - 19, 4, 2, tag);
      rect(ctx, x + 5, SHOP_H - 14, 2, 4, tag);
      x += 8;
    }
  }
  return canvas;
}

// ---------- Street furniture: lamp posts and traffic lights ----------

function lampPost(ctx, x) {
  // Pole with a base and a decorative ring
  rect(ctx, x, 126, 4, 98, P.outline);
  rect(ctx, x + 1, 127, 2, 96, '#4a4266');
  rect(ctx, x + 1, 127, 1, 96, '#5e5580');
  rect(ctx, x - 2, 212, 8, 12, P.outline);
  rect(ctx, x - 1, 213, 6, 10, '#4a4266');
  rect(ctx, x - 1, 213, 6, 1, '#5e5580');
  rect(ctx, x - 1, 176, 6, 3, P.outline);
  // Curved arm reaching out to the right
  rect(ctx, x + 1, 120, 3, 7, P.outline);
  rect(ctx, x + 2, 118, 14, 3, P.outline);
  rect(ctx, x + 3, 119, 12, 1, '#5e5580');
  // Lamp hood and glowing bulb
  rect(ctx, x + 11, 121, 11, 3, P.outline);
  rect(ctx, x + 12, 122, 9, 1, '#4a4266');
  rect(ctx, x + 12, 124, 9, 3, P.outline);
  rect(ctx, x + 13, 124, 7, 2, '#ffd166');
  rect(ctx, x + 14, 124, 3, 1, '#fff4c9');
  // A little glow under the bulb
  rect(ctx, x + 13, 127, 7, 1, '#ffe6a3');
  rect(ctx, x + 15, 128, 3, 1, '#ffe6a3');
}

function trafficLight(ctx, x, which) {
  rect(ctx, x, 140, 4, 84, P.outline);
  rect(ctx, x + 1, 141, 2, 82, '#4a4266');
  rect(ctx, x - 1, 214, 6, 10, P.outline);
  rect(ctx, x, 215, 4, 8, '#4a4266');
  box(ctx, x - 4, 110, 12, 32, { fill: '#2b2440', light: '#3a3352' });
  const colors = ['#ff4d4d', '#ffb347', '#52d273'];
  colors.forEach((color, i) => {
    const on = i === which;
    circle(ctx, x + 2, 117 + i * 9, 3, on ? color : '#4a4266');
    if (on) rect(ctx, x + 1, 115 + i * 9, 1, 1, '#ffffff');
  });
}

// Lamp posts and traffic lights share one long strip that scrolls at full speed
function makeStreetFurniture(rand) {
  const W = 1440;
  const [canvas, ctx] = makeCanvas(W, HEIGHT);
  for (let x = 60; x < W - 40; x += 180 + Math.floor(rand() * 4) * 30) {
    if (rand() < 0.3) trafficLight(ctx, x, Math.floor(rand() * 3));
    else lampPost(ctx, x);
  }
  return canvas;
}

// ---------- Pavement, curb and road ----------

function makeGround(rand) {
  const W = 960;
  const [canvas, ctx] = makeCanvas(W, HEIGHT - SHOP_BASE);
  // Pavement: back edge, slabs, a seam line, specks and old gum
  rect(ctx, 0, 0, W, 1, P.outline);
  rect(ctx, 0, 1, W, 19, P.sidewalk);
  rect(ctx, 0, 1, W, 1, P.sidewalkLight);
  for (let x = 0; x < W; x += 24) rect(ctx, x, 2, 1, 18, P.sidewalkSeam);
  rect(ctx, 0, 8, W, 1, P.sidewalkSeam);
  for (let i = 0; i < 160; i++) rect(ctx, Math.floor(rand() * W), 3 + Math.floor(rand() * 16), 1, 1, i % 2 ? '#9a90b6' : '#7c7299');
  for (let i = 0; i < 14; i++) rect(ctx, Math.floor(rand() * W), 10 + Math.floor(rand() * 9), 2, 1, '#a99fc6');
  // A few cracks wandering across the slabs
  for (let i = 0; i < 7; i++) {
    let cx = Math.floor(rand() * W);
    let cy = 3 + Math.floor(rand() * 6);
    for (let step = 0; step < 9; step++) {
      rect(ctx, cx, cy, 1, 1, '#685e86');
      cx += 1;
      cy += rand() < 0.5 ? 1 : 0;
      if (cy > 18) break;
    }
  }
  // Curb, with a drain grate now and then
  rect(ctx, 0, 20, W, 1, P.curbLight);
  rect(ctx, 0, 21, W, 3, P.curb);
  rect(ctx, 0, 23, W, 1, P.curbShade);
  rect(ctx, 0, 24, W, 1, P.outline);
  for (const gx of [150, 610]) {
    rect(ctx, gx, 20, 18, 5, P.outline);
    for (let i = 2; i < 18; i += 3) rect(ctx, gx + i, 21, 1, 3, '#2b2440');
  }
  // Road: speckles, lane markings and manhole covers
  rect(ctx, 0, 25, W, HEIGHT - SHOP_BASE - 25, P.road);
  for (let i = 0; i < 260; i++) rect(ctx, Math.floor(rand() * W), 27 + Math.floor(rand() * 21), 2, 1, P.roadSpeck);
  for (let x = 8; x < W; x += 48) rect(ctx, x, 36, 20, 2, P.roadLine);
  for (const mx of [330, 800]) {
    rect(ctx, mx, 28, 22, 5, P.outline);
    rect(ctx, mx + 1, 29, 20, 3, '#3b3548');
    for (let i = 3; i < 20; i += 4) rect(ctx, mx + i, 29, 2, 3, '#2f2a3d');
    rect(ctx, mx + 2, 29, 18, 1, '#5a5470');
  }
  return canvas;
}

// ---------- Putting it all together ----------

export function createDowntown() {
  const rand = sceneryRandom(20261021);
  const layers = {
    sky: makeSky(),
    clouds: makeClouds(rand),
    far: makeFarSkyline(rand),
    mid: makeMidBuildings(rand),
    shops: makeShops(rand),
    furniture: makeStreetFurniture(rand),
    ground: makeGround(rand),
  };

  return {
    // Everything behind the obstacles and the boy, for a given scroll distance
    drawBack(ctx, scroll, time) {
      ctx.drawImage(layers.sky, 0, 0);
      drawStrip(ctx, layers.clouds, scroll * 0.04 + time * 3, 0);
      drawStrip(ctx, layers.far, scroll * 0.1, 216 - layers.far.height);
      drawStrip(ctx, layers.mid, scroll * 0.25, 220 - layers.mid.height);
      drawStrip(ctx, layers.shops, scroll * 0.55, SHOP_BASE - SHOP_H);
      drawStrip(ctx, layers.ground, scroll, SHOP_BASE);
      drawStrip(ctx, layers.furniture, scroll, 0);
    },
  };
}
