// render.js: draws each frame. It only READS the game; it never changes it.
//
// Smooth pixel art: everything is drawn straight onto the big screen canvas,
// blown up by a WHOLE number (x2, x3, x4...) with smoothing off, so every
// pixel stays a crisp square. Things that move are placed to the nearest
// SCREEN pixel (see art/strip.js), and positions are blended between the
// game's 60 updates a second, so motion looks smooth on any screen.
import {
  WIDTH, HEIGHT, GROUND_Y, PLAYER_X, POSE, ZONE, ZONES, KIND, OBSTACLE_STRIDE, DONUT_SIZE, BASE_SPEED, LANE_GAP,
} from './world.js';
import { rect, box, pixelText, OUTLINE } from './art/pixel.js';
import { setScale, snap } from './art/strip.js';
import { createNight, ROOF_Y } from './art/night.js';
import { drawBoy, boyIsMissing, animationLength } from './art/boy.js';
import { drawHud, drawZoneSign } from './hud.js';
import { createDowntown } from './art/zones/downtown.js';
import { createRooftops } from './art/zones/rooftops.js';
import { createSubway } from './art/zones/subway.js';
import { createConstruction } from './art/zones/construction.js';
import { createMarket } from './art/zones/market.js';
import { createCrosswalk } from './art/zones/crosswalk.js';
import { createParkHill } from './art/zones/park-hill.js';
import { createHighway } from './art/zones/highway.js';
import { createPier, drawKite } from './art/zones/pier.js';

// Which zone each obstacle kind belongs to (so the right art draws it)
const KIND_ZONE = [];
for (const k of [KIND.CONE, KIND.HYDRANT, KIND.BIN, KIND.PUDDLE]) KIND_ZONE[k] = ZONE.DOWNTOWN;
for (const k of [KIND.GAP, KIND.AC_UNIT, KIND.VENT]) KIND_ZONE[k] = ZONE.ROOFTOPS;
for (const k of [KIND.BARRIER, KIND.FLOOR_SPIKES, KIND.CEIL_PIPE, KIND.CEIL_SPIKES]) KIND_ZONE[k] = ZONE.SUBWAY;
for (const k of [KIND.BEAM, KIND.BUCKET]) KIND_ZONE[k] = ZONE.CONSTRUCTION;
for (const k of [KIND.CRATES, KIND.CART, KIND.BIKE, KIND.PIGEONS]) KIND_ZONE[k] = ZONE.MARKET;
KIND_ZONE[KIND.JUNCTION] = ZONE.CROSSWALK;
for (const k of [KIND.STALLED_CAR, KIND.ROADWORK, KIND.POTHOLE]) KIND_ZONE[k] = ZONE.HIGHWAY;
for (const k of [KIND.WATER_GAP, KIND.GULLS]) KIND_ZONE[k] = ZONE.PIER;
const IN_LANE = new Set([KIND.STALLED_CAR, KIND.ROADWORK, KIND.POTHOLE]);

const BOY_CENTER = PLAYER_X + 9;
const LOGO_X = 140; // the title screen's left column (the menu is on the right)
const PUSH_EVERY = 2.6; // seconds of rolling between cosmetic kick-pushes
const LAND_TIME = 0.1; // the landing crouch shows this long

export function createRenderer(canvas, stage) {
  const ctx = canvas.getContext('2d');
  const night = createNight();
  const zones = [
    createDowntown(),
    createRooftops(),
    createSubway(),
    createConstruction(),
    createMarket(),
    createCrosswalk(),
    createParkHill(),
    createHighway(),
    createPier(),
  ];
  let scale = 1;

  // The boy's animation
  let anim = 'ride';
  let animClock = 0;
  let rideClock = 0;
  let pushTimer = PUSH_EVERY;
  let landTimer = 0;
  let dashShift = 0; // he lunges forward a little when he dashes

  // Zone changes: the old zone stays on screen behind a gate that scrolls away
  let shownZone = null;
  let oldZone = null;
  let changeScroll = 0;

  // Park Hill's donut, and the donut rolling away once the zone ends
  let donutSpin = 0;
  let lastDonutX = -9999;
  let leavingDonut = null;
  let crushRoll = 0;

  // Seaside Pier: the kite floats after his hand, a little behind and above
  let kite = null;

  // Pick the biggest whole-number scale that fits the window (in real device pixels)
  function fitToScreen() {
    const dpr = window.devicePixelRatio || 1;
    scale = Math.max(1, Math.floor(Math.min((innerWidth * dpr) / WIDTH, (innerHeight * dpr) / HEIGHT)));
    if (canvas.width !== WIDTH * scale) {
      canvas.width = WIDTH * scale;
      canvas.height = HEIGHT * scale;
    }
    // The page size in CSS pixels, and how big one game pixel is (menus use --px)
    stage.style.width = (WIDTH * scale) / dpr + 'px';
    stage.style.height = (HEIGHT * scale) / dpr + 'px';
    stage.style.setProperty('--px', scale / dpr + 'px');
    setScale(scale);
  }
  window.addEventListener('resize', fitToScreen);
  fitToScreen();

  function begin() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  // Runs `draw` with the context nudged so that whole-pixel art lands on the
  // nearest screen pixel to (x, y). Returns the whole-pixel x, y to draw at.
  function atSubpixel(x, y, draw) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    ctx.save();
    ctx.translate(snap(x) - rx, snap(y) - ry);
    draw(rx, ry);
    ctx.restore();
  }

  function withClip(left, right, draw) {
    if (right <= left) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, 0, right - left, HEIGHT);
    ctx.clip();
    draw();
    ctx.restore();
  }

  // ---------- The gate between two zones ----------
  function drawGate(x, zoneIndex, time) {
    const zone = ZONES[zoneIndex];
    const gx = Math.round(x);
    // Two posts with hazard stripes in the new zone's colour
    for (const px of [gx - 4, gx + 1]) {
      rect(ctx, px, 96, 3, GROUND_Y - 94, OUTLINE);
    }
    rect(ctx, gx - 3, 97, 1, GROUND_Y - 96, zone.accent);
    rect(ctx, gx + 2, 97, 1, GROUND_Y - 96, '#ffffff');
    for (let y = 120; y < GROUND_Y; y += 10) rect(ctx, gx - 3, y, 1, 4, OUTLINE);
    // The banner with the zone's name, swinging a tiny bit
    const label = zone.name.toUpperCase();
    const w = label.length * 8 + 12;
    const sway = Math.round(Math.sin(time * 3) * 1);
    const bx = gx - Math.floor(w / 2) + sway;
    box(ctx, bx, 100, w, 16, { fill: zone.accent, light: '#ffffff', shade: OUTLINE });
    pixelText(ctx, label, bx + 6, 104, { color: OUTLINE });
    // Light up the gate's feet
    rect(ctx, gx - 6, GROUND_Y - 1, 12, 2, OUTLINE);
  }

  // ---------- The boy ----------
  function pickAnimation(game, pose, dt, events) {
    if (events & 4 /* LAND */) landTimer = LAND_TIME;
    if (events & 128 /* PUSH */) {
      anim = 'push';
      animClock = 0;
    }
    landTimer = Math.max(0, landTimer - dt);
    const vyUp = game.vy_up();
    let next;
    switch (pose) {
      case POSE.DUCK: next = 'duck'; break;
      case POSE.DASH: next = 'dash'; break;
      case POSE.BRAKE: next = 'brake'; break;
      case POSE.IDLE: next = 'idle'; break;
      case POSE.GRAB: next = 'grab'; break;
      case POSE.JUMP: next = vyUp > 170 ? 'pop' : 'air'; break;
      case POSE.FALL: next = vyUp > -140 ? 'air' : 'fall'; break;
      case POSE.PUSH:
        next = anim === 'push' && animClock < animationLength('push') ? 'push' : 'ride';
        break;
      default:
        if (landTimer > 0) next = 'land';
        else if (anim === 'push' && animClock < animationLength('push')) next = 'push';
        else {
          pushTimer -= dt;
          if (pushTimer <= 0) {
            pushTimer = PUSH_EVERY + Math.random();
            next = 'push';
            animClock = 0;
            anim = 'push';
          } else next = 'ride';
        }
    }
    if (next !== anim) {
      anim = next;
      animClock = 0;
    }
    animClock += dt;
    // The wheels roll faster when he's faster
    rideClock += dt * Math.max(0.2, game.speed() / BASE_SPEED);
  }

  function drawPlayer(game, view, pose) {
    if (game.is_dead()) return;
    const trick = view.tricks?.boardTrick() || null;
    // Blinks while Tony's shield keeps him safe
    if (game.is_safe() && Math.floor(view.time * 16) % 2 === 0) return;
    const [, , , h] = game.player();
    const y = view.playerY; // blended between updates
    const upside = game.upside_down();
    const clock = anim === 'ride' ? rideClock : animClock;
    const centerX = BOY_CENTER + dashShift;
    if (upside) {
      atSubpixel(centerX, y, (cx, cy) => drawBoy(ctx, anim, clock, cx, cy, { upsideDown: true }));
      return;
    }
    // His shadow on the floor shrinks as he gets higher
    // (on the Highway, the floor is whichever lane he's in)
    const footY = y + h;
    const floor = game.zone() === ZONE.HIGHWAY ? GROUND_Y - LANE_GAP * game.lane_pos() : GROUND_Y;
    const height = floor - footY;
    if (pose !== POSE.HURT && height < 90 && height > -4) {
      const shadowW = Math.max(6, 22 - Math.floor(height / 5));
      rect(ctx, Math.round(centerX - shadowW / 2), Math.round(floor), shadowW, 1, '#00000044');
    }
    atSubpixel(centerX, footY, (cx, cy) => drawBoy(ctx, anim, clock, cx, cy, { trick }));
  }

  // Seaside Pier: his kite on its string. It trails behind him and climbs
  // when you hold (he's being pulled up).
  function drawKiteFor(game, view, dt) {
    if (game.zone() !== ZONE.PIER && !kite) return;
    const hx = BOY_CENTER + 5;
    const hy = view.playerY + 6;
    const pulling = game.zone() === ZONE.PIER && game.vy_up() > 40;
    const tx = hx + 46 + Math.sin(view.time * 1.3) * 6;
    const ty = Math.max(16, hy - (pulling ? 70 : 56) + Math.sin(view.time * 2.1) * 4);
    if (!kite) kite = { x: tx, y: ty - 30 };
    const follow = Math.min(1, dt * 5);
    kite.x += (tx - kite.x) * follow;
    kite.y += (ty - kite.y) * follow;
    if (game.zone() !== ZONE.PIER || game.is_dead()) {
      // Let go of it: it floats away
      kite.y -= dt * 60;
      kite.x += dt * 40;
      if (kite.y < -40) kite = null;
      if (kite) drawKite(ctx, kite.x - 30, kite.y + 60, kite.x, kite.y, view.time);
      return;
    }
    drawKite(ctx, hx, hy, kite.x, kite.y, view.time);
  }

  // ---------- A whole frame of the game ----------
  function drawGame(game, view, dt) {
    begin();
    const dead = game.is_dead();
    const zone = game.zone();
    const pose = game.pose();
    const events = view.events;
    if (!dead) pickAnimation(game, pose, dt, events);
    dashShift += ((pose === POSE.DASH ? 10 : 0) - dashShift) * Math.min(1, dt * 14);

    // Remember zone changes, to slide the old zone away behind a gate
    const scroll = view.scroll; // blended between updates
    if (shownZone === null) shownZone = zone;
    if (zone !== shownZone) {
      oldZone = shownZone;
      shownZone = zone;
      changeScroll = scroll;
      if (oldZone === ZONE.PARK_HILL && lastDonutX > -DONUT_SIZE) leavingDonut = { x: lastDonutX };
    }

    rect(ctx, 0, 0, WIDTH, HEIGHT, '#000000');
    const camera = view.effects.camera();
    ctx.save();
    ctx.translate(camera.x, camera.y);

    // Where the gates are: one behind (the zone we just left), one ahead (the next zone)
    let gateBehind = oldZone !== null ? BOY_CENTER - (scroll - changeScroll) : -999;
    if (gateBehind < -40) oldZone = null;
    const next = game.next_zone();
    const ahead = game.seconds_to_next_zone() * game.zone_speed();
    let gateAhead = next !== zone && !dead ? BOY_CENTER + ahead : 999;
    if (gateAhead > WIDTH + 40) gateAhead = 999;

    // Backdrops: old zone | this zone | next zone
    const time = view.time;
    if (oldZone !== null) withClip(0, snap(gateBehind), () => zones[oldZone].drawBack(ctx, scroll, time));
    withClip(oldZone !== null ? snap(gateBehind) : 0, gateAhead < 999 ? snap(gateAhead) : WIDTH, () =>
      zones[zone].drawBack(ctx, scroll, time),
    );
    if (gateAhead < 999) withClip(snap(gateAhead), WIDTH, () => zones[next].drawBack(ctx, scroll, time));

    // Obstacles (blended to where they were between updates)
    const list = game.obstacles();
    const shift = view.obstacleShift;
    const parts = [];
    // Highway: things in the front lane go in front of him when he's in the back lane
    const backLane = zone === ZONE.HIGHWAY && game.lane_pos() >= 0.5;
    for (let i = 0; i < list.length; i += OBSTACLE_STRIDE) {
      const x = list[i] + shift;
      const w = list[i + 2];
      if (x > WIDTH + 80 || x + w < -80) continue;
      const kind = list[i + 4];
      const o = { kind, x, y: list[i + 1], w, h: list[i + 3], a: list[i + 5], b: list[i + 6] };
      parts.push({ art: zones[KIND_ZONE[kind]], o, front: IN_LANE.has(kind) && o.b === 0 && backLane });
    }
    const drawPart = (art, o, front) => {
      const fn = front ? art.drawObstacleFront : art.drawObstacle;
      if (!fn) return;
      atSubpixel(o.x, o.y, (x, y) => fn.call(art, ctx, { ...o, x, y }, time));
    };
    for (const { art, o, front } of parts) if (!front) drawPart(art, o, false);

    // Park Hill: the giant donut behind him
    const donutArt = zones[ZONE.PARK_HILL];
    const donutX = view.donutX;
    if (zone === ZONE.PARK_HILL) {
      // Once it catches him, it keeps rolling right over him
      if (dead) crushRoll += dt * 150;
      else crushRoll = 0;
      lastDonutX = donutX + crushRoll;
      donutSpin = (scroll + lastDonutX) / (DONUT_SIZE / 2);
      atSubpixel(lastDonutX, GROUND_Y - DONUT_SIZE, (x, y) => donutArt.drawDonut(ctx, x, y, time, donutSpin));
    } else {
      lastDonutX = -9999;
    }
    if (leavingDonut) {
      leavingDonut.x -= dt * (game.speed() + 60);
      const d = leavingDonut;
      atSubpixel(d.x, GROUND_Y - DONUT_SIZE, (x, y) => donutArt.drawDonut(ctx, x, y, time, (scroll + d.x) / 26));
      if (d.x < -DONUT_SIZE - 4) leavingDonut = null;
    }

    view.effects.drawBehind(ctx, game);
    drawPlayer(game, view, pose);
    drawKiteFor(game, view, dt);
    for (const { art, o, front } of parts) if (front) drawPart(art, o, false);
    view.effects.drawWorld(ctx, game);

    for (const { art, o } of parts) drawPart(art, o, true);

    // Foregrounds (in front of the boy), split by the same gates
    if (oldZone !== null) withClip(0, snap(gateBehind), () => zones[oldZone].drawFront?.(ctx, scroll, time));
    withClip(oldZone !== null ? snap(gateBehind) : 0, gateAhead < 999 ? snap(gateAhead) : WIDTH, () =>
      zones[zone].drawFront?.(ctx, scroll, time),
    );
    if (gateAhead < 999) withClip(snap(gateAhead), WIDTH, () => zones[next].drawFront?.(ctx, scroll, time));

    if (oldZone !== null) atSubpixel(gateBehind, 0, (x) => drawGate(x, zone, time));
    if (gateAhead < 999) atSubpixel(gateAhead, 0, (x) => drawGate(x, next, time));
    // Trick keys above his head, and trick names popping up
    if (view.tricks) view.tricks.draw(ctx, game, BOY_CENTER, Math.round(view.playerY) - 4, time);
    ctx.restore();

    if (view.tutorial) {
      view.effects.drawOverlay(ctx, WIDTH, HEIGHT);
      view.tutorial.draw(ctx, game, view);
    } else {
      drawHud(ctx, game, view);
      drawZoneSign(ctx, game, view);
      view.effects.drawOverlay(ctx, WIDTH, HEIGHT);
    }
  }

  // The title screen: your skater chilling on a rooftop at night, the logo
  // above, and the menu (HTML) on the right
  function drawTitle(view) {
    begin();
    night.draw(ctx, view.time);
    drawBoy(ctx, 'idle', view.time, LOGO_X, ROOF_Y);

    // The logo bobs gently, letter by letter
    pixelText(ctx, 'ONE BUTTON', LOGO_X, 22, { size: 16, align: 'center', color: '#ffffff', outline: OUTLINE, shadow: '#ff5fa2' });
    const word = 'CHAOS';
    const size = 32;
    const left = LOGO_X - (word.length * size) / 2;
    [...word].forEach((letter, i) => {
      const bob = Math.round(Math.sin(view.time * 3 - i * 0.7) * 2);
      pixelText(ctx, letter, left + i * size, 44 + bob, { size, color: '#ffb38a', outline: OUTLINE, shadow: '#ff5fa2' });
    });
    if (Math.floor(view.time * 2) % 2 === 0) {
      pixelText(ctx, 'PRESS SPACE TO PLAY', LOGO_X, 90, { align: 'center', color: '#ffd166', outline: OUTLINE });
    }
    if (boyIsMissing()) {
      pixelText(ctx, 'ADD assets/sprites/crew.png', 240, 6, { align: 'center', color: '#ff8a80', outline: OUTLINE });
    }
  }

  function reset() {
    shownZone = null;
    oldZone = null;
    leavingDonut = null;
    kite = null;
    anim = 'ride';
    animClock = 0;
    landTimer = 0;
    dashShift = 0;
    pushTimer = 1.2;
  }

  // Market: the colours of the bits that fly when something is smashed
  function debrisFor(kind) {
    return zones[ZONE.MARKET].debris?.[kind] || ['#c9a36b', '#8a6a3f', '#ffd166'];
  }

  return { drawGame, drawTitle, reset, debrisFor };
}
