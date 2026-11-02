// downtown-obstacles.js: the things to jump over in Downtown, as pixel maps.
// Each letter in a map is one pixel; the legend says which colour it is.
// Every map is exactly the same size as the obstacle in core/src/obstacles.rs.
import { KIND } from '../world.js';
import { P, spriteFromMap } from './palette.js';
import { rect } from './pixel.js';

// Traffic cone, 12 x 16
const CONE = spriteFromMap(
  [
    '.....oo.....',
    '....oHOo....',
    '....oHOo....',
    '...oHOOSo...',
    '...oWWWwo...',
    '...oWWWwo...',
    '..oHOOOOSo..',
    '..oHOOOOSo..',
    '..oWWWWWwo..',
    '.oWWWWWWWwo.',
    '.oHOOOOOOSo.',
    '.oHOOOOOOSo.',
    '.oHOOOOOOSo.',
    'obbbbbbbbbbo',
    'oBBBBBBBBBBo',
    'oooooooooooo',
  ],
  { o: P.outline, O: '#ff8a3d', H: '#ffb27a', S: '#d4612b', W: '#f4eefc', w: '#c9c0db', b: '#625a7c', B: '#3b3550' }
);

// Fire hydrant, 12 x 18
const HYDRANT = spriteFromMap(
  [
    '.....oo.....',
    '....oCco....',
    '...oHRRSo...',
    '..oHRRRRSo..',
    '.oooooooooo.',
    '.oHHRRRRSSo.',
    '..oHRRRRSo..',
    '..oHRRRRSo..',
    'oooHRRRRSooo',
    'oCcHRRRRScCo',
    'oooHRRRRSooo',
    '..oHRRRRSo..',
    '..oHRRRRSo..',
    '..oHRCRRSo..',
    '..oHRRRRSo..',
    '.oooooooooo.',
    '.oHHRRRRSSo.',
    'oooooooooooo',
  ],
  { o: P.outline, R: '#e0474c', H: '#ff8a80', S: '#a3303d', C: '#f2c14e', c: '#b8862e' }
);

// Metal rubbish bin with a lid, 18 x 24
const BIN = spriteFromMap(
  [
    '......oooooo......',
    '......oHHHSo......',
    '..oooooooooooooo..',
    '.oHHHLLLLLLLLLllo.',
    'oHLLLLLLLLLLLLLllo',
    'oooooooooooooooooo',
    '.oHMMMSMMMSMMMSSo.',
    '.oHMMMSMMMSMMMSSo.',
    '.oHDDDDDDDDDDDSSo.',
    '.oHMMMSMMMSMMMSSo.',
    '.oHMMMSMMMSMMMSSo.',
    '.oHMMMSMPPSMMMSSo.',
    '.oHMMMSMPPSMMMSSo.',
    '.oHMMMSMMMSMMMSSo.',
    '.oHDDDDDDDDDDDSSo.',
    '.oHMMMSMMMSMMMSSo.',
    '.oHMMMSMMMSMMMSSo.',
    '.oHMMMSMMMSMMMSSo.',
    '.oHMMMSMMMSMMMSSo.',
    '.oHDDDDDDDDDDDSSo.',
    '.oHMMMSMMMSMMMSSo.',
    '.oHMMMSMMMSMMMSSo.',
    '..oSSSSSSSSSSSSo..',
    '..oooooooooooooo..',
  ],
  { o: P.outline, M: '#8794b5', H: '#b9c4dd', S: '#5f6a8c', D: '#4b5574', L: '#9aa7c6', l: '#6a7698', P: '#ff5fa2' }
);

const SPRITES = { [KIND.CONE]: CONE, [KIND.HYDRANT]: HYDRANT, [KIND.BIN]: BIN };

// A puddle stretches to any width, so it's drawn row by row.
// The sky's colours shimmer in it.
function drawPuddle(ctx, x, y, w, time) {
  const top = y - 1;
  rect(ctx, x + 3, top, w - 6, 1, '#3c5f96');
  rect(ctx, x + 1, top + 1, w - 2, 1, '#5b8fd1');
  rect(ctx, x, top + 2, w, 1, '#5b8fd1');
  rect(ctx, x + 1, top + 3, w - 2, 1, '#4a77b5');
  rect(ctx, x + 3, top + 4, w - 6, 1, '#3c5f96');
  // Reflections drift slowly, like ripples
  const ripple = Math.floor(time * 4) % 3;
  rect(ctx, x + 4 + ripple, top + 1, 4, 1, '#a9d4ff');
  rect(ctx, x + w - 12 - ripple, top + 2, 6, 1, '#c7a6e8');
  rect(ctx, x + Math.floor(w / 2) - 1, top + 3, 3, 1, '#ffb38a');
}

// Draws one obstacle; (x, y, w, h) is its box from the game
export function drawDowntownObstacle(ctx, kind, x, y, w, h, time) {
  x = Math.round(x);
  y = Math.round(y);
  if (kind === KIND.PUDDLE) {
    drawPuddle(ctx, x, y + h - 3, w, time);
    return;
  }
  const sprite = SPRITES[kind];
  if (!sprite) return;
  // A soft shadow on the pavement grounds it
  rect(ctx, x + 1, y + h, w - 2, 1, P.shadow);
  ctx.drawImage(sprite, x, y);
}
