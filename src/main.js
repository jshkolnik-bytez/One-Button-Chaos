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

const STEP_MS = 1000 / 60; // the game updates exactly 60 times per second
const CRASH_MS = 700; // after crashing, watch him tumble before the game over panel
const RESTART_MS = 1000; // ...and ignore presses until this long after the crash

const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
let renderer = null;
const effects = createEffects({ debrisFor: (kind) => renderer?.debrisFor(kind) });

let engine = null;
let game = null;
let screen = 'loading'; // 'title', 'playing', 'paused', 'crashed' or 'gameover'
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

function startRun(newMode = mode) {
  mode = newMode;
  storage.setLastMode(mode);
  runDay = todaySeed();
  best = storage.bestScore();
  game = newGame(mode === 'daily' ? runDay : randomSeed());
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
  if (screen !== 'playing') return;
  screen = 'paused';
  ui.showPause();
}

function resume() {
  screen = 'playing';
  timeBank = 0;
  ui.hideAll();
}

// What the one button does depends on which screen we're on
createInput({
  onPress() {
    unlockAudio(); // browsers only allow sound after a press
    if (ui.isPanelOpen()) return;
    if (screen === 'playing') game.press();
    else if (screen === 'title') startRun(document.activeElement?.dataset?.mode || mode);
    else if (screen === 'paused') resume(); // this press only un-pauses
    else if (screen === 'gameover' && performance.now() - diedAt > RESTART_MS) startRun();
  },
  onRelease() {
    if (screen === 'playing') game.release();
  },
  onFocusLost: pause,
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

  if (screen === 'playing') {
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

  const events = game.take_events();
  if (screen === 'playing' || screen === 'crashed') earnCoins(events);
  playEvents(events, game);
  effects.handle(events, game);
  effects.update(dt / 1000, game, screen === 'playing');

  // How far we are between the last update and the next one (0 to 1)
  const blend = screen === 'playing' ? Math.min(1, Math.max(0, timeBank / STEP_MS)) : 1;
  const scroll = game.scroll();
  const blendedScroll = before.scroll + (scroll - before.scroll) * blend;
  const y = game.player()[1];
  const donut = game.donut_x();
  const view = {
    effects,
    best,
    runCoins,
    events,
    time: now / 1000,
    scroll: blendedScroll,
    obstacleShift: scroll - blendedScroll, // obstacles were this much further right
    playerY: Math.abs(y - before.y) > 40 ? y : before.y + (y - before.y) * blend,
    donutX: before.donut < -9000 ? donut : before.donut + (donut - before.donut) * blend,
  };
  if (screen === 'title') renderer.drawTitle(view);
  else renderer.drawGame(game, view, screen === 'paused' ? 0 : dt / 1000);
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
if (import.meta.env.DEV) {
  window.__obc = {
    get game() {
      return game;
    },
    get screen() {
      return screen;
    },
  };
}
