// preview/zone.js: shows ONE zone's art on its own, for checking how it looks.
// Open /preview/zone.html?zone=rooftops  (the file name in src/art/zones/)
// Add &t=3.5 to freeze the clock (for screenshots), &scale=2 to pick the zoom.
import { WIDTH, HEIGHT, GROUND_Y, CEIL_Y, KIND, DONUT_SIZE, PLAYER_X } from '../src/world.js';
import { setScale } from '../src/art/strip.js';
import { rect } from '../src/art/pixel.js';

const params = new URLSearchParams(location.search);
const name = params.get('zone') || 'rooftops';
const frozen = params.has('t') ? Number(params.get('t')) : null;
const scale = Number(params.get('scale') || 2);

// Example obstacles for each zone, in the same boxes the game uses
const G = GROUND_Y;
const SAMPLES = {
  downtown: [
    { kind: KIND.CONE, x: 150, y: G - 16, w: 12, h: 16 },
    { kind: KIND.BIN, x: 250, y: G - 24, w: 18, h: 24 },
    { kind: KIND.PUDDLE, x: 340, y: G - 3, w: 34, h: 3 },
  ],
  rooftops: [
    { kind: KIND.GAP, x: 150, y: G, w: 90, h: 36 },
    { kind: KIND.AC_UNIT, x: 290, y: G - 16, w: 22, h: 16 },
    { kind: KIND.VENT, x: 380, y: G - 24, w: 12, h: 24 },
    { kind: KIND.GAP, x: 420, y: G, w: 120, h: 36 },
  ],
  subway: [
    { kind: KIND.BARRIER, x: 150, y: G - 18, w: 22, h: 18 },
    { kind: KIND.CEIL_PIPE, x: 230, y: CEIL_Y, w: 16, h: 22 },
    { kind: KIND.FLOOR_SPIKES, x: 300, y: G - 8, w: 24, h: 8 },
    { kind: KIND.CEIL_SPIKES, x: 380, y: CEIL_Y, w: 24, h: 8 },
  ],
  construction: [
    { kind: KIND.BEAM, x: 150, y: G - 36, w: 64, h: 8 },
    { kind: KIND.BUCKET, x: 270, y: G - 46, w: 16, h: 18 },
    { kind: KIND.BEAM, x: 330, y: G - 36, w: 110, h: 8 },
  ],
  market: [
    { kind: KIND.CRATES, x: 150, y: G - 22, w: 16, h: 22 },
    { kind: KIND.CART, x: 220, y: G - 24, w: 32, h: 24 },
    { kind: KIND.BIKE, x: 310, y: G - 18, w: 28, h: 18 },
    { kind: KIND.PIGEONS, x: 400, y: G - 12, w: 24, h: 12 },
  ],
  crosswalk: [
    { kind: KIND.JUNCTION, x: 140, y: G - 4, w: 56, h: 4, a: -0.4, b: 0 },
    { kind: KIND.JUNCTION, x: 260, y: G - 4, w: 56, h: 4, a: 0.5, b: 1 },
    { kind: KIND.JUNCTION, x: 380, y: G - 4, w: 56, h: 4, a: -999, b: 2 },
  ],
  'park-hill': [],
};

await document.fonts.load('8px "Press Start 2P"').catch(() => {});
const factoryName = 'create' + name.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
const module = await import(`../src/art/zones/${name}.js`);
const art = module[factoryName]();

const canvas = document.getElementById('game');
canvas.width = WIDTH * scale;
canvas.height = HEIGHT * scale;
const ctx = canvas.getContext('2d');
setScale(scale);

const start = performance.now();
function frame(now) {
  const time = frozen ?? (now - start) / 1000;
  const scroll = time * 140;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  rect(ctx, 0, 0, WIDTH, HEIGHT, '#000');
  art.drawBack(ctx, scroll, time);
  for (const o of SAMPLES[name] || []) {
    const ob = { a: 0, b: 0, ...o };
    art.drawObstacle?.(ctx, ob, time);
  }
  // A stand-in for the boy so sizes can be compared: his 18 x 36 hitbox
  if (name === 'subway') rect(ctx, PLAYER_X, CEIL_Y, 18, 36, '#ff00ff88');
  rect(ctx, PLAYER_X, GROUND_Y - 36, 18, 36, '#ff00ff88');
  for (const o of SAMPLES[name] || []) art.drawObstacleFront?.(ctx, { a: 0, b: 0, ...o }, time);
  if (art.drawDonut) art.drawDonut(ctx, 20, GROUND_Y - DONUT_SIZE, time, time * 4);
  art.drawFront?.(ctx, scroll, time);
  if (frozen === null) requestAnimationFrame(frame);
  else document.body.dataset.ready = '1';
}
requestAnimationFrame(frame);
