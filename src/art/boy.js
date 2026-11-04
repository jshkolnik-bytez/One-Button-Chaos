// boy.js: the skaters and their skateboards, from the sprite sheets in
// assets/sprites/ (made by tools/make_crew.py):
//   crew.png    one row per skater, 48 x 48 frames, no board
//   boards.png  one row per board, the same frames: just the board, in the
//               same place and tilt as in each pose
//   crew.json   where each frame is, and how fast each animation plays
// The board is drawn first, then the skater on top. They face right, and the
// wheels touch row 45 of each frame (ground line 46).
import sheet from '../../assets/sprites/crew.json';
import { rect, pixelText, OUTLINE } from './pixel.js';

const crewUrl = new URL('../../assets/sprites/crew.png', import.meta.url).href;
const boardsUrl = new URL('../../assets/sprites/boards.png', import.meta.url).href;
const FRAME = sheet.frameWidth; // 48
const GROUND_LINE = 46; // the row just under the wheels

let crewImage = null;
let boardsImage = null;
let crewRow = 0; // who is skating
let boardRow = 0; // ...and on which board
let bodyCenter = FRAME / 2; // where the body is across the frame (measured below)

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(url + ' is missing: showing a stand-in box instead of the skater.');
      resolve(null);
    };
    img.src = url;
  });
}

// Loads both sheets. If they're missing the game still runs, with a stand-in box.
export async function loadBoy() {
  [crewImage, boardsImage] = await Promise.all([loadImage(crewUrl), loadImage(boardsUrl)]);
  if (crewImage) bodyCenter = measureBodyCenter(crewImage);
  return crewImage !== null;
}

export function boyIsMissing() {
  return crewImage === null;
}

// Picks who skates, and on which board (row numbers in the sheets)
export function setLoadout(crew, board) {
  crewRow = crew;
  boardRow = board;
}

// Finds the middle of the body in Jay's first ride frame (the columns with
// solid pixels around the head), so the hitbox lines up with the skater.
function measureBodyCenter(img) {
  const f = sheet.frames.ride_0;
  const canvas = document.createElement('canvas');
  canvas.width = f.w;
  canvas.height = f.h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, f.x, 0, f.w, f.h, 0, 0, f.w, f.h);
  const data = ctx.getImageData(0, 0, f.w, f.h).data;
  let left = f.w;
  let right = -1;
  for (let x = 0; x < f.w; x++) {
    for (let y = 2; y < 16; y++) {
      if (data[(y * f.w + x) * 4 + 3] > 0) {
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
  }
  return right < 0 ? FRAME / 2 : Math.round((left + right + 1) / 2);
}

export function animationLength(name) {
  const anim = sheet.animations[name];
  return anim ? anim.frames.length / anim.fps : 0;
}

// The frame to show for an animation that has been playing for `t` seconds
function frameFor(animation, t) {
  const anim = sheet.animations[animation] || sheet.animations.ride;
  const step = Math.floor(Math.max(0, t) * anim.fps);
  const i = anim.loop ? step % anim.frames.length : Math.min(step, anim.frames.length - 1);
  return sheet.frames[anim.frames[i]];
}

// One frame: the board, then the skater, with the frame's top-left at (x, y)
function drawFrame(ctx, f, x, y, crew = crewRow, board = boardRow, trick = null) {
  if (boardsImage) {
    if (trick) drawTrickBoard(ctx, f, x, y, board, trick);
    else ctx.drawImage(boardsImage, f.x, board * FRAME, f.w, f.h, x, y, f.w, f.h);
  }
  ctx.drawImage(crewImage, f.x, crew * FRAME, f.w, f.h, x, y, f.w, f.h);
}

// The board doing a trick under his feet (see TRICKS in tricks.js).
// p goes from 0 to 1 over the trick. It drops a little below his feet so you
// can see it turn, then comes back up to be caught.
const boardMiddles = new Map(); // frame x -> where the board's middle is in that frame
function boardMiddle(f) {
  if (!boardMiddles.has(f.x)) {
    // Measure the board's pixels once per frame (the board is in a different
    // place in each pose: tilted on a pop, tucked up in the air...)
    const c = document.createElement('canvas');
    c.width = f.w;
    c.height = f.h;
    const cx = c.getContext('2d');
    cx.drawImage(boardsImage, f.x, 0, f.w, f.h, 0, 0, f.w, f.h);
    const data = cx.getImageData(0, 0, f.w, f.h).data;
    let [l, r, t, b] = [f.w, -1, f.h, -1];
    for (let py = 0; py < f.h; py++) {
      for (let px = 0; px < f.w; px++) {
        if (data[(py * f.w + px) * 4 + 3] > 0) {
          l = Math.min(l, px);
          r = Math.max(r, px);
          t = Math.min(t, py);
          b = Math.max(b, py);
        }
      }
    }
    boardMiddles.set(f.x, r < 0 ? { x: 24, y: 42 } : { x: Math.round((l + r + 1) / 2), y: Math.round((t + b + 1) / 2) });
  }
  return boardMiddles.get(f.x);
}

function drawTrickBoard(ctx, f, x, y, board, { p, flip = 0, spin = 0, roll = 0, lift = 0 }) {
  const { x: BOARD_MIDDLE_X, y: BOARD_MIDDLE_Y } = boardMiddle(f);
  const arc = Math.sin(p * Math.PI); // 0 -> 1 -> 0
  const drop = Math.round(arc * (lift ? -lift : 5));
  // Turning over along its length looks like squashing it up and down;
  // spinning around flat looks like squashing it side to side
  const sy = Math.cos(p * Math.PI * 2 * Math.abs(flip));
  const sx = Math.cos(p * Math.PI * 2 * spin);
  const snapScale = (v) => (Math.abs(v) < 0.12 ? 0.12 * Math.sign(v || 1) : Math.round(v * 8) / 8);
  ctx.save();
  ctx.translate(x + BOARD_MIDDLE_X, y + BOARD_MIDDLE_Y + drop);
  if (roll) ctx.rotate(Math.round(p * 8 * roll) * (Math.PI / 4) * (flip < 0 ? -1 : 1));
  ctx.scale(snapScale(sx), snapScale(sy));
  // Upside down, you see the darker underside of the board
  if (sy < 0 && 'filter' in ctx) ctx.filter = 'brightness(0.55)';
  ctx.drawImage(boardsImage, f.x, board * FRAME, f.w, f.h, -BOARD_MIDDLE_X, -BOARD_MIDDLE_Y, f.w, f.h);
  ctx.restore();
}

// Draws the skater with the body centred on `centerX` and the wheels on `footY`.
// `turns` = quarter turns clockwise (for tumbling).
// `upsideDown` = riding the Subway ceiling: footY is then the ceiling line,
// and the skater hangs below it.
export function drawBoy(ctx, animation, t, centerX, footY, { turns = 0, upsideDown = false, trick = null } = {}) {
  const left = Math.round(centerX) - bodyCenter;
  if (!crewImage) {
    // Stand-in until the sprite sheets are added: a box the size of the hitbox
    const x = Math.round(centerX) - 9;
    const y = upsideDown ? Math.round(footY) : Math.round(footY) - 36;
    rect(ctx, x, y, 18, 36, OUTLINE);
    rect(ctx, x + 1, y + 1, 16, 34, '#ff8a3d');
    pixelText(ctx, '?', x + 5, y + 14, { color: OUTLINE });
    return;
  }
  const f = frameFor(animation, t);
  const top = Math.round(footY) - GROUND_LINE;
  if (upsideDown) {
    // Mirror top-to-bottom so the wheels stick to the ceiling at footY
    ctx.save();
    ctx.translate(left, Math.round(footY) + GROUND_LINE);
    ctx.scale(1, -1);
    drawFrame(ctx, f, 0, 0);
    ctx.restore();
    return;
  }
  if (turns % 4 === 0) {
    drawFrame(ctx, f, left, top, crewRow, boardRow, trick);
    return;
  }
  // Turned: rotate around the middle of the frame in quarter turns,
  // which keeps every pixel sharp
  ctx.save();
  ctx.translate(left + FRAME / 2, top + FRAME / 2);
  ctx.rotate((turns % 4) * (Math.PI / 2));
  drawFrame(ctx, f, -FRAME / 2, -FRAME / 2);
  ctx.restore();
}

// Just the skateboard (it flies off on its own after a crash), centred on x, y
export function drawBoard(ctx, x, y, turns = 0) {
  if (!boardsImage) return;
  const f = sheet.frames.board;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate((turns % 4) * (Math.PI / 2));
  ctx.drawImage(boardsImage, f.x, boardRow * FRAME, f.w, f.h, -24, -26, f.w, f.h);
  ctx.restore();
}

// For the shop: any skater on any board, one frame, top-left at (x, y)
export function drawLoadoutPreview(ctx, crew, board, frame, x, y) {
  const f = sheet.frames[frame];
  if (crewImage && f) drawFrame(ctx, f, x, y, crew, board);
}

// For the shop: just a board, big and centred in a 48 x 48 box
export function drawBoardPreview(ctx, board, x, y) {
  const f = sheet.frames.board;
  if (boardsImage) ctx.drawImage(boardsImage, f.x, board * FRAME, f.w, f.h, x, y + 4, f.w, f.h);
}
