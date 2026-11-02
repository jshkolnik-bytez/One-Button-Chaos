// daily.js: Daily Chaos uses today's date as the seed, like 20261021,
// so everyone who plays today gets the same rules and obstacles.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The seed for a day, from the player's local date: YYYYMMDD
export function todaySeed(date = new Date()) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

// 20261021 -> "Oct 21"
export function dayLabel(seed) {
  const month = Math.floor(seed / 100) % 100;
  const day = seed % 100;
  return `${MONTHS[month - 1]} ${day}`;
}

// A random seed for Free Play
export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}
