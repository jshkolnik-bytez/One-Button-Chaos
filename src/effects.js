// effects.js: "juice", the little extras that make the game feel alive:
// dust puffs, sparks from the board, speed lines, flying bits when he smashes
// things, a camera bounce when he lands, screen shake and a white flash when
// he crashes, the boy tumbling off screen while his board flies the other way,
// and "+100" pop-ups. These use Math.random() because they're only for looks;
// they never change what happens in the game.
import { EVENT, POSE, PLAYER_X } from './world.js';
import { rect, pixelText, OUTLINE } from './art/pixel.js';
import { drawBoy, drawBoard } from './art/boy.js';

// People who turn on "reduce motion" in their device settings get no shaking
const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const DUST = ['#f1e9f7', '#cbbfdd'];
const SPARKS = ['#fff4c9', '#ffd166', '#ff8a3d'];
const FLIP_SPARKLE = ['#ffffff', '#7ff0e4', '#3fd6c8'];

// A little 9 x 9 pixel coin
export function drawCoin(ctx, x, y) {
  rect(ctx, x + 2, y, 5, 1, OUTLINE);
  rect(ctx, x + 1, y + 1, 7, 7, OUTLINE);
  rect(ctx, x, y + 2, 9, 5, OUTLINE);
  rect(ctx, x + 2, y + 8, 5, 1, OUTLINE);
  rect(ctx, x + 2, y + 1, 5, 7, '#ffd166');
  rect(ctx, x + 1, y + 2, 7, 5, '#ffd166');
  rect(ctx, x + 6, y + 2, 1, 5, '#c9932a');
  rect(ctx, x + 2, y + 7, 4, 1, '#c9932a');
  rect(ctx, x + 2, y + 2, 2, 1, '#fff4c9');
  rect(ctx, x + 2, y + 3, 1, 2, '#fff4c9');
  rect(ctx, x + 4, y + 3, 1, 3, '#c9932a');
}

export function createEffects({ debrisFor = () => ['#c9a36b', '#8a6a3f'] } = {}) {
  let bits = []; // every little flying pixel: dust, sparks, debris
  let lines = []; // speed lines while dashing
  let popups = [];
  let shake = 0;
  let flash = 0;
  let bounce = 0;
  let tumble = null; // the boy flying off screen after a crash...
  let board = null; // ...and his skateboard flying the other way
  let rollPuff = 0;

  // A spray of little squares. `up` = which way is "up" (-1 normally, +1 on the ceiling)
  function spray(x, y, count, { speed = 60, drift = 0, colors = DUST, life = 0.35, size = 3, up = -1, gravity = 0 } = {}) {
    for (let i = 0; i < count; i++) {
      bits.push({
        x,
        y,
        vx: drift + (Math.random() - 0.5) * speed,
        vy: up * Math.random() * speed * 0.6,
        gravity,
        age: 0,
        life: life * (0.6 + Math.random() * 0.6),
        color: colors[Math.floor(Math.random() * colors.length)],
        size,
      });
    }
  }

  // Where his wheels are, and which way is up, right now
  function feet(game) {
    const [x, y, w, h] = game.player();
    const upside = game.upside_down();
    return { x: x + w / 2, y: upside ? y : y + h, up: upside ? 1 : -1, upside };
  }

  return {
    reset() {
      bits = [];
      lines = [];
      popups = [];
      shake = 0;
      flash = 0;
      bounce = 0;
      tumble = null;
      board = null;
    },

    // Reacts to what happened in the game this frame
    handle(events, game) {
      if (!events) return;
      const f = feet(game);
      const drift = -game.speed() * 0.6; // dust gets left behind as the city scrolls

      if (events & EVENT.JUMP) {
        spray(f.x - 8, f.y - 1, 5, { speed: 60, drift });
        spray(f.x - 10, f.y - 1, 3, { speed: 40, drift, colors: SPARKS, size: 1, life: 0.2 }); // tail snap
      }
      if (events & EVENT.LAND) {
        spray(f.x - 8, f.y - 1, 4, { speed: 80, drift, up: f.up });
        spray(f.x + 8, f.y - 1, 3, { speed: 80, drift, up: f.up });
        bounce = 2;
      }
      if (events & EVENT.DOUBLE_JUMP) {
        spray(f.x, f.y, 12, { speed: 120, colors: ['#ffffff', '#ffd166', '#9d8cff'], size: 2, life: 0.4 });
      }
      if (events & EVENT.SHIELD) {
        // A ring of light bursts out, and a big SAVED!
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          bits.push({ x: f.x, y: f.y - 18, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, gravity: 0, age: 0, life: 0.4, color: i % 2 ? '#ffffff' : '#7bd389', size: 2 });
        }
        popups.push({ text: 'SAVED!', x: 82, y: 120, age: 0 });
        shake = Math.max(shake, 4);
      }
      if (events & EVENT.FLIP) {
        spray(f.x, f.y, 10, { speed: 90, drift: drift * 0.5, colors: FLIP_SPARKLE, size: 2, life: 0.4, up: f.up });
      }
      if (events & EVENT.DUCK) spray(f.x - 10, f.y - 1, 3, { speed: 40, drift });
      if (events & EVENT.DASH) {
        spray(f.x - 10, f.y - 2, 6, { speed: 50, drift: drift * 1.5 });
        bounce = 1;
      }
      if (events & EVENT.PUSH) spray(f.x - 14, f.y - 1, 2, { speed: 30, drift });
      if (events & EVENT.SMASH) {
        const [sx, sy, kind] = game.smash();
        spray(sx, sy, 18, { speed: 220, drift: 40, colors: debrisFor(kind), size: 2, life: 0.7, gravity: 600 });
        spray(sx, sy, 6, { speed: 120, drift: 0, colors: ['#ffffff'], size: 2, life: 0.25 });
        shake = Math.max(shake, 2.5);
      }
      if (events & EVENT.ZONE_CHANGE) popups.push({ text: '+100', x: 112, y: 22, age: 0 });
      if (events & EVENT.SMASH) {
        const [sx, sy] = game.smash();
        popups.push({ text: '+1', x: sx - 4, y: sy - 18, age: 0, coin: true, world: true });
      }
      if (events & EVENT.DIED) {
        shake = 6;
        flash = 1;
        spray(f.x, f.y - 18, 12, { speed: 140 });
        tumble = { x: f.x, y: f.upside ? f.y + 46 : f.y, vx: -50, vy: f.upside ? 60 : -240, age: 0 };
        board = { x: f.x, y: f.upside ? f.y + 4 : f.y - 4, vx: 90, vy: f.upside ? 40 : -150, age: 0 };
      }
    },

    // Moves everything along by dt seconds (real time)
    update(dt, game, running) {
      for (const b of bits) {
        b.age += dt;
        b.vy += b.gravity * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      bits = bits.filter((b) => b.age < b.life);
      for (const l of lines) {
        l.age += dt;
        l.x -= 420 * dt;
      }
      lines = lines.filter((l) => l.age < 0.25);
      for (const p of popups) p.age += dt;
      popups = popups.filter((p) => p.age < 1.2);
      shake = Math.max(0, shake - dt * 18);
      flash = Math.max(0, flash - dt * 5);
      bounce = Math.max(0, bounce - dt * 16);
      for (const t of [tumble, board]) {
        if (!t) continue;
        t.age += dt;
        t.vy += 900 * dt;
        t.x += t.vx * dt;
        t.y += t.vy * dt;
      }
      if (!running || game.is_dead()) return;

      const pose = game.pose();
      const f = feet(game);
      // Sparks fly off the tail while he brakes
      if (pose === POSE.BRAKE) {
        spray(f.x - 13, f.y - 1, 2, { speed: 70, drift: -60, colors: SPARKS, size: 1, life: 0.3, gravity: 300 });
      }
      // Speed lines while he dashes
      if (pose === POSE.DASH && Math.random() < dt * 40) {
        lines.push({ x: PLAYER_X + Math.random() * 20, y: f.y - 6 - Math.floor(Math.random() * 30), len: 8 + Math.floor(Math.random() * 14), age: 0 });
      }
      // Little puffs of dust from the wheels while he rolls
      if ((pose === POSE.RIDE || pose === POSE.PUSH) && game.speed() > 20) {
        rollPuff -= dt;
        if (rollPuff <= 0) {
          spray(f.x - 6, f.y - 1, 1, { speed: 18, drift: -game.speed() * 0.5, up: f.up, size: 2, life: 0.3 });
          rollPuff = 0.2;
        }
      }
    },

    // Camera offset in whole pixels: shake plus the landing bounce
    camera() {
      const s = calm ? 0 : Math.round(shake);
      return {
        x: s ? Math.round((Math.random() - 0.5) * s * 2) : 0,
        y: (s ? Math.round((Math.random() - 0.5) * s * 2) : 0) + Math.round(bounce),
      };
    },

    isTumbling: () => tumble !== null,

    // A "+5" coin pop-up under the score
    coins(amount) {
      popups.push({ text: '+' + amount, x: 58, y: 50, age: 0, coin: true });
    },

    // Speed lines, behind the boy
    drawBehind(ctx) {
      for (const l of lines) {
        const fade = l.age > 0.15;
        rect(ctx, Math.round(l.x), l.y, l.len, 1, fade ? '#ffffff88' : '#ffffff');
      }
    },

    // Dust, sparks, debris, and the crash, drawn in the world
    drawWorld(ctx) {
      for (const b of bits) {
        const shrink = b.age > b.life * 0.6 ? 1 : 0;
        const s = Math.max(1, b.size - shrink);
        rect(ctx, Math.round(b.x), Math.round(b.y) - s, s, s, b.age < b.life * 0.4 ? b.color : b.color === DUST[0] ? DUST[1] : b.color);
      }
      if (board) drawBoard(ctx, board.x, board.y, Math.floor(board.age / 0.07));
      if (tumble) {
        // A quarter turn every 0.08 s keeps the pixels sharp while he spins
        drawBoy(ctx, 'hurt', 0, tumble.x, tumble.y, { turns: Math.floor(tumble.age / 0.08) });
      }
    },

    // Pop-ups and the crash flash, on top of everything
    drawOverlay(ctx, width, height) {
      for (const p of popups) {
        if (p.age > 0.9 && Math.floor(p.age * 20) % 2) continue; // blink out
        const y = p.y - Math.floor(p.age * 10);
        if (p.coin) drawCoin(ctx, p.x - 11, y - 1);
        pixelText(ctx, p.text, p.x, y, { color: '#ffd166', outline: OUTLINE });
      }
      if (flash > 0) {
        ctx.globalAlpha = flash > 0.7 ? 1 : flash;
        rect(ctx, 0, 0, width, height, '#ffffff');
        ctx.globalAlpha = 1;
      }
    },
  };
}

