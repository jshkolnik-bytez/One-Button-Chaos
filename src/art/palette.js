// palette.js: the colours of the sunset city, shared by all the art.

export const P = {
  outline: '#1a1626',
  skyTop: '#6a5acd', // purple...
  skyBottom: '#ffb38a', // ...fading to peach
  sun: '#ffe39a',
  sunEdge: '#ffc77a',
  far: '#7458a8', // hazy far-away skyline
  farLight: '#8a6ab8',
  farWindow: '#b791d6',
  building: '#3d3557', // dark buildings...
  buildingLight: '#4d4369',
  buildingShade: '#2f2945',
  window: '#ffd166', // ...with warm yellow windows
  windowLight: '#fff0b5',
  windowOff: '#29233c',
  road: '#4a4458',
  roadSpeck: '#423c50',
  roadLine: '#efe3cc',
  sidewalk: '#8b80a8',
  sidewalkLight: '#a89ec4',
  sidewalkSeam: '#72688f',
  curb: '#a39ac0',
  curbLight: '#c4bbda',
  curbShade: '#6b6188',
  shadow: '#6a6088', // shadows on the pavement
};

// Blends two '#rrggbb' colours: amount 0 = all a, 1 = all b
export function mixHex(a, b, amount) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const channel = (shift) => {
    const ca = (pa >> shift) & 255;
    const cb = (pb >> shift) & 255;
    return Math.round(ca + (cb - ca) * amount);
  };
  const n = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return '#' + n.toString(16).padStart(6, '0');
}

// Turns a little text "pixel map" into a picture. Each letter is one pixel,
// coloured by `legend`; '.' is see-through.
export function spriteFromMap(rows, legend) {
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length;
  canvas.height = rows.length;
  const ctx = canvas.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (!legend[ch]) return;
      ctx.fillStyle = legend[ch];
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return canvas;
}
