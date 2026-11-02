// zones/subway.js: Subway, an underground station lit by teal neon.
//
// The boy can ride the FLOOR (wheels at GROUND_Y) or, upside down, the
// CEILING (wheels at CEIL_Y), so both are drawn as matching platforms with
// yellow safety lines. Between them is the tiled station wall, with big
// arches you can see the other track through, where trains whoosh past.
//
// Layers (back to front): far tunnel + other track (0.3) > trains (time) >
// tiled wall with arches (0.5) > ceiling slab and vault (1.0) > floor (1.0).
//
// Obstacles: BARRIER, FLOOR_SPIKES (floor) and CEIL_PIPE, CEIL_SPIKES (ceiling).
import { WIDTH, HEIGHT, CEIL_Y, KIND } from '../../world.js';
import { makeCanvas, rect, box, circle, dither, pixelText, sceneryRandom, OUTLINE } from '../pixel.js';
import { drawStrip, snap } from '../strip.js';

const O = OUTLINE;
const FLOOR_TOP = 222; // back edge of the platform
const FLOOR_LIP = 246; // front edge of the platform
const CEIL_TOP = 120; // top of the ceiling slab's front face
const WALL_TOP = CEIL_Y; // the wall fills the space between the two platforms
const WALL_BOTTOM = FLOOR_TOP;

const C = {
  void: '#0c141c',
  vault: '#132029',
  vaultLight: '#1b2c37',
  rib: '#0e1820',
  concrete: '#56606e',
  concreteLight: '#727e8e',
  concreteShade: '#414956',
  speck: '#4a5361',
  safety: '#ffcf3f',
  safetyDot: '#d9a22a',
  tile: '#3f8f8a',
  tileLight: '#5fb3a9',
  tileShade: '#337873',
  grout: '#25555a',
  trim: '#1d3a45',
  neon: '#3fd6c8',
  neonHot: '#b8fff4',
  tube: '#e8fff9',
  tubeOff: '#5a6a72',
};

// ---------- Far tunnel: the other track, seen through the arches ----------

function makeFarTunnel(rand) {
  const W = 960;
  const H = WALL_BOTTOM - WALL_TOP;
  const [canvas, ctx] = makeCanvas(W, H);
  // The far wall of the other tunnel: dark old tiles
  rect(ctx, 0, 0, W, H, '#10202a');
  for (let y = 18; y < 44; y += 3) {
    for (let x = ((y / 3) % 2) * 3; x < W; x += 6) rect(ctx, x, y, 5, 2, '#142833');
  }
  // A row of warm tunnel lamps with soft glow, and cable runs
  rect(ctx, 0, 27, W, 1, '#22384a');
  rect(ctx, 0, 30, W, 1, '#1a2d3a');
  for (let x = 10; x < W; x += 48) {
    dither(ctx, x - 4, 19, 14, 7, '#2a3d48');
    rect(ctx, x, 21, 6, 4, O);
    rect(ctx, x + 1, 22, 4, 2, '#f2c66b');
    rect(ctx, x + 2, 22, 2, 1, '#fff2c0');
  }
  // Graffiti tags now and then
  for (let x = 100; x < W; x += 230 + Math.floor(rand() * 60)) {
    const c = ['#ff5fa2', '#7b6cff', '#3fd6c8'][Math.floor(rand() * 3)];
    for (let i = 0; i < 18; i++) rect(ctx, x + i, 37 + Math.round(Math.sin(i * 0.9) * 2), 1, 2, c);
  }
  // Platform edge and rails of the other track
  rect(ctx, 0, 44, W, 2, '#2a3846');
  rect(ctx, 0, 46, W, H - 46, '#0b1218');
  for (let x = 0; x < W; x += 8) rect(ctx, x, 52, 4, 2, '#2a2420');
  rect(ctx, 0, 50, W, 1, '#6d7a88');
  rect(ctx, 0, 55, W, 1, '#6d7a88');
  for (let i = 0; i < 40; i++) rect(ctx, Math.floor(rand() * W), 47 + Math.floor(rand() * 2), 1, 1, '#25313b');
  return canvas;
}

// ---------- A subway train (seen from the side) ----------

function makeTrain() {
  const carW = 150;
  const cars = 4;
  const W = carW * cars;
  const H = 52;
  const [canvas, ctx] = makeCanvas(W, H);
  for (let c = 0; c < cars; c++) {
    const x = c * carW;
    box(ctx, x + 2, 2, carW - 4, H - 6, { fill: '#9fb0c2', light: '#d6e2ee', shade: '#6f8094' });
    // Teal stripe and roof line
    rect(ctx, x + 3, 2, carW - 6, 3, '#7d8ea2');
    rect(ctx, x + 3, H - 18, carW - 6, 4, C.neon);
    rect(ctx, x + 3, H - 18, carW - 6, 1, C.neonHot);
    // Windows with people's silhouettes
    for (let wx = x + 12; wx < x + carW - 22; wx += 22) {
      rect(ctx, wx, 9, 16, 14, O);
      rect(ctx, wx + 1, 10, 14, 12, '#ffe7a3');
      rect(ctx, wx + 1, 10, 14, 2, '#fff6d6');
      if ((wx / 22) % 3 < 2) {
        const px = wx + 4 + ((wx * 7) % 6);
        circle(ctx, px + 2, 15, 2, '#3a3a52');
        rect(ctx, px, 17, 5, 5, '#3a3a52');
      }
    }
    // Doors
    for (const dx of [x + 40, x + 106]) {
      rect(ctx, dx, 8, 12, H - 16, O);
      rect(ctx, dx + 1, 9, 10, H - 18, '#8899ad');
      rect(ctx, dx + 6, 9, 1, H - 18, O);
      rect(ctx, dx + 2, 11, 3, 8, '#ffe7a3');
      rect(ctx, dx + 7, 11, 3, 8, '#ffe7a3');
    }
    // Coupler and wheels
    rect(ctx, x, H - 12, 4, 3, O);
    for (const wx of [x + 18, x + 30, x + carW - 34, x + carW - 22]) {
      circle(ctx, wx, H - 4, 3, O);
      rect(ctx, wx - 1, H - 5, 2, 2, '#6d7a88');
    }
  }
  // Number on the front car
  pixelText(ctx, '7', 8, 26, { color: '#ffffff', outline: O });
  return canvas;
}

// ---------- The tiled station wall, with arches cut through it ----------

function tilePatch(ctx, x, y, w, h) {
  rect(ctx, x, y, w, h, C.grout);
  for (let ty = y; ty < y + h; ty += 4) {
    const shift = ((ty - y) / 4) % 2 ? 4 : 0;
    for (let tx = x - shift; tx < x + w; tx += 8) {
      const l = Math.max(tx, x);
      const r = Math.min(tx + 7, x + w);
      if (r <= l) continue;
      rect(ctx, l, ty, r - l, 3, C.tile);
      rect(ctx, l, ty, r - l, 1, C.tileLight);
      rect(ctx, l, ty + 2, r - l, 1, C.tileShade);
    }
  }
}

function makeWall(rand) {
  const W = 1280;
  const H = WALL_BOTTOM - WALL_TOP;
  const [canvas, ctx] = makeCanvas(W, H);
  tilePatch(ctx, 0, 0, W, H);
  // Dark trim bands top and bottom, with a thin neon line
  rect(ctx, 0, 0, W, 7, C.trim);
  rect(ctx, 0, 7, W, 1, O);
  rect(ctx, 0, 4, W, 1, C.neon);
  rect(ctx, 0, H - 9, W, 9, C.trim);
  rect(ctx, 0, H - 10, W, 1, O);
  rect(ctx, 0, H - 6, W, 1, '#2c5560');

  let x = 30;
  let piece = 0;
  while (x < W - 140) {
    if (piece % 2 === 0) {
      // An arch: a window through to the other track (transparent)
      const aw = 112 + Math.floor(rand() * 3) * 16;
      const top = 16;
      const bottom = H - 14;
      // Frame
      rect(ctx, x - 3, top - 3, aw + 6, bottom - top + 3, O);
      rect(ctx, x - 2, top - 2, aw + 4, bottom - top + 2, '#c9d8d6');
      rect(ctx, x - 2, top - 2, aw + 4, 1, '#ffffff');
      // Cut out the opening (round top corners)
      ctx.clearRect(x, top + 2, aw, bottom - top - 2);
      ctx.clearRect(x + 2, top, aw - 4, 2);
      ctx.clearRect(x + 1, top + 1, aw - 2, 1);
      // Railing across the bottom of the arch
      rect(ctx, x, bottom - 6, aw, 1, '#8aa6aa');
      for (let rx = x + 4; rx < x + aw; rx += 8) rect(ctx, rx, bottom - 6, 1, 6, '#6f8b90');
      x += aw + 26;
    } else {
      // Between arches: a station sign, a poster and a clock
      const sign = rand() < 0.5 ? 'CHAOS ST' : 'LINE 7';
      const sw = sign.length * 8 + 10;
      box(ctx, x, 14, sw, 14, { fill: '#1d2b52', light: '#2c3f73', shade: '#141e3b' });
      pixelText(ctx, sign, x + 5, 17, { color: '#ffffff' });
      rect(ctx, x + 2, 26, sw - 4, 1, C.neon);
      // Poster
      const colors = [
        ['#ff5fa2', '#ffe3f1'],
        ['#ffcf3f', '#2b2440'],
        ['#7b6cff', '#ece9ff'],
      ][Math.floor(rand() * 3)];
      const px = x + Math.floor(sw / 2) - 11;
      box(ctx, px, 34, 22, 28, { fill: colors[1], shade: '#9aa6b0' });
      rect(ctx, px + 3, 37, 16, 12, colors[0]);
      circle(ctx, px + 11, 43, 4, colors[1]);
      rect(ctx, px + 3, 52, 16, 2, colors[0]);
      rect(ctx, px + 3, 56, 10, 1, '#7c7299');
      // Clock
      const cx = x + sw - 10;
      circle(ctx, cx, 48, 6, O);
      circle(ctx, cx, 48, 5, '#f4f1ea');
      rect(ctx, cx, 44, 1, 4, O);
      rect(ctx, cx, 48, 3, 1, O);
      x += sw + 28;
    }
    piece++;
  }
  // Grime streaks running down from the top trim
  for (let i = 0; i < 30; i++) {
    const gx = Math.floor(rand() * W);
    const len = 4 + Math.floor(rand() * 10);
    for (let y = 8; y < 8 + len; y += 2) rect(ctx, gx, y, 1, 1, '#2d6a6a');
  }
  return canvas;
}

// ---------- The ceiling: a dark vault, then a slab he can ride upside down ----------

function makeCeiling(rand) {
  const W = 960;
  const H = CEIL_Y;
  const [canvas, ctx] = makeCanvas(W, H);
  // The dark vault, with arched ribs and cable trays
  rect(ctx, 0, 0, W, CEIL_TOP, C.vault);
  dither(ctx, 0, 0, W, 30, C.void);
  rect(ctx, 0, 0, W, 20, C.void);
  for (let x = 20; x < W; x += 96) {
    // A curved arch between two ribs
    for (let i = 0; i < 88; i++) {
      const ay = 30 - Math.round(Math.sin((i / 88) * Math.PI) * 22);
      rect(ctx, x + 8 + i, ay, 1, 3, C.rib);
      rect(ctx, x + 8 + i, ay + 3, 1, 1, C.vaultLight);
    }
    rect(ctx, x, 0, 8, CEIL_TOP, C.rib);
    rect(ctx, x + 8, 30, 1, CEIL_TOP - 30, C.vaultLight);
    rect(ctx, x - 4, CEIL_TOP - 8, 16, 8, C.rib);
    // A caged work lamp on every rib
    rect(ctx, x + 1, 40, 6, 6, O);
    rect(ctx, x + 2, 41, 4, 4, '#ffd98a');
    rect(ctx, x + 2, 43, 4, 1, O);
    dither(ctx, x - 3, 46, 14, 3, '#24323c');
  }
  // EXIT signs here and there
  for (let x = 250; x < W; x += 480) {
    rect(ctx, x, 96, 38, 12, O);
    rect(ctx, x + 1, 97, 36, 10, '#2fbf71');
    rect(ctx, x + 1, 97, 36, 1, '#7ff0b0');
    pixelText(ctx, 'EXIT', x + 3, 99, { color: '#eafff2' });
    rect(ctx, x + 18, 90, 1, 6, O);
  }
  // Pipes and cables along the vault
  rect(ctx, 0, 62, W, 4, O);
  rect(ctx, 0, 63, W, 2, '#3d5866');
  rect(ctx, 0, 63, W, 1, '#56788a');
  rect(ctx, 0, 74, W, 3, O);
  rect(ctx, 0, 75, W, 1, '#7a4a3a');
  for (let x = 0; x < W; x += 32) rect(ctx, x + 10, 60, 3, 18, O);
  for (let x = 0; x < W; x += 24) {
    // A sagging cable between hooks
    for (let i = 0; i < 24; i++) rect(ctx, x + i, 88 + Math.round(Math.sin((i / 24) * Math.PI) * 4), 1, 1, '#0a1016');
  }
  // Slab face: concrete with a yellow safety line near the edge, like the floor (but mirrored)
  rect(ctx, 0, CEIL_TOP, W, 1, O);
  rect(ctx, 0, CEIL_TOP + 1, W, H - CEIL_TOP - 1, C.concrete);
  rect(ctx, 0, CEIL_TOP + 1, W, 2, C.concreteShade);
  for (let i = 0; i < 260; i++) rect(ctx, Math.floor(rand() * W), CEIL_TOP + 3 + Math.floor(rand() * 18), 1, 1, i % 2 ? C.speck : C.concreteLight);
  for (let x = 0; x < W; x += 32) rect(ctx, x, CEIL_TOP + 3, 1, 16, C.concreteShade);
  // Fluorescent light boxes set into the slab
  for (let x = 36; x < W; x += 80) {
    rect(ctx, x, CEIL_TOP + 5, 26, 6, O);
    rect(ctx, x + 1, CEIL_TOP + 6, 24, 4, C.tube);
    rect(ctx, x + 1, CEIL_TOP + 9, 24, 1, '#bff4ea');
  }
  // Safety line and the riding edge (a lit metal rail)
  rect(ctx, 0, H - 9, W, 4, C.safety);
  for (let x = 1; x < W; x += 3) rect(ctx, x, H - 8, 1, 2, C.safetyDot);
  rect(ctx, 0, H - 5, W, 1, C.concreteShade);
  rect(ctx, 0, H - 4, W, 1, O);
  rect(ctx, 0, H - 3, W, 2, '#9fb0c2');
  rect(ctx, 0, H - 2, W, 1, C.neonHot);
  rect(ctx, 0, H - 1, W, 1, C.neon);
  return canvas;
}

// ---------- The floor: platform, safety line, then the track pit in front ----------

function makeFloor(rand) {
  const W = 960;
  const H = HEIGHT - FLOOR_TOP;
  const [canvas, ctx] = makeCanvas(W, H);
  const lip = FLOOR_LIP - FLOOR_TOP;
  // The riding edge at the back of the platform: a teal light strip under the wall
  rect(ctx, 0, 0, W, 1, O);
  rect(ctx, 0, 1, W, lip - 1, C.concrete);
  rect(ctx, 0, 1, W, 1, C.concreteLight);
  rect(ctx, 0, 2, W, 1, C.neon);
  for (let i = 0; i < 300; i++) rect(ctx, Math.floor(rand() * W), 4 + Math.floor(rand() * 13), 1, 1, i % 2 ? C.speck : C.concreteLight);
  for (let x = 0; x < W; x += 32) rect(ctx, x, 3, 1, 14, C.concreteShade);
  // Old gum and a dropped ticket or two
  for (let i = 0; i < 10; i++) rect(ctx, Math.floor(rand() * W), 5 + Math.floor(rand() * 10), 2, 1, '#8f99a8');
  // Yellow safety line with bumps, near the edge
  rect(ctx, 0, lip - 7, W, 4, C.safety);
  for (let x = 1; x < W; x += 3) rect(ctx, x, lip - 6, 1, 2, C.safetyDot);
  // Platform edge
  rect(ctx, 0, lip - 3, W, 1, C.concreteLight);
  rect(ctx, 0, lip - 2, W, 2, '#9fb0c2');
  rect(ctx, 0, lip, W, 1, O);
  // The track pit
  rect(ctx, 0, lip + 1, W, H - lip - 1, '#151d26');
  rect(ctx, 0, lip + 1, W, 3, '#0c1218');
  for (let i = 0; i < 300; i++) rect(ctx, Math.floor(rand() * W), lip + 5 + Math.floor(rand() * (H - lip - 5)), 2, 1, ['#2a3440', '#222a34', '#30302e'][i % 3]);
  for (let x = 0; x < W; x += 12) rect(ctx, x, H - 12, 7, 3, '#3b2f28');
  rect(ctx, 0, H - 14, W, 2, '#8a96a6');
  rect(ctx, 0, H - 14, W, 1, '#d6e2ee');
  rect(ctx, 0, H - 5, W, 2, '#8a96a6');
  rect(ctx, 0, H - 5, W, 1, '#d6e2ee');
  // Third rail with a yellow cover (DANGER!)
  rect(ctx, 0, lip + 7, W, 3, O);
  rect(ctx, 0, lip + 7, W, 2, '#c9a23a');
  for (let x = 6; x < W; x += 40) rect(ctx, x, lip + 10, 2, 3, O);
  return canvas;
}

// ---------- Obstacles ----------

function makeBarrier() {
  const [canvas, ctx] = makeCanvas(22, 18);
  // Warning lamp on top
  rect(ctx, 2, 0, 5, 3, O);
  rect(ctx, 3, 1, 3, 2, '#ff8a3d');
  // Striped board
  rect(ctx, 0, 3, 22, 7, O);
  rect(ctx, 1, 4, 20, 5, '#ffcf3f');
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 5; j++) if ((i + j) % 6 < 3) rect(ctx, 1 + i, 4 + j, 1, 1, '#2b2440');
  }
  rect(ctx, 1, 4, 20, 1, '#fff1a8');
  // A-frame legs
  for (const [lx, dir] of [
    [4, -1],
    [16, 1],
  ]) {
    for (let y = 10; y < 18; y++) {
      const off = Math.floor((y - 10) / 3) * dir;
      rect(ctx, lx + off - 1, y, 4, 1, O);
      rect(ctx, lx + off, y, 2, 1, '#e8e2d0');
    }
  }
  rect(ctx, 4, 13, 14, 1, O);
  return canvas;
}

function makeSpikes(flipped) {
  const [canvas, ctx] = makeCanvas(24, 8);
  // Hazard-striped base plate
  rect(ctx, 0, 5, 24, 3, O);
  rect(ctx, 1, 5, 22, 2, '#ffcf3f');
  for (let i = 0; i < 22; i++) for (let j = 0; j < 2; j++) if ((i + j) % 4 < 2) rect(ctx, 1 + i, 5 + j, 1, 1, '#2b2440');
  // Six bright steel spikes, each with a hot pink tip
  for (let i = 0; i < 6; i++) {
    const sx = i * 4;
    rect(ctx, sx + 1, 0, 2, 5, O);
    rect(ctx, sx, 2, 4, 3, O);
    rect(ctx, sx + 1, 2, 1, 3, '#ffffff');
    rect(ctx, sx + 2, 2, 1, 3, '#b9c8d8');
    rect(ctx, sx + 1, 0, 2, 2, '#ff5fa2');
  }
  if (!flipped) return canvas;
  const [out, octx] = makeCanvas(24, 8);
  octx.translate(0, 8);
  octx.scale(1, -1);
  octx.drawImage(canvas, 0, 0);
  return out;
}

function makePipe() {
  const [canvas, ctx] = makeCanvas(16, 22);
  // Mounting flange bolted to the ceiling
  rect(ctx, 0, 0, 16, 4, O);
  rect(ctx, 1, 0, 14, 3, '#8a96a6');
  rect(ctx, 1, 0, 14, 1, '#c9d3df');
  rect(ctx, 2, 1, 1, 1, O);
  rect(ctx, 13, 1, 1, 1, O);
  // Rusty pipe coming down
  rect(ctx, 4, 4, 8, 12, O);
  rect(ctx, 5, 4, 6, 12, '#d0603a');
  rect(ctx, 5, 4, 2, 12, '#ff8a5c');
  rect(ctx, 10, 4, 1, 12, '#9a3f2a');
  rect(ctx, 4, 9, 8, 2, O);
  rect(ctx, 5, 9, 6, 1, '#9a3f2a');
  // Big red valve wheel at the bottom
  rect(ctx, 1, 16, 14, 5, O);
  rect(ctx, 2, 17, 12, 3, '#e0474c');
  rect(ctx, 2, 17, 12, 1, '#ff8a80');
  rect(ctx, 7, 16, 2, 6, O);
  rect(ctx, 6, 21, 4, 1, O);
  return canvas;
}

// Crackling electricity between spike tips (y is the tip row)
function drawSparks(ctx, x, y, time, dir) {
  const f = Math.floor(time * 18);
  if (f % 4 === 3) return;
  const colors = ['#fff6a8', '#8ffff2'];
  let px = x + 2 + (f % 2) * 4;
  let py = y;
  for (let i = 0; i < 6; i++) {
    rect(ctx, px, py, 1, 1, colors[(i + f) % 2]);
    px += 3;
    py = y + (((i + f) % 3) - 1) * dir;
  }
}

export function createSubway() {
  const rand = sceneryRandom(7007);
  const layers = {
    far: makeFarTunnel(rand),
    wall: makeWall(rand),
    ceiling: makeCeiling(rand),
    floor: makeFloor(rand),
  };
  const train = makeTrain();
  const barrier = makeBarrier();
  const spikesUp = makeSpikes(false);
  const spikesDown = makeSpikes(true);
  const pipe = makePipe();
  const tubes = [];
  for (let x = 36; x < layers.ceiling.width; x += 80) tubes.push(x);

  return {
    drawBack(ctx, scroll, time) {
      // The other track, and a train racing past every few seconds
      drawStrip(ctx, layers.far, scroll * 0.3, WALL_TOP);
      const period = 7;
      const t = time % period;
      if (t < 2.2) {
        const tx = WIDTH + 40 - t * 520 - scroll * 0.3;
        ctx.drawImage(train, snap(tx), WALL_BOTTOM - 13 - train.height);
      }
      drawStrip(ctx, layers.wall, scroll * 0.5, WALL_TOP);
      drawStrip(ctx, layers.ceiling, scroll, 0);
      // One or two tubes flicker now and then
      const w = layers.ceiling.width;
      const shift = ((scroll % w) + w) % w;
      tubes.forEach((tx, i) => {
        const flicker = (i === 2 || i === 7) && Math.sin(time * 23 + i) > 0.55 && Math.floor(time * 2 + i) % 3 === 0;
        if (!flicker) return;
        for (const k of [0, w]) {
          const sx = snap(tx - shift + k);
          if (sx > -30 && sx < WIDTH) rect(ctx, sx + 1, CEIL_TOP + 6, 24, 4, C.tubeOff);
        }
      });
      drawStrip(ctx, layers.floor, scroll, FLOOR_TOP);
    },

    drawObstacle(ctx, o, time) {
      switch (o.kind) {
        case KIND.BARRIER:
          rect(ctx, o.x + 1, o.y + o.h, o.w - 2, 1, '#353c48');
          ctx.drawImage(barrier, o.x, o.y);
          if (Math.floor(time * 3) % 2 === 0) {
            rect(ctx, o.x + 3, o.y + 1, 3, 2, '#ffe39a');
            rect(ctx, o.x + 2, o.y - 1, 5, 1, '#ffb347');
          }
          break;
        case KIND.FLOOR_SPIKES:
          ctx.drawImage(spikesUp, o.x, o.y);
          drawSparks(ctx, o.x, o.y + 1, time, 1);
          break;
        case KIND.CEIL_PIPE:
          ctx.drawImage(pipe, o.x, o.y);
          // A drip falling from the valve
          {
            const t = (time * 0.9 + o.x * 0.01) % 1;
            if (t < 0.6) rect(ctx, o.x + 8, o.y + o.h + Math.floor(t * 30), 1, 2, '#8ffff2');
          }
          break;
        case KIND.CEIL_SPIKES:
          ctx.drawImage(spikesDown, o.x, o.y);
          drawSparks(ctx, o.x, o.y + o.h - 2, time, -1);
          break;
      }
    },
  };
}

