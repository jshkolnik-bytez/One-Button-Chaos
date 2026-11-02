// zones/rooftops.js: Rooftops, high above the city at golden hour.
//
// Layers (back to front): golden sky + low sun (still) > long glowing clouds >
// hazy far towers > the rooftops of lower buildings > nearby rooftops with
// water towers and billboards > OUR roof (gravel, parapet, brick front).
// Every layer is drawn once into a long strip; each frame just copies them.
//
// Obstacles: GAP (a deadly drop into an alley), AC_UNIT and VENT.
import { WIDTH, HEIGHT, KIND } from '../../world.js';
import { mixHex } from '../palette.js';
import { makeCanvas, rect, box, circle, dither, sceneryRandom, OUTLINE } from '../pixel.js';
import { drawStrip } from '../strip.js';

const O = OUTLINE;
const ROOF_TOP = 222; // back edge of our roof
const LIP_Y = 244; // the parapet coping along the front of the roof
const FACE_Y = 249; // the brick face of the building starts here

// Sky colours from the top of the screen down to the horizon
const SKY = ['#3f3a86', '#5c4596', '#8b4f9c', '#c25f93', '#ec7a7f', '#ff9a63', '#ffbb63', '#ffd98c'];

// ---------- Sky + sun ----------

function skyColor(t) {
  const f = Math.min(0.999, Math.max(0, t)) * (SKY.length - 1);
  const i = Math.floor(f);
  return mixHex(SKY[i], SKY[i + 1], f - i);
}

function makeSky() {
  const [canvas, ctx] = makeCanvas(WIDTH, HEIGHT);
  const bottom = 222;
  const bands = 16;
  const bandH = bottom / bands;
  const colors = [];
  for (let i = 0; i < bands; i++) colors.push(skyColor(i / (bands - 1)));
  colors.forEach((c, i) => rect(ctx, 0, Math.floor(i * bandH), WIDTH, Math.ceil(bandH) + 1, c));
  rect(ctx, 0, bottom, WIDTH, HEIGHT - bottom, colors[bands - 1]);
  for (let i = 1; i < bands; i++) dither(ctx, 0, Math.floor(i * bandH) - 1, WIDTH, 2, colors[i]);

  // A big low sun with a soft halo, sinking into the city
  const cx = 352;
  const cy = 176;
  for (const [r, c] of [
    [58, mixHex('#ffd98c', '#ffbb63', 0.3)],
    [50, '#ffe2a0'],
  ]) {
    ctx.fillStyle = c;
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      for (let x = cx - half; x <= cx + half; x++) {
        if (((x + cy + dy) & 1) === 0) ctx.fillRect(x, cy + dy, 1, 1); // dithered halo
      }
    }
  }
  circle(ctx, cx, cy, 40, '#ffd27a');
  circle(ctx, cx, cy, 38, '#ffeaa8');
  circle(ctx, cx - 6, cy - 8, 26, '#fff4cc');
  circle(ctx, cx - 12, cy - 16, 10, '#fffbe8');
  // Thin horizontal streaks across the sun (heat haze)
  for (const [y, h] of [
    [cy + 6, 1],
    [cy + 13, 2],
    [cy + 21, 2],
    [cy + 29, 3],
  ]) {
    rect(ctx, cx - 42, y, 84, h, skyColor(y / 222));
  }
  return canvas;
}

// ---------- Clouds: long golden streaks lit from below ----------

function makeClouds(rand) {
  const W = 1200;
  const [canvas, ctx] = makeCanvas(W, 150);
  for (let x = 20; x < W - 120; x += 140 + Math.floor(rand() * 160)) {
    const y = 18 + Math.floor(rand() * 110);
    const w = 60 + Math.floor(rand() * 90);
    const t = y / 222;
    const body = mixHex(skyColor(t), '#ffd3a0', 0.45);
    const top = mixHex(skyColor(t), '#7c4b97', 0.35);
    const lit = mixHex(body, '#fff1c8', 0.6);
    // Two or three stacked streaks, each a little shorter
    let sx = x;
    let sw = w;
    for (let row = 0; row < 3 && sw > 16; row++) {
      const yy = y + row * 3;
      rect(ctx, sx + 2, yy, sw - 4, 1, top);
      rect(ctx, sx, yy + 1, sw, 2, body);
      rect(ctx, sx + 3, yy + 3, sw - 6, 1, lit);
      sx += 6 + Math.floor(rand() * 10);
      sw -= 18 + Math.floor(rand() * 14);
    }
  }
  return canvas;
}

// ---------- Far towers: hazy pink skyscrapers on the horizon ----------

function makeFarTowers(rand) {
  const W = 1200;
  const H = 130;
  const [canvas, ctx] = makeCanvas(W, H);
  const body = '#c0708e';
  const rim = '#e48c92';
  const win = '#e9a3a8';
  let x = 0;
  while (x < W) {
    const w = Math.min(W - x, 14 + Math.floor(rand() * 30));
    const h = 30 + Math.floor(rand() * 90);
    const top = H - h;
    rect(ctx, x, top, w, h, body);
    rect(ctx, x + w - 2, top, 2, h, rim); // the sunny side
    const style = rand();
    if (style < 0.25 && w > 12) {
      // stepped top
      const sw = Math.floor(w * 0.6);
      const sx = x + Math.floor((w - sw) / 2);
      rect(ctx, sx, top - 8, sw, 8, body);
      rect(ctx, sx + sw - 2, top - 8, 2, 8, rim);
      rect(ctx, sx + Math.floor(sw / 2), top - 18, 1, 10, body);
    } else if (style < 0.45) {
      // spire
      for (let i = 0; i < 6; i++) rect(ctx, x + Math.floor(w / 2) - (5 - i) / 2, top - i * 2 - 2, 6 - i, 2, body);
      rect(ctx, x + Math.floor(w / 2), top - 20, 1, 8, body);
    } else if (style < 0.6) {
      rect(ctx, x + 3, top - 9, 1, 9, body);
      rect(ctx, x + 2, top - 10, 3, 1, '#ff5a6a');
    }
    for (let wy = top + 4; wy < H - 3; wy += 5) {
      for (let wx = x + 2; wx < x + w - 3; wx += 3) if (rand() < 0.1) rect(ctx, wx, wy, 1, 2, win);
    }
    x += w + (rand() < 0.3 ? 2 + Math.floor(rand() * 6) : 0);
  }
  return canvas;
}

// ---------- The rooftops of lower buildings (we're above them) ----------

function waterTower(ctx, x, base, tone) {
  const { fill, light, shade } = tone;
  // Legs and cross braces
  rect(ctx, x + 1, base - 9, 1, 9, O);
  rect(ctx, x + 12, base - 9, 1, 9, O);
  rect(ctx, x + 6, base - 9, 1, 9, O);
  rect(ctx, x + 1, base - 6, 12, 1, O);
  for (let i = 0; i < 5; i++) rect(ctx, x + 2 + i, base - 8 + i, 1, 1, O);
  // Tank with hoops
  box(ctx, x, base - 24, 14, 15, { fill, light, shade });
  rect(ctx, x + 1, base - 19, 12, 1, shade);
  rect(ctx, x + 1, base - 14, 12, 1, shade);
  rect(ctx, x + 10, base - 23, 2, 13, light); // sunlit side
  // Cone roof with a little finial
  rect(ctx, x - 1, base - 26, 16, 2, O);
  rect(ctx, x + 1, base - 28, 12, 2, O);
  rect(ctx, x + 3, base - 30, 8, 2, O);
  rect(ctx, x + 6, base - 32, 2, 2, O);
  rect(ctx, x + 2, base - 27, 10, 1, '#5b3a3a');
  rect(ctx, x + 4, base - 29, 6, 1, '#5b3a3a');
}

function makeLowRoofs(rand) {
  const W = 1440;
  const H = 120;
  const [canvas, ctx] = makeCanvas(W, H);
  const fill = '#6b4a78';
  const light = '#8a5f86';
  const shade = '#553a63';
  let x = 0;
  while (x < W - 24) {
    const w = Math.min(W - x, 30 + Math.floor(rand() * 50));
    const top = 50 + Math.floor(rand() * 50);
    box(ctx, x, top, w, H - top + 1, { fill, light, shade });
    rect(ctx, x - 1, top, w + 2, 3, O);
    rect(ctx, x, top + 1, w, 1, '#d98a7a'); // sunset on the ledge
    // Windows, warm and dim
    for (let wy = top + 7; wy < H - 2; wy += 7) {
      for (let wx = x + 4; wx < x + w - 5; wx += 6) {
        rect(ctx, wx, wy, 2, 4, rand() < 0.35 ? '#ffc56b' : '#4a3358');
      }
    }
    const extra = rand();
    if (extra < 0.3 && w > 22) {
      waterTower(ctx, x + 4 + Math.floor(rand() * (w - 20)), top, { fill: '#7a5245', light: '#b0775c', shade: '#5e3d34' });
    } else if (extra < 0.55) {
      const ax = x + 3 + Math.floor(rand() * (w - 6));
      rect(ctx, ax, top - 14, 1, 14, O);
      rect(ctx, ax - 3, top - 11, 7, 1, O);
      rect(ctx, ax - 2, top - 7, 5, 1, O);
    } else if (extra < 0.75) {
      box(ctx, x + 4, top - 7, 10, 8, { fill: '#7b6a8a', light: '#9a88a8', shade: '#5e4f6e' });
    }
    x += w + (rand() < 0.25 ? 3 : 0);
  }
  return canvas;
}

// ---------- Nearby rooftops, about as high as ours ----------

function billboard(ctx, x, base, rand) {
  const w = 54;
  const top = base - 46;
  // Scaffold legs
  for (const lx of [x + 6, x + w - 8]) {
    rect(ctx, lx, top + 26, 2, 20, O);
  }
  for (let i = 0; i < 4; i++) rect(ctx, x + 8 + i * 9, top + 30 + (i % 2) * 6, 9, 1, O);
  // Board
  box(ctx, x, top, w, 28, { fill: '#2b2440', light: '#3a3352' });
  const ads = [
    ['#ff5fa2', '#ffe3f1', 'SKATE'],
    ['#3fd6c8', '#e6fffb', 'SODA'],
    ['#ffb347', '#fff2d6', 'PIZZA'],
  ];
  const [c1, c2] = ads[Math.floor(rand() * ads.length)];
  rect(ctx, x + 2, top + 2, w - 4, 24, c2);
  rect(ctx, x + 2, top + 16, w - 4, 10, c1);
  circle(ctx, x + 14, top + 12, 6, c1);
  circle(ctx, x + 14, top + 12, 3, c2);
  rect(ctx, x + 24, top + 6, 24, 3, c1);
  rect(ctx, x + 24, top + 11, 16, 2, '#7c7299');
  rect(ctx, x + 6, top + 19, w - 12, 2, c2);
  // Lamps over the board
  for (const lx of [x + 10, x + w - 14]) {
    rect(ctx, lx, top - 4, 1, 4, O);
    rect(ctx, lx - 1, top - 5, 5, 2, O);
    rect(ctx, lx, top - 4, 3, 1, '#ffe39a');
  }
}

function makeNearRoofs(rand) {
  const W = 1600;
  const H = 150;
  const [canvas, ctx] = makeCanvas(W, H);
  const looks = [
    { fill: '#46304f', light: '#5d4064', shade: '#36253f', brick: '#3c2945' },
    { fill: '#3b3555', light: '#4d4569', shade: '#2e2944' },
    { fill: '#4f3442', light: '#674456', shade: '#3c2733', brick: '#432b38' },
  ];
  let x = 0;
  while (x < W - 40) {
    const w = Math.min(W - x, 60 + 4 * Math.floor(rand() * 18));
    if (w < 44) break;
    const top = 92 + Math.floor(rand() * 34);
    const look = looks[Math.floor(rand() * looks.length)];
    box(ctx, x, top, w, H - top + 1, { fill: look.fill, light: look.light, shade: look.shade });
    if (look.brick) {
      for (let y = top + 7; y < H; y += 4) {
        rect(ctx, x + 2, y, w - 4, 1, look.brick);
        for (let bx = x + 2 + ((y / 4) % 2) * 4; bx < x + w - 3; bx += 8) rect(ctx, bx, y - 3, 1, 3, look.brick);
      }
    }
    // Parapet with sunlit coping
    rect(ctx, x - 1, top - 2, w + 2, 5, O);
    rect(ctx, x, top - 1, w, 2, '#e7a079');
    rect(ctx, x, top + 1, w, 1, '#a9677a');
    // A few windows near the top, catching the sun
    for (let wx = x + 6; wx < x + w - 10; wx += 12) {
      const glow = rand() < 0.5;
      box(ctx, wx, top + 8, 7, 9, { fill: glow ? '#ffc56b' : '#2c2140', light: glow ? '#ffe7a8' : '#3b2d52' });
      rect(ctx, wx, top + 12, 7, 1, O);
    }
    // Stuff on the roof
    const extra = rand();
    if (extra < 0.32 && w > 36) {
      waterTower(ctx, x + 8 + Math.floor(rand() * (w - 26)), top - 2, { fill: '#8a5a48', light: '#c98a62', shade: '#64402f' });
    } else if (extra < 0.5 && w > 60) {
      billboard(ctx, x + Math.floor((w - 54) / 2), top - 2, rand);
    } else if (extra < 0.68) {
      // Stairwell hut with a door
      const hx = x + 6 + Math.floor(rand() * (w - 30));
      box(ctx, hx, top - 18, 22, 17, { fill: '#5a4466', light: '#e7a079', shade: '#432f4f' });
      rect(ctx, hx - 1, top - 20, 24, 3, O);
      box(ctx, hx + 13, top - 13, 6, 12, { fill: '#2b2440', light: '#3a3352' });
    } else if (extra < 0.85) {
      // TV antennas and a satellite dish
      const ax = x + 5 + Math.floor(rand() * (w - 20));
      rect(ctx, ax, top - 20, 1, 18, O);
      rect(ctx, ax - 4, top - 18, 9, 1, O);
      rect(ctx, ax - 3, top - 14, 7, 1, O);
      rect(ctx, ax - 2, top - 10, 5, 1, O);
      circle(ctx, ax + 12, top - 7, 4, O);
      circle(ctx, ax + 12, top - 7, 3, '#cbbfdd');
      rect(ctx, ax + 11, top - 3, 2, 2, O);
    }
    x += w + (rand() < 0.4 ? 6 + Math.floor(rand() * 10) : 0);
  }
  return canvas;
}

// ---------- Our roof: gravel top, parapet lip, brick front ----------

function makeRoof(rand) {
  const W = 960;
  const H = HEIGHT - ROOF_TOP + 2;
  const [canvas, ctx] = makeCanvas(W, H);
  const y0 = 0; // = ROOF_TOP on screen
  // Tar-and-gravel surface, a touch darker toward the back
  rect(ctx, 0, y0, W, 1, O);
  rect(ctx, 0, y0 + 1, W, LIP_Y - ROOF_TOP - 1, '#7d6a78');
  rect(ctx, 0, y0 + 1, W, 3, '#6c5b6b');
  dither(ctx, 0, y0 + 4, W, 2, '#7d6a78');
  rect(ctx, 0, y0 + 1, W, 1, '#a28a8e'); // light catching the back edge
  for (let i = 0; i < 420; i++) {
    const c = ['#8f7b86', '#6a5866', '#9c8790', '#5d4d5c'][i % 4];
    rect(ctx, Math.floor(rand() * W), y0 + 5 + Math.floor(rand() * 16), 1, 1, c);
  }
  // Tar seams between roofing sheets
  for (let x = 30; x < W; x += 96 + Math.floor(rand() * 40)) {
    for (let y = y0 + 3; y < LIP_Y; y++) rect(ctx, x + Math.floor((y - y0) / 6), y, 1, 1, '#5b4a59');
  }
  // Low roof hatches and a drain, pushed to the back so they don't look like obstacles
  for (let x = 120; x < W - 40; x += 260 + Math.floor(rand() * 80)) {
    rect(ctx, x, y0 + 2, 22, 4, O);
    rect(ctx, x + 1, y0 + 3, 20, 2, '#625262');
    rect(ctx, x + 1, y0 + 3, 20, 1, '#8a7682');
    rect(ctx, x + 10, y0 + 3, 1, 2, O);
  }
  // Parapet coping along the front (warm stone, lit by the sun)
  rect(ctx, 0, LIP_Y - ROOF_TOP, W, 1, O);
  rect(ctx, 0, LIP_Y - ROOF_TOP + 1, W, 3, '#d9a07e');
  rect(ctx, 0, LIP_Y - ROOF_TOP + 1, W, 1, '#ffd2a0');
  rect(ctx, 0, LIP_Y - ROOF_TOP + 3, W, 1, '#a8706a');
  for (let x = 12; x < W; x += 24) rect(ctx, x, LIP_Y - ROOF_TOP + 1, 1, 3, '#a8706a');
  rect(ctx, 0, FACE_Y - ROOF_TOP - 1, W, 1, O);
  // Brick face of the building below
  const face = FACE_Y - ROOF_TOP;
  rect(ctx, 0, face, W, H - face, '#6a3f51');
  rect(ctx, 0, face, W, 2, '#3a2235'); // shadow under the coping
  for (let y = face + 4; y < H; y += 4) {
    rect(ctx, 0, y, W, 1, '#55303f');
    for (let bx = ((y / 4) % 2) * 4; bx < W; bx += 8) rect(ctx, bx, y - 3, 1, 3, '#55303f');
  }
  for (let i = 0; i < 90; i++) rect(ctx, Math.floor(rand() * W), face + 3 + Math.floor(rand() * 14), 2, 1, '#7d4d5f');
  // Tops of the top-floor windows peeking up from below the screen
  for (let x = 20; x < W - 20; x += 40) {
    const lit = rand() < 0.5;
    rect(ctx, x - 1, H - 9, 16, 1, '#c98a7a');
    rect(ctx, x - 1, H - 8, 16, 8, O);
    rect(ctx, x, H - 7, 14, 7, lit ? '#ffc56b' : '#2c2140');
    rect(ctx, x, H - 7, 14, 1, lit ? '#ffe7a8' : '#3b2d52');
    rect(ctx, x + 7, H - 7, 1, 7, O);
  }
  return canvas;
}

// ---------- Birds drifting across the sky ----------

function drawBirds(ctx, scroll, time) {
  const flocks = [
    [0, 64, 5],
    [310, 92, 3],
    [620, 48, 4],
  ];
  const span = WIDTH + 120;
  for (const [start, y, n] of flocks) {
    const fx = (((start - scroll * 0.07 - time * 9) % span) + span) % span - 60;
    for (let i = 0; i < n; i++) {
      const bx = Math.round(fx + i * 9 - (i % 2) * 3);
      const by = y + Math.abs(i - 2) * 3 + Math.round(Math.sin(time * 1.3 + i) * 1.5);
      const up = Math.floor(time * 6 + i * 1.7) % 2 === 0;
      const c = '#4a2f5a';
      if (up) {
        rect(ctx, bx, by - 1, 1, 1, c);
        rect(ctx, bx + 1, by, 1, 1, c);
        rect(ctx, bx + 2, by, 1, 1, c);
        rect(ctx, bx + 3, by - 1, 1, 1, c);
      } else {
        rect(ctx, bx, by + 1, 1, 1, c);
        rect(ctx, bx + 1, by, 2, 1, c);
        rect(ctx, bx + 3, by + 1, 1, 1, c);
      }
    }
  }
}

// ---------- Obstacles ----------

// The view down into an alley, as a repeating tile 48 px wide.
// Row 0 is the top of the gap (just above ROOF_TOP); it gets darker the deeper it goes.
function makeAlley() {
  const W = 48;
  const H = HEIGHT - ROOF_TOP + 2;
  const [canvas, ctx] = makeCanvas(W, H);
  const depth = ['#2a1d3b', '#211730', '#1a1227', '#130d1e', '#0e0a17'];
  const bandH = Math.ceil(H / depth.length);
  depth.forEach((c, i) => rect(ctx, 0, i * bandH, W, bandH, c));
  for (let i = 1; i < depth.length; i++) dither(ctx, 0, i * bandH - 1, W, 2, depth[i]);
  // The far wall of the alley: faint bricks that fade into the dark
  for (let y = 3; y < 22; y += 4) {
    for (let bx = ((y / 4) % 2) * 4; bx < W; bx += 8) rect(ctx, bx, y, 3, 1, y < 12 ? '#35264a' : '#281c39');
  }
  // A dim fire escape: a landing, its railing and a ladder dropping away
  rect(ctx, 10, 14, 22, 1, '#3d2e52');
  for (let x = 10; x < 32; x += 3) rect(ctx, x, 11, 1, 3, '#33264a');
  rect(ctx, 10, 11, 22, 1, '#33264a');
  rect(ctx, 28, 15, 1, 14, '#2c2140');
  rect(ctx, 31, 15, 1, 14, '#2c2140');
  for (let y = 17; y < 29; y += 3) rect(ctx, 28, y, 4, 1, '#2c2140');
  // A drainpipe running all the way down
  rect(ctx, 42, 0, 2, H - 8, '#2a1f3c');
  rect(ctx, 42, 0, 1, H - 8, '#3a2c50');
  // Faint glow from the street, very far below
  dither(ctx, 0, H - 7, W, 2, '#3a1f35');
  rect(ctx, 0, H - 5, W, 5, '#3a1f35');
  dither(ctx, 0, H - 3, W, 3, '#5a2f45');
  rect(ctx, 20, H - 2, 4, 1, '#c86a4a');
  return canvas;
}

function makeAcUnit(fan) {
  const [canvas, ctx] = makeCanvas(22, 16);
  // Feet
  rect(ctx, 2, 14, 4, 2, O);
  rect(ctx, 16, 14, 4, 2, O);
  // Body
  box(ctx, 0, 1, 22, 14, { fill: '#b9c4dd', light: '#eef2fb', shade: '#7f8aa8' });
  rect(ctx, 1, 2, 20, 1, '#ffffff');
  rect(ctx, 1, 0, 20, 2, O);
  rect(ctx, 2, 1, 18, 1, '#d7deef');
  // Louvres on the left
  for (let y = 4; y < 13; y += 2) rect(ctx, 2, y, 7, 1, '#6f7a98');
  // Round fan on the right
  circle(ctx, 15, 8, 5, O);
  circle(ctx, 15, 8, 4, '#3a3352');
  const blades = [
    [
      [0, -3],
      [0, -2],
      [0, 2],
      [0, 3],
      [-3, 0],
      [-2, 0],
      [2, 0],
      [3, 0],
    ],
    [
      [-2, -2],
      [-1, -1],
      [1, 1],
      [2, 2],
      [2, -2],
      [1, -1],
      [-1, 1],
      [-2, 2],
    ],
  ][fan];
  for (const [dx, dy] of blades) rect(ctx, 15 + dx, 8 + dy, 1, 1, '#c9d1e6');
  rect(ctx, 15, 8, 1, 1, '#ffffff');
  // Sticker + rust streak so it isn't too clean
  rect(ctx, 3, 12, 4, 1, '#ffb347');
  rect(ctx, 20, 9, 1, 4, '#a07a6a');
  return canvas;
}

function makeVent() {
  const [canvas, ctx] = makeCanvas(12, 24);
  // Mushroom cap
  rect(ctx, 0, 2, 12, 4, O);
  rect(ctx, 1, 3, 10, 2, '#c9cfdc');
  rect(ctx, 1, 3, 10, 1, '#f4f6fb');
  rect(ctx, 3, 0, 6, 2, O);
  rect(ctx, 4, 1, 4, 1, '#c9cfdc');
  // Gap under the cap where the smoke comes out
  rect(ctx, 2, 6, 8, 2, O);
  rect(ctx, 3, 6, 6, 1, '#2b2440');
  // Pipe with a band and rivets
  box(ctx, 2, 7, 8, 15, { fill: '#9aa3b8', light: '#d4dae6', shade: '#6b7390' });
  rect(ctx, 2, 12, 8, 2, O);
  rect(ctx, 3, 12, 6, 1, '#6b7390');
  rect(ctx, 4, 16, 1, 1, '#4a5170');
  rect(ctx, 7, 18, 1, 1, '#4a5170');
  // Flashing at the base
  rect(ctx, 0, 21, 12, 3, O);
  rect(ctx, 1, 21, 10, 2, '#7d6a78');
  rect(ctx, 1, 21, 10, 1, '#a28a8e');
  return canvas;
}

function drawGap(ctx, o, alley) {
  const x = o.x;
  const w = o.w;
  const top = ROOF_TOP - 1;
  const h = HEIGHT - top;
  // The alley seen between the two buildings (tile anchored to the gap, so it scrolls with it)
  for (let tx = 0; tx < w; tx += alley.width) {
    const cw = Math.min(alley.width, w - tx);
    ctx.drawImage(alley, 0, 0, cw, h, x + tx, top, cw, h);
  }
  // Left edge: the end of our building: an outline, a parapet corner cap and a dark side wall
  rect(ctx, x, top, 2, h, O);
  rect(ctx, x + 2, top + 1, 2, h, '#0b0812'); // deep shadow cast into the gap
  rect(ctx, x - 3, LIP_Y - 2, 5, 7, O);
  rect(ctx, x - 2, LIP_Y - 1, 3, 4, '#d9a07e');
  rect(ctx, x - 2, LIP_Y - 1, 3, 1, '#ffe2b0');
  // Right edge: the next building's corner, its side wall catching the sun
  const rx = x + w;
  rect(ctx, rx - 5, top + 1, 3, h, '#4f3360');
  rect(ctx, rx - 5, top + 1, 1, h, '#6a4675');
  for (let y = top + 4; y < HEIGHT; y += 4) rect(ctx, rx - 4, y, 2, 1, '#3d2850');
  rect(ctx, rx - 2, top, 2, h, O);
  rect(ctx, rx - 2, LIP_Y - 2, 5, 7, O);
  rect(ctx, rx - 1, LIP_Y - 1, 3, 4, '#d9a07e');
  rect(ctx, rx - 1, LIP_Y - 1, 3, 1, '#ffe2b0');
  // Hazard stripes painted on the roof right at both edges
  for (const [sx, dir] of [
    [x - 13, 1],
    [rx + 2, 1],
  ]) {
    rect(ctx, sx, ROOF_TOP + 13, 11, 5, O);
    rect(ctx, sx + 1, ROOF_TOP + 14, 9, 3, '#ffcf3f');
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 3; j++) if ((i + j * dir) % 4 < 2) rect(ctx, sx + 1 + i, ROOF_TOP + 14 + j, 1, 1, '#2b2440');
    }
  }
}

export function createRooftops() {
  const rand = sceneryRandom(5150);
  const layers = {
    sky: makeSky(),
    clouds: makeClouds(rand),
    far: makeFarTowers(rand),
    low: makeLowRoofs(rand),
    near: makeNearRoofs(rand),
    roof: makeRoof(rand),
  };
  const alley = makeAlley();
  const ac = [makeAcUnit(0), makeAcUnit(1)];
  const vent = makeVent();

  return {
    drawBack(ctx, scroll, time) {
      ctx.drawImage(layers.sky, 0, 0);
      drawStrip(ctx, layers.clouds, scroll * 0.04 + time * 2, 0);
      drawBirds(ctx, scroll, time);
      drawStrip(ctx, layers.far, scroll * 0.1, 214 - layers.far.height);
      drawStrip(ctx, layers.low, scroll * 0.25, 222 - layers.low.height);
      drawStrip(ctx, layers.near, scroll * 0.55, 224 - layers.near.height);
      drawStrip(ctx, layers.roof, scroll, ROOF_TOP);
    },

    drawObstacle(ctx, o, time) {
      if (o.kind === KIND.GAP) {
        drawGap(ctx, o, alley);
      } else if (o.kind === KIND.AC_UNIT) {
        rect(ctx, o.x + 1, o.y + o.h, o.w - 1, 1, '#5d4d5c');
        ctx.drawImage(ac[Math.floor(time * 14) % 2], o.x, o.y);
      } else if (o.kind === KIND.VENT) {
        rect(ctx, o.x + 1, o.y + o.h, o.w - 1, 1, '#5d4d5c');
        ctx.drawImage(vent, o.x, o.y);
        // A wisp of steam drifting up from under the cap (just for looks)
        const t = (time * 1.4) % 1;
        const sy = o.y - 2 - Math.floor(t * 10);
        const sx = o.x + 4 - Math.floor(t * 4);
        if (t < 0.8) {
          rect(ctx, sx, sy, 3, 2, t < 0.4 ? '#f6e9f2' : '#d9c3d6');
          if (t > 0.2) rect(ctx, sx - 2, sy - 2, 2, 1, '#d9c3d6');
        }
      }
    },
  };
}
