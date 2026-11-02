// audio.js: 8-bit style sound effects, made from scratch with the Web Audio
// API. There are no sound files: each sound is a few beeps and noises built
// from simple waves, so it's tiny and easy to change.
import { EVENT } from './world.js';

let ctx = null; // the audio "mixing desk", created on the first press
let master = null;
let muted = false;

// Browsers only allow sound after the player presses something, so the
// first press calls this to switch the sound on.
export function unlockAudio() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return; // no sound on this browser, the game still works
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.5;
}

// One beep: a wave that slides from `freq` to `to` and fades out
function tone({ freq, to = freq, type = 'square', dur = 0.12, vol = 0.2, delay = 0 }) {
  if (!ctx || muted) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + dur);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

// A burst of hiss (for crashes and smashing glass)
function noise({ dur = 0.3, vol = 0.3, cutoff = 2000, delay = 0 }) {
  if (!ctx || muted) return;
  const start = ctx.currentTime + delay;
  const samples = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  source.connect(filter).connect(gain).connect(master);
  source.start(start);
}

export const sound = {
  // Ollie: the tail snapping on the ground, then a whoosh up
  jump: () => {
    noise({ dur: 0.04, vol: 0.25, cutoff: 3000 });
    tone({ freq: 320, to: 720, dur: 0.12, vol: 0.1 });
  },
  // Wheels hitting the ground
  land: () => {
    noise({ dur: 0.07, vol: 0.2, cutoff: 900 });
    tone({ freq: 140, to: 70, type: 'triangle', dur: 0.06, vol: 0.12 });
  },
  duck: () => tone({ freq: 500, to: 260, type: 'triangle', dur: 0.1, vol: 0.15 }),
  brake: () => noise({ dur: 0.35, vol: 0.12, cutoff: 6000 }),
  push: () => {
    noise({ dur: 0.05, vol: 0.12, cutoff: 1500 });
    tone({ freq: 180 + Math.random() * 80, to: 120, type: 'square', dur: 0.05, vol: 0.06 });
  },
  doubleJump: () => tone({ freq: 600, to: 1300, type: 'triangle', dur: 0.14, vol: 0.14 }),
  shield: () => {
    tone({ freq: 220, to: 880, type: 'square', dur: 0.25, vol: 0.12 });
    tone({ freq: 660, to: 1320, type: 'triangle', dur: 0.3, vol: 0.12, delay: 0.08 });
  },
  horn: () => {
    tone({ freq: 392, type: 'sawtooth', dur: 0.25, vol: 0.07 });
    tone({ freq: 466, type: 'sawtooth', dur: 0.25, vol: 0.07 });
  },
  flip: () => tone({ freq: 600, to: 200, type: 'triangle', dur: 0.18, vol: 0.25 }),
  shrink: () => tone({ freq: 700, to: 1400, type: 'sine', dur: 0.1, vol: 0.2 }),
  grow: () => tone({ freq: 500, to: 250, type: 'sine', dur: 0.12, vol: 0.2 }),
  dash: () => {
    noise({ dur: 0.15, vol: 0.15, cutoff: 4000 });
    tone({ freq: 200, to: 900, type: 'sawtooth', dur: 0.15, vol: 0.08 });
  },
  shatter: () => {
    noise({ dur: 0.35, vol: 0.3, cutoff: 9000 });
    tone({ freq: 2400, to: 1200, type: 'triangle', dur: 0.2, vol: 0.08 });
  },
  freezeOn: () => {
    tone({ freq: 1200, to: 1800, type: 'sine', dur: 0.25, vol: 0.12 });
    tone({ freq: 1600, to: 2400, type: 'sine', dur: 0.25, vol: 0.08, delay: 0.05 });
  },
  freezeOff: () => tone({ freq: 900, to: 400, type: 'sine', dur: 0.15, vol: 0.1 }),
  mash: () => tone({ freq: 180 + Math.random() * 80, to: 120, type: 'square', dur: 0.05, vol: 0.07 }),
  // The rule-change alarm: two-tone "wee-woo"
  alarm: () => {
    tone({ freq: 880, type: 'square', dur: 0.14, vol: 0.13 });
    tone({ freq: 660, type: 'square', dur: 0.14, vol: 0.13, delay: 0.16 });
  },
  countdown: () => tone({ freq: 880, type: 'square', dur: 0.1, vol: 0.12 }),
  zoneChange: () => {
    tone({ freq: 523, type: 'triangle', dur: 0.1, vol: 0.2 });
    tone({ freq: 784, type: 'triangle', dur: 0.1, vol: 0.2, delay: 0.08 });
    tone({ freq: 1047, type: 'triangle', dur: 0.18, vol: 0.2, delay: 0.16 });
  },
  crash: () => {
    noise({ dur: 0.5, vol: 0.45, cutoff: 1200 });
    tone({ freq: 300, to: 40, type: 'sawtooth', dur: 0.5, vol: 0.2 });
  },
  newBest: () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.16, vol: 0.18, delay: i * 0.1 })),
  unlock: () =>
    [784, 988, 1175, 1568].forEach((f, i) => tone({ freq: f, type: 'square', dur: 0.14, vol: 0.1, delay: 0.5 + i * 0.09 })),
  click: () => tone({ freq: 600, type: 'triangle', dur: 0.05, vol: 0.12 }),
};

let lastCount = 0; // for the countdown beeps

// Plays sounds for whatever happened in the game this frame
export function playEvents(events, game) {
  const changing = game.next_zone() !== game.zone();
  if (events & EVENT.JUMP) sound.jump();
  if (events & EVENT.LAND) sound.land();
  if (events & EVENT.FLIP) sound.flip();
  if (events & EVENT.DUCK) sound.duck();
  if (events & EVENT.DASH) sound.dash();
  if (events & EVENT.SMASH) sound.shatter();
  if (events & EVENT.BRAKE) sound.brake();
  if (events & EVENT.PUSH) sound.push();
  if (events & EVENT.CAR) sound.horn();
  if (events & EVENT.DOUBLE_JUMP) sound.doubleJump();
  if (events & EVENT.SHIELD) sound.shield();
  if (events & EVENT.WARNING && changing) sound.alarm();
  if (events & EVENT.ZONE_CHANGE) sound.zoneChange();
  if (events & EVENT.DIED) sound.crash();

  // Countdown beeps as the street sign counts down to the next zone
  const secondsLeft = game.seconds_to_next_zone();
  const count = changing && secondsLeft <= 3 ? Math.ceil(secondsLeft - 0.001) : 0;
  if (count && count !== lastCount && !game.is_dead()) sound.countdown();
  lastCount = count;
}
