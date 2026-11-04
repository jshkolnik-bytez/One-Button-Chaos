// tutorial.js: teaches every zone's move, one zone at a time, with real
// obstacles. Nothing can end the run here: a crash is just "OOPS!". Each
// lesson ends once you've done the move enough times, then the next zone
// rolls in. You can skip it at any time, and replay it from the title screen.
import { WIDTH, HEIGHT, ZONES, KIND, EVENT } from './world.js';
import { rect, box, pixelText, OUTLINE } from './art/pixel.js';
import { drawButtonIcon } from './hud.js';

// count: what makes progress
//   'clear'   = getting past something without hitting it
//   'gap'     = getting over a gap between rooftops
//   'smash'   = smashing something with a dash
//   'street'  = crossing a side street without being hit
//   'seconds' = staying ahead of the donut (resets if it catches you)
//   'trick'   = landing a trick in mid-air (only taught if you have a keyboard)
const ALL_LESSONS = [
  { zone: 0, goal: 3, count: 'clear', task: 'OLLIE OVER 3 THINGS' },
  { zone: 1, goal: 2, count: 'gap', task: 'JUMP 2 GAPS. HOLD LONGER = FURTHER' },
  { zone: 2, goal: 3, count: 'clear', task: 'GET PAST 3 THINGS: FLOOR OR CEILING' },
  { zone: 3, goal: 3, count: 'clear', task: 'DUCK UNDER 3 THINGS, THEN LET GO' },
  { zone: 4, goal: 3, count: 'smash', task: 'SMASH 3 THINGS' },
  { zone: 5, goal: 2, count: 'street', task: 'CROSS 2 STREETS. STOP FOR CARS!' },
  { zone: 6, goal: 6, count: 'seconds', task: 'STAY AHEAD OF THE DONUT FOR 6 SEC' },
  { zone: 7, goal: 3, count: 'clear', task: 'SWITCH LANES TO GET PAST 3 THINGS' },
  { zone: 8, goal: 2, count: 'gap', task: 'FLY OVER 2 HOLES. MISS THE GULLS!' },
  { zone: 0, goal: 2, count: 'trick', task: 'OLLIE, THEN PRESS THE 2 KEYS!', title: 'TRICKS' },
];
let LESSONS = ALL_LESSONS;

const NICE_TIME = 1.3; // "NICE!" shows this long before the next zone
const OOPS_TIME = 0.9;
const CARD_GUARD = 0.35; // ignore presses this soon after a card appears

export function createTutorial() {
  let step = -1; // -1 = welcome card, 0-6 = lessons, 7 = "you're ready" card
  let progress = 0;
  let nice = 0; // counts down after a lesson is done
  let oops = 0;
  let cardAge = 0;

  const lesson = () => LESSONS[step];

  return {
    start({ keyboard = true } = {}) {
      LESSONS = keyboard ? ALL_LESSONS : ALL_LESSONS.filter((l) => l.count !== 'trick');
      step = -1;
      progress = 0;
      nice = 0;
      oops = 0;
      cardAge = 0;
    },

    // Is the game running (a lesson), or is a card showing?
    isPlaying: () => step >= 0 && step < LESSONS.length,
    isFinished: () => step >= LESSONS.length,

    // tricks.js tells us when a trick lands
    trickDone() {
      if (step >= 0 && step < LESSONS.length && nice <= 0 && lesson().count === 'trick') {
        progress += 1;
        if (progress >= lesson().goal) {
          progress = lesson().goal;
          nice = NICE_TIME;
        }
      }
    },

    // A press on a card moves on. Returns 'lesson' when a lesson should start,
    // 'done' at the end, or null if the press was for the game.
    press(game) {
      if (step >= 0 && step < LESSONS.length) return null;
      if (cardAge < CARD_GUARD) return 'ignore';
      if (step < 0) {
        step = 0;
        progress = 0;
        game.tutorial_zone(LESSONS[0].zone);
        return 'lesson';
      }
      return 'done';
    },

    // Counts progress from what happened in the game this frame
    update(dt, events, game) {
      cardAge += dt;
      oops = Math.max(0, oops - dt);
      if (!(step >= 0 && step < LESSONS.length)) return;
      const l = lesson();

      if (nice > 0) {
        nice -= dt;
        if (nice <= 0) {
          step += 1;
          progress = 0;
          cardAge = 0;
          if (step < LESSONS.length) game.tutorial_zone(LESSONS[step].zone);
        }
        return;
      }

      if (events & EVENT.BUMP) {
        oops = OOPS_TIME;
        if (l.count === 'seconds') progress = 0;
      }
      if (events & EVENT.CLEAR) {
        const kind = game.last_cleared();
        if (l.count === 'clear') progress += 1;
        if (l.count === 'gap' && (kind === KIND.GAP || kind === KIND.WATER_GAP)) progress += 1;
        if (l.count === 'street' && kind === KIND.JUNCTION) progress += 1;
      }
      if (l.count === 'smash' && events & EVENT.SMASH) progress += 1;
      if (l.count === 'seconds') progress += dt;

      if (progress >= l.goal) {
        progress = l.goal;
        nice = NICE_TIME;
      }
    },

    // Drawn on top of the game instead of the score
    draw(ctx, game, view) {
      if (step < 0) {
        card(ctx, view, 'WELCOME TO ONE BUTTON CHAOS', [
          'YOU ONLY EVER NEED ONE BUTTON:',
          'SPACE, A CLICK, OR A TAP.',
          '',
          'BUT EVERY ZONE OF THE CITY',
          'CHANGES WHAT IT DOES!',
        ], cardAge > CARD_GUARD ? 'PRESS TO START THE TUTORIAL' : '');
        return;
      }
      if (step >= LESSONS.length) {
        card(ctx, view, "YOU'RE READY!", [
          'IN A REAL RUN THE ZONE CHANGES',
          'EVERY 12 SECONDS, AND THE CITY',
          'GETS FASTER. WATCH FOR THE SIGN!',
          '',
          'BEAT ZONES TO EARN COINS FOR THE SHOP.',
          'TRICKS IN THE AIR = BONUS POINTS!',
        ], cardAge > CARD_GUARD ? 'PRESS TO PLAY FOR REAL' : '');
        return;
      }
      lessonPanel(ctx, view, lesson(), step, progress, nice, oops);
    },
  };
}

// ---------- Drawing ----------

function card(ctx, view, title, lines, prompt) {
  // Darken the city behind the card a little
  ctx.globalAlpha = 0.45;
  rect(ctx, 0, 0, WIDTH, HEIGHT, OUTLINE);
  ctx.globalAlpha = 1;
  const w = 330;
  const h = 40 + lines.length * 12 + 26;
  const x = WIDTH / 2 - w / 2;
  const y = 58;
  box(ctx, x, y, w, h, { fill: '#2b2440', light: '#4d4369', shade: '#1f1a2e' });
  rect(ctx, x + 1, y + 1, w - 2, 2, '#ff5fa2');
  pixelText(ctx, title, WIDTH / 2, y + 12, { align: 'center', color: '#ffd166', outline: OUTLINE });
  lines.forEach((line, i) => {
    if (line) pixelText(ctx, line, WIDTH / 2, y + 32 + i * 12, { align: 'center', color: '#ffffff', outline: OUTLINE });
  });
  if (prompt && Math.floor(view.time * 2) % 2 === 0) {
    pixelText(ctx, prompt, WIDTH / 2, y + h - 18, { align: 'center', color: '#7bd389', outline: OUTLINE });
  }
}

function lessonPanel(ctx, view, lesson, step, progress, nice, oops) {
  const zone = ZONES[lesson.zone];
  const w = 300;
  const x = 8; // left side: the SKIP button sits top-right
  const y = 8;
  box(ctx, x, y, w, 48, { fill: '#221d33', light: '#3a3352', shade: '#15111f' });
  rect(ctx, x + 1, y + 1, w - 2, 2, zone.accent);

  // Lesson number and zone
  pixelText(ctx, `${step + 1}/${LESSONS.length}  ${lesson.title || zone.name.toUpperCase()}`, x + 8, y + 8, { color: zone.accent, outline: OUTLINE });

  // The button and what it does
  const key = drawButtonIcon(ctx, zone.button, x + 8 + zone.button.length * 8 + 10, y + 21, zone.accent);
  pixelText(ctx, 'TO ' + zone.action, key + zone.button.length * 8 + 16, y + 25, { color: '#ffffff', outline: OUTLINE });

  // The task, and progress pips (or a bar for seconds)
  pixelText(ctx, lesson.task, x + 8, y + 39, { color: '#ffd166', outline: OUTLINE });
  if (lesson.count === 'seconds') {
    rect(ctx, x + w - 58, y + 9, 50, 6, OUTLINE);
    rect(ctx, x + w - 57, y + 10, Math.round((48 * progress) / lesson.goal), 4, zone.accent);
  } else {
    for (let i = 0; i < lesson.goal; i++) {
      const px = x + w - 10 - (lesson.goal - i) * 10;
      rect(ctx, px, y + 8, 8, 8, OUTLINE);
      rect(ctx, px + 1, y + 9, 6, 6, i < progress ? zone.accent : '#3a3352');
      if (i < progress) rect(ctx, px + 2, y + 10, 2, 1, '#ffffff');
    }
  }

  // Big feedback in the middle of the screen
  if (nice > 0) {
    pixelText(ctx, step === LESSONS.length - 1 ? 'DONE!' : 'NICE! NEXT ZONE...', WIDTH / 2, 92, {
      size: 16, align: 'center', color: '#7bd389', outline: OUTLINE,
    });
  } else if (oops > 0 && Math.floor(oops * 10) % 2 === 0) {
    pixelText(ctx, 'OOPS! TRY AGAIN', WIDTH / 2, 92, { size: 16, align: 'center', color: '#ff6b6b', outline: OUTLINE });
  }
}
