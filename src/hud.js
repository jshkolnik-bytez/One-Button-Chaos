// hud.js: the writing on top of the game, in the chunky pixel font:
// the score (top left), and the zone with its button (top right).
import { WIDTH, ZONES, ZONE_SECONDS, WARNING_SECONDS } from './world.js';
import { rect, box, pixelText, OUTLINE } from './art/pixel.js';
import { drawCoin } from './effects.js';

// Scores are shown with leading zeros, arcade style: 000420
export function scoreText(score) {
  return String(score).padStart(6, '0');
}

// A chunky key cap with TAP, HOLD or MASH on it
export function drawButtonIcon(ctx, label, rightX, y, accent) {
  const w = label.length * 8 + 10;
  const x = rightX - w;
  rect(ctx, x, y, w, 15, OUTLINE);
  rect(ctx, x + 1, y + 1, w - 2, 11, accent);
  rect(ctx, x + 1, y + 1, w - 2, 1, '#ffffff');
  rect(ctx, x + 1, y + 12, w - 2, 2, '#00000055');
  pixelText(ctx, label, x + 5, y + 3, { color: OUTLINE });
  return x;
}

export function drawHud(ctx, game, view) {
  // Score, top left
  pixelText(ctx, 'SCORE', 8, 7, { color: '#ffd166', outline: OUTLINE });
  pixelText(ctx, scoreText(game.score()), 8, 18, { size: 16, color: '#ffffff', outline: OUTLINE });
  pixelText(ctx, 'BEST ' + scoreText(Math.max(view.best, game.score())), 8, 38, { color: '#e9ddff', outline: OUTLINE });
  // Coins earned this run
  drawCoin(ctx, 8, 49);
  pixelText(ctx, String(view.runCoins), 21, 50, { color: '#ffd166', outline: OUTLINE });
  // Tony's shield, while it's still ready
  if (game.shield_ready()) drawShield(ctx, 8, 62);

  // Zone and its button, top right
  const zone = ZONES[game.zone()];
  pixelText(ctx, zone.name.toUpperCase(), WIDTH - 8, 7, { align: 'right', color: '#ffffff', outline: OUTLINE });
  const iconLeft = drawButtonIcon(ctx, zone.button, WIDTH - 8, 18, zone.accent);
  pixelText(ctx, zone.action, iconLeft - 4, 22, { align: 'right', color: '#ffffff', outline: OUTLINE });

  // How long until the next zone: a little bar that empties
  const left = game.seconds_to_next_zone() / ZONE_SECONDS;
  box(ctx, WIDTH - 72, 37, 64, 5, { fill: '#2b2440' });
  rect(ctx, WIDTH - 71, 38, Math.round(62 * left), 3, zone.accent);
}

// ---------- The street sign ----------
// 2 seconds before a zone change, a sign drops in from the top: the next
// zone's name, its button, what to do, and a countdown. Right after the
// change (and at the start of a run) it shows the zone's hint, then flies off.

function signY(age, leaving) {
  // Drops in with a little bounce, or swings back up and away
  if (leaving !== null) return Math.round(54 - leaving * leaving * 300);
  if (age < 0.18) return Math.round(-50 + (age / 0.18) * 112); // falls past...
  if (age < 0.3) return Math.round(62 - ((age - 0.18) / 0.12) * 8); // ...and settles back
  return 54;
}

export function drawZoneSign(ctx, game, view) {
  if (game.is_dead()) return;
  const secondsLeft = game.seconds_to_next_zone();
  const inZone = ZONE_SECONDS - secondsLeft;
  let zoneIndex;
  let age;
  let leaving = null;
  let countdown = 0;
  if (secondsLeft <= WARNING_SECONDS && game.next_zone() !== game.zone()) {
    zoneIndex = game.next_zone();
    age = WARNING_SECONDS - secondsLeft;
    countdown = Math.ceil(secondsLeft - 0.001);
  } else if (game.zone_changes() > 0 && inZone < 1.6) {
    zoneIndex = game.zone();
    age = 1; // already hanging there from the warning
    if (inZone > 1.2) leaving = inZone - 1.2;
  } else if (game.zone_changes() === 0 && inZone < 2.2) {
    // The very start of a run: the sign drops in first
    zoneIndex = game.zone();
    age = inZone;
    leaving = inZone > 1.9 ? inZone - 1.9 : null;
  } else {
    return;
  }

  const zone = ZONES[zoneIndex];
  const y = signY(age, leaving);
  if (y < -48) return;
  const w = 210;
  const x = WIDTH / 2 - w / 2;

  // Two chains holding it up
  rect(ctx, x + 24, 0, 2, y, OUTLINE);
  rect(ctx, x + w - 26, 0, 2, y, OUTLINE);
  for (let cy = 2; cy < y; cy += 4) {
    rect(ctx, x + 24, cy, 2, 2, '#8d93a0');
    rect(ctx, x + w - 26, cy, 2, 2, '#8d93a0');
  }

  // The sign board: dark with a border in the zone's colour
  rect(ctx, x, y, w, 44, OUTLINE);
  rect(ctx, x + 1, y + 1, w - 2, 42, zone.accent);
  rect(ctx, x + 3, y + 3, w - 6, 38, '#221d33');
  rect(ctx, x + 3, y + 3, w - 6, 1, '#3a3352');
  for (const [bx, by] of [[x + 5, y + 5], [x + w - 7, y + 5], [x + 5, y + 37], [x + w - 7, y + 37]]) {
    rect(ctx, bx, by, 2, 2, '#8d93a0'); // bolts
  }

  const title = countdown ? 'NEXT: ' + zone.name.toUpperCase() : zone.name.toUpperCase();
  pixelText(ctx, title, x + 12, y + 9, { color: '#ffffff', outline: OUTLINE });
  const keyRight = drawButtonIcon(ctx, zone.button, x + 12 + zone.button.length * 8 + 10, y + 22, zone.accent);
  const hint = zone.hint.replace(/^(TAP|HOLD|MASH) /, '');
  pixelText(ctx, hint, keyRight + zone.button.length * 8 + 15, y + 26, { color: '#ffd166', outline: OUTLINE });

  // Countdown, or GO!
  if (countdown) {
    const pulse = (secondsLeft % 1) > 0.75 ? 1 : 0;
    pixelText(ctx, String(countdown), x + w - 20, y + 11 - pulse, { size: 16, align: 'center', color: zone.accent, outline: OUTLINE });
  } else if (game.zone_changes() > 0 || inZone > 0.4) {
    if (Math.floor(inZone * 8) % 2 === 0) pixelText(ctx, 'GO!', x + w - 12, y + 9, { align: 'right', color: '#7bd389', outline: OUTLINE });
  }
}

// A little green shield (Tony can survive one crash while it shows)
function drawShield(ctx, x, y) {
  rect(ctx, x, y, 9, 1, OUTLINE);
  rect(ctx, x, y, 1, 7, OUTLINE);
  rect(ctx, x + 8, y, 1, 7, OUTLINE);
  rect(ctx, x + 1, y + 7, 1, 1, OUTLINE);
  rect(ctx, x + 7, y + 7, 1, 1, OUTLINE);
  rect(ctx, x + 2, y + 8, 1, 1, OUTLINE);
  rect(ctx, x + 6, y + 8, 1, 1, OUTLINE);
  rect(ctx, x + 3, y + 9, 3, 1, OUTLINE);
  rect(ctx, x + 1, y + 1, 7, 6, '#7bd389');
  rect(ctx, x + 2, y + 7, 5, 1, '#4fa866');
  rect(ctx, x + 3, y + 8, 3, 1, '#4fa866');
  rect(ctx, x + 2, y + 2, 2, 1, '#c8f5d2');
  rect(ctx, x + 2, y + 3, 1, 2, '#c8f5d2');
  pixelText(ctx, 'SHIELD', x + 13, y + 1, { color: '#7bd389', outline: OUTLINE });
}
