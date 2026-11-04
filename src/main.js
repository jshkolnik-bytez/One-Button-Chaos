// main.js: starts the game, runs the game loop, and switches between screens.
import { loadEngine } from './engine.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { createEffects } from './effects.js';
import { createUI } from './ui.js';
import { loadBoy, setLoadout } from './art/boy.js';
import { CREW, coinsForZone, COINS_PER_SMASH, coinMultiplier, crewIndex, boardIndex } from './crew.js';
import { unlockAudio, playEvents, setMuted, sound } from './audio.js';
import { ZONES, EVENT } from './world.js';
import * as storage from './storage.js';
import { todaySeed, dayLabel, randomSeed } from './daily.js';
import { createTutorial } from './tutorial.js';
import { createTricks } from './tricks.js';

const STEP_MS = 1000 / 60; // the game updates exactly 60 times per second
const CRASH_MS = 700; // after crashing, watch him tumble before the game over panel
const RESTART_MS = 1000; // ...and ignore presses until this long after the crash

const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
let renderer = null;
const effects = createEffects({ debrisFor: (kind) => renderer?.debrisFor(kind) });

let engine = null;
let game = null;
let screen = 'loading'; // 'title', 'tutorial', 'playing', 'paused', 'crashed' or 'gameover'
let pausedFrom = 'playing'; // which screen to go back to after a pause
const tutorial = createTutorial();
const COINS_PER_TRICK = 1;
// Tricks in mid-air: bonus points (and a coin), sparkles and a sound
const tricks = createTricks({
  onTrick(trick, points, combo) {
    sound.trick(combo);
    effects.trick(game, combo);
    if (screen === 'tutorial') tutorial.trickDone();
    if (screen === 'playing') {
      const earned = Math.round(COINS_PER_TRICK * coinMultiplier(loadout.crew, loadout.board));
      runCoins += earned;
      storage.addCoins(earned);
    }
  },
});
let mode = storage.lastMode(); // 'daily' or 'free'
let runDay = todaySeed(); // the date the current run started on
let best = storage.bestScore();
let diedAt = 0;
let timeBank = 0;
let muted = storage.isMuted();
let runCoins = 0; // coins earned this run (they're banked straight away)

const ui = createUI({
  onChooseMode: (chosen) => startRun(chosen),
  onMenu: () => showTitle(),
  onToggleMute: () => {
    muted = !muted;
    storage.setMuted(muted);
    setMuted(muted);
    ui.setMuteLabels(muted);
    sound.click();
  },
  onUiSound: () => sound.click(),
  onBuy: () => {
    useLoadout();
    sound.unlock();
  },
  onWear: () => {
    useLoadout();
    sound.click();
  },
  onTutorial: () => startTutorial(),
  onSkipTutorial: () => skipTutorial(),
});
setMuted(muted);
ui.setMuteLabels(muted);

// Puts the chosen skater on the chosen board
let loadout = { crew: 'jay', board: 'classic' };
function useLoadout() {
  loadout = ui.loadout();
  setLoadout(crewIndex(loadout.crew), boardIndex(loadout.board));
}

// A new game with the chosen skater and board (their powers change the rules)
function newGame(seed) {
  const g = engine.newGame(seed);
  g.set_loadout(crewIndex(loadout.crew), boardIndex(loadout.board));
  return g;
}

function showTitle() {
  screen = 'title';
  const day = todaySeed();
  ui.showTitle({ best: storage.bestScore(), dailyBest: storage.dailyBest(day), day: dayLabel(day) });
}

// The tutorial: a safe practice game that walks through every zone
function startTutorial() {
  game = newGame(randomSeed());
  game.set_tutorial(true);
  tutorial.start({ keyboard: tricks.hasKeyboard() });
  tricks.reset();
  effects.reset();
  renderer.reset();
  remember();
  timeBank = 0;
  screen = 'tutorial';
  ui.showTutorialBar();
}

// Finishing or skipping it goes straight into a real run
function skipTutorial() {
  if (screen !== 'tutorial' && !(screen === 'paused' && pausedFrom === 'tutorial')) return;
  storage.setTutorialSeen();
  sound.click();
  startRun();
}

function startRun(newMode = mode) {
  mode = newMode;
  // Your very first run starts with the tutorial (you can skip it)
  if (!storage.tutorialSeen()) {
    startTutorial();
    return;
  }
  storage.setLastMode(mode);
  runDay = todaySeed();
  best = storage.bestScore();
  game = newGame(mode === 'daily' ? runDay : randomSeed());
  tricks.reset();
  effects.reset();
  renderer.reset();
  remember();
  runCoins = 0;
  timeBank = 0;
  screen = 'playing';
  ui.hideAll();
}

function showGameOver() {
  screen = 'gameover';
  const score = game.score();
  const records = storage.recordScore(score, mode, runDay);
  if (records.newBest) sound.newBest();
  const zone = ZONES[game.death_zone()].name;
  ui.showGameOver({
    score,
    best: storage.bestScore(),
    newBest: records.newBest,
    deathZone: game.death_zone(),
    deathKind: game.death_kind(),
    coins: runCoins,
    shareText:
      mode === 'daily'
        ? `One Button Chaos, ${dayLabel(runDay)}: ${score.toLocaleString('en-US')} pts as ${CREW[crewIndex(loadout.crew)].name}, died in ${zone}`
        : null,
  });
}

// Switching tabs or windows pauses the run, so you never crash while away
function pause() {
  if (screen !== 'playing' && screen !== 'tutorial') return;
  pausedFrom = screen;
  screen = 'paused';
  ui.showPause();
}

function resume() {
  screen = pausedFrom;
  timeBank = 0;
  if (screen === 'tutorial') ui.showTutorialBar();
  else ui.hideAll();
}

// Any key at all means this player has a keyboard (so the tutorial teaches tricks).
// This listens first, before the button below starts the tutorial.
window.addEventListener('keydown', () => tricks.noteKeyboard(), true);

// What the one button does depends on which screen we're on
createInput({
  onPress() {
    unlockAudio(); // browsers only allow sound after a press
    if (ui.isPanelOpen()) return;
    if (screen === 'playing') game.press();
    else if (screen === 'tutorial') {
      const card = tutorial.press(game);
      if (card === null) game.press();
      else if (card === 'done') skipTutorial();
    } else if (screen === 'title') startRun(document.activeElement?.dataset?.mode || mode);
    else if (screen === 'paused') resume(); // this press only un-pauses
    else if (screen === 'gameover' && performance.now() - diedAt > RESTART_MS) startRun();
  },
  onRelease() {
    if (screen === 'playing' || screen === 'tutorial') game.release();
  },
  onFocusLost: pause,
});
// Esc skips the tutorial. Letter keys do tricks in mid-air.
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && screen === 'tutorial') skipTutorial();
  const playing = screen === 'playing' || (screen === 'tutorial' && tutorial.isPlaying());
  if (ui.isPanelOpen()) return;
  if (tricks.key(e, playing ? game : null) && playing) e.preventDefault();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

// Coins for beating zones and smashing things. They go straight into your
// savings, so you keep them even if you close the game mid-run.
function earnCoins(events) {
  let earned = 0;
  if (events & EVENT.ZONE_CHANGE) earned += coinsForZone(game.zone_changes());
  if (events & EVENT.SMASH) earned += COINS_PER_SMASH;
  if (!earned) return;
  earned = Math.round(earned * coinMultiplier(loadout.crew, loadout.board));
  runCoins += earned;
  storage.addCoins(earned);
  effects.coins(earned);
}

// The game loop. The screen may refresh 60, 120 or 144 times a second, but the
// game must always run at the same speed. So we collect the real time that has
// passed and run one fixed 1/60 s update for every 1/60 s collected. Then we
// draw things part-way between the last two updates, so motion stays smooth
// even when the screen and the game tick at different moments.
let lastTime = performance.now();
let before = { scroll: 0, y: 0, donut: -9999 }; // the game just before the last update

function remember() {
  before = { scroll: game.scroll(), y: game.player()[1], donut: game.donut_x() };
}

function frame(now) {
  let dt = now - lastTime;
  lastTime = now;
  if (dt > 250) dt = 250; // after a long pause, don't try to catch up

  // The tutorial runs the game only during lessons (not on its cards)
  const running = screen === 'playing' || (screen === 'tutorial' && tutorial.isPlaying());
  if (running) {
    tricks.update(dt / 1000, game);
    timeBank += dt;
    // A little slack (3%) stops tiny timer wobbles from giving one frame two
    // updates and the next frame none. Leftover time carries over, so the
    // game never runs fast or slow over time.
    while (timeBank >= STEP_MS * 0.97 && !game.is_dead()) {
      remember();
      game.update();
      timeBank -= STEP_MS;
    }
    if (game.is_dead()) {
      screen = 'crashed';
      diedAt = now;
    }
  }
  if (screen === 'crashed' && now - diedAt > CRASH_MS) showGameOver();

  let events = game.take_events();
  if (screen === 'playing' || screen === 'crashed') earnCoins(events);
  if (screen === 'tutorial') {
    tutorial.update(dt / 1000, events, game);
    events &= ~EVENT.ZONE_CHANGE; // no "+100" pop-ups in the tutorial
  }
  playEvents(events, game);
  effects.handle(events, game);
  effects.update(dt / 1000, game, running);

  // How far we are between the last update and the next one (0 to 1)
  const blend = running ? Math.min(1, Math.max(0, timeBank / STEP_MS)) : 1;
  const scroll = game.scroll();
  const blendedScroll = before.scroll + (scroll - before.scroll) * blend;
  const y = game.player()[1];
  const donut = game.donut_x();
  const view = {
    effects,
    tricks: screen === 'title' ? null : tricks,
    best,
    runCoins,
    events,
    time: now / 1000,
    scroll: blendedScroll,
    obstacleShift: scroll - blendedScroll, // obstacles were this much further right
    playerY: Math.abs(y - before.y) > 40 ? y : before.y + (y - before.y) * blend,
    donutX: before.donut < -9000 ? donut : before.donut + (donut - before.donut) * blend,
    tutorial: screen === 'tutorial' || (screen === 'paused' && pausedFrom === 'tutorial') ? tutorial : null,
  };
  if (screen === 'title') renderer.drawTitle(view);
  else renderer.drawGame(game, view, screen === 'paused' || !running && screen === 'tutorial' ? 0 : dt / 1000);
  requestAnimationFrame(frame);
}

async function start() {
  // Wait for the pixel font and the boy's sprite sheet, so nothing pops in late
  await Promise.all([document.fonts.load('8px "Press Start 2P"').catch(() => {}), loadBoy()]);
  useLoadout();
  engine = await loadEngine();
  renderer = createRenderer(canvas, stage);
  game = newGame(todaySeed()); // a game in the background of the menus
  remember();
  showTitle();
  requestAnimationFrame(frame);
}

start();

// Lets automated tests peek at the game while developing (not in the real build)
if (import.meta.env?.DEV) {
  window.__obc = {
    get game() {
      return game;
    },
    get screen() {
      return screen;
    },
    get tricks() {
      return tricks;
    },
  };
}
