// storage.js: remembers things on this device using localStorage: your
// best score, today's Daily Chaos best, your last game mode, whether the
// sound is off, your coins, and the skaters and boards you've unlocked.
// If the browser blocks storage (some private windows do), the game still
// works; it just can't remember anything.

const PREFIX = 'one-button-chaos/';

function load(key, fallback) {
  try {
    const text = localStorage.getItem(PREFIX + key);
    return text === null ? fallback : JSON.parse(text);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage isn't allowed here: nothing we can do, the game still works
  }
}

export function bestScore() {
  return load('best', 0);
}

// Today's best Daily Chaos score (only today's is kept)
export function dailyBest(day) {
  const saved = load('daily-best', null);
  return saved && saved.day === day ? saved.score : 0;
}

// Saves a finished run and says which records it broke
export function recordScore(score, mode, day) {
  const result = { newBest: false, newDailyBest: false };
  if (score > bestScore()) {
    save('best', score);
    result.newBest = true;
  }
  if (mode === 'daily' && score > dailyBest(day)) {
    save('daily-best', { day, score });
    result.newDailyBest = true;
  }
  return result;
}

export function lastMode() {
  return load('mode', 'daily');
}

export function setLastMode(mode) {
  save('mode', mode);
}

export function isMuted() {
  return load('muted', false);
}

export function setMuted(muted) {
  save('muted', muted);
}

// ---------- Coins and skins ----------

export function coins() {
  return load('coins', 0);
}

export function addCoins(amount) {
  save('coins', coins() + amount);
}

// Spends coins if you have enough. Returns true if it worked.
export function spendCoins(amount) {
  if (coins() < amount) return false;
  save('coins', coins() - amount);
  return true;
}

// The crew and boards you've unlocked, and which you're using
export function owned(kind) {
  return load('owned-' + kind, kind === 'crew' ? ['jay'] : ['classic']);
}

export function unlock(kind, id) {
  const list = owned(kind);
  if (!list.includes(id)) save('owned-' + kind, [...list, id]);
}

export function chosen(kind) {
  return load('chosen-' + kind, kind === 'crew' ? 'jay' : 'classic');
}

export function choose(kind, id) {
  save('chosen-' + kind, id);
}
