// tricks.js: skate tricks in mid-air, for bonus points.
//
// When you ollie (Downtown, or a big jump on the Rooftops), two letter keys
// pop up above your skater. Press BOTH of them before you land (any order)
// and he does a trick! The keys for your next trick show faintly above his
// head while he rolls, so you can get your fingers ready.
//   - A wrong key resets the two keys (so mashing the whole keyboard fails).
//   - Land another trick in the same jump for a combo: x2, x3...
// Tricks need a keyboard, so they only switch on once a key has been pressed.
// The game core (Rust) checks that he really is in the air and adds the points.
import { ZONE } from './world.js';
import { rect, box, pixelText, OUTLINE } from './art/pixel.js';

// Each trick has its own look: how the board turns while it flies.
//   flip = turns over along its length (kickflip), - = the other way
//   spin = turns around flat like a shove-it
//   roll = wraps around the back foot (impossible)
//   lift = how far it comes up between his legs
export const TRICKS = [
  { name: 'KICKFLIP', points: 100, weight: 6, flip: 1 },
  { name: 'HEELFLIP', points: 100, weight: 6, flip: -1 },
  { name: 'POP SHOVE-IT', points: 120, weight: 5, spin: 1 },
  { name: 'VARIAL FLIP', points: 160, weight: 4, flip: 1, spin: 1 },
  { name: 'HARDFLIP', points: 180, weight: 3, flip: 1, lift: 7 },
  { name: 'IMPOSSIBLE', points: 200, weight: 3, roll: 1 },
  { name: 'DOUBLE KICKFLIP', points: 230, weight: 2, flip: 2 },
  { name: '360 FLIP', points: 280, weight: 2, flip: 1, spin: 2 },
];

// Letters only (easy to find on any keyboard, nothing the browser uses)
const KEYS = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('');
const ANIM_TIME = 0.38; // how long the board takes to do its trick
const POPUP_TIME = 1.1;

function pickTrick() {
  const total = TRICKS.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * total;
  for (const t of TRICKS) {
    roll -= t.weight;
    if (roll < 0) return t;
  }
  return TRICKS[0];
}

function pickKeys() {
  const a = KEYS[Math.floor(Math.random() * KEYS.length)];
  let b = a;
  while (b === a) b = KEYS[Math.floor(Math.random() * KEYS.length)];
  return [a, b];
}

export function createTricks({ onTrick = () => {} } = {}) {
  let keyboard = false; // has a key been pressed? (phones have no keys)
  let pair = null; // { keys: ['F', 'J'], got: [false, false], trick }
  let inAir = false;
  let combo = 0; // tricks in this jump
  let anim = null; // { trick, t }: the board doing its trick
  let popups = [];
  let wrong = 0; // flashes red after a wrong key
  let total = 0; // tricks this run

  function newPair() {
    pair = { keys: pickKeys(), got: [false, false], trick: pickTrick() };
  }
  newPair();

  return {
    hasKeyboard: () => keyboard,
    noteKeyboard: () => (keyboard = true),
    keys: () => [...pair.keys], // (for automated tests)
    count: () => total,

    reset() {
      combo = 0;
      anim = null;
      popups = [];
      inAir = false;
      wrong = 0;
      total = 0;
      newPair();
    },

    // A key went down. Returns true if it was a trick key.
    key(e, game) {
      keyboard = true; // any key (Space too) means this player has a keyboard
      const k = typeof e.key === 'string' && e.key.length === 1 ? e.key.toUpperCase() : '';
      if (!KEYS.includes(k) || e.ctrlKey || e.metaKey || e.altKey) return false;
      if (e.repeat || !game || !game.can_trick()) return true;
      const i = pair.keys.indexOf(k);
      if (i < 0 || pair.got[i]) {
        // Wrong key: start the two keys again
        pair.got = [false, false];
        wrong = 0.3;
        return true;
      }
      pair.got[i] = true;
      if (pair.got[0] && pair.got[1]) {
        const trick = pair.trick;
        const points = trick.points * (combo + 1);
        if (game.trick(points)) {
          combo += 1;
          total += 1;
          anim = { trick, t: 0 };
          popups = [{ name: trick.name, points, combo, age: 0 }]; // the newest trick replaces the last one
          onTrick(trick, points, combo);
        }
        newPair();
      }
      return true;
    },

    update(dt, game) {
      const air = game.can_trick();
      if (inAir && !air) {
        // Landed: the combo ends, and half-pressed keys are forgotten
        combo = 0;
        pair.got = [false, false];
        if (anim) anim.t = Math.max(anim.t, ANIM_TIME * 0.85); // the board snaps back under his feet
      }
      inAir = air;
      if (anim) {
        anim.t += dt;
        if (anim.t >= ANIM_TIME) anim = null;
      }
      for (const p of popups) p.age += dt;
      popups = popups.filter((p) => p.age < POPUP_TIME);
      wrong = Math.max(0, wrong - dt);
    },

    // How the board should turn right now (for art/boy.js), or null
    boardTrick() {
      if (!anim) return null;
      return { ...anim.trick, p: Math.min(1, anim.t / ANIM_TIME) };
    },

    // The two keys above his head, and the trick names popping up.
    // headX, headY = just above his head on screen.
    draw(ctx, game, headX, headY, time) {
      if (keyboard && !game.is_dead()) {
        const zone = game.zone();
        const trickZone = zone === ZONE.DOWNTOWN || zone === ZONE.ROOFTOPS;
        const air = game.can_trick();
        if (trickZone) {
          drawKeys(ctx, pair, headX, headY, air, wrong > 0, time);
        }
      }
      // Pop-ups rise from his head: TRICK NAME, then +points (and the combo)
      popups.forEach((p) => {
        if (p.age > POPUP_TIME - 0.25 && Math.floor(p.age * 20) % 2) return; // blink out
        const rise = Math.floor(Math.min(p.age, 0.5) * 30);
        const y = Math.max(12, headY - 34 - rise);
        const big = p.age < 0.08 ? '#ffffff' : '#ffd166';
        pixelText(ctx, p.name, headX, y, { align: 'center', color: big, outline: OUTLINE, shadow: '#ff5fa2' });
        const label = p.combo > 1 ? `+${p.points}  x${p.combo} COMBO!` : `+${p.points}`;
        pixelText(ctx, label, headX, y + 10, { align: 'center', color: p.combo > 1 ? '#7ff0e4' : '#ffffff', outline: OUTLINE });
      });
    },
  };
}

// Two little keyboard keys. Bright in the air (press them now!), faint on
// the ground (get ready). A key turns green once it's pressed.
function drawKeys(ctx, pair, cx, y, air, wrong, time) {
  const size = 13;
  const gap = 4;
  const left = Math.round(cx - size - gap / 2);
  const top = Math.round(y - size - 4 - (air ? Math.round(Math.sin(time * 18)) : 0));
  if (!air) ctx.globalAlpha = 0.45;
  pair.keys.forEach((k, i) => {
    const x = left + i * (size + gap);
    const done = pair.got[i];
    const fill = wrong ? '#ff6b6b' : done ? '#7bd389' : '#f1e9f7';
    box(ctx, x, top, size, size, { fill, light: '#ffffff', shade: wrong ? '#b23b3b' : done ? '#3e8a4c' : '#9d93b5' });
    rect(ctx, x, top + size, size, 1, OUTLINE); // the key's side, so it looks pressable
    pixelText(ctx, k, x + 3, top + 3, { color: OUTLINE });
  });
  ctx.globalAlpha = 1;
}
