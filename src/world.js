// world.js: numbers and names that BOTH the Rust game brain and the drawing
// code use. The game world is 480 x 270 pixels: the same size as the
// pixel-art canvas, which is then scaled up by a whole number to fit the screen.
// (core/src/constants.rs uses the same numbers. Keep them in sync!)

export const WIDTH = 480;
export const HEIGHT = 270;
export const GROUND_Y = 234; // the floor: where the skateboard's wheels touch
export const CEIL_Y = 150; // Subway only: the ceiling he rides on upside down
export const PLAYER_X = 88; // left edge of the boy's hitbox
export const BASE_SPEED = 140; // how fast the city scrolls at the start (pixels per second)
export const ZONE_SECONDS = 12;
export const DONUT_SIZE = 52; // Park Hill: the giant runaway donut (its box is 52 x 52, bottom on GROUND_Y)
export const WARNING_SECONDS = 2;

// The city zones, numbered like Zone in core/src/zones.rs.
// button = what the sign shows, action = what the button does there.
export const ZONES = [
  { name: 'Downtown', button: 'TAP', action: 'OLLIE', accent: '#ff5fa2', hint: 'TAP TO OLLIE' },
  { name: 'Rooftops', button: 'HOLD', action: 'BIG JUMP', accent: '#ffb347', hint: 'HOLD TO JUMP FURTHER' },
  { name: 'Subway', button: 'TAP', action: 'FLIP', accent: '#3fd6c8', hint: 'TAP TO FLIP GRAVITY' },
  { name: 'Construction', button: 'HOLD', action: 'DUCK', accent: '#ffcc00', hint: 'HOLD TO DUCK' },
  { name: 'Market Street', button: 'TAP', action: 'DASH', accent: '#7bd389', hint: 'TAP TO SMASH THROUGH' },
  { name: 'Crosswalk', button: 'HOLD', action: 'BRAKE', accent: '#ff6b6b', hint: 'HOLD TO STOP FOR CARS' },
  { name: 'Park Hill', button: 'MASH', action: 'PUSH', accent: '#c38bff', hint: 'MASH TO OUTRUN THE DONUT' },
];

export const ZONE = {
  DOWNTOWN: 0,
  ROOFTOPS: 1,
  SUBWAY: 2,
  CONSTRUCTION: 3,
  MARKET: 4,
  CROSSWALK: 5,
  PARK_HILL: 6,
};

// Obstacle kinds, numbered like Kind in core/src/obstacles.rs.
// Sizes (w x h) are the hitbox AND the picture size, unless noted.
export const KIND = {
  // Downtown (stand on the floor)
  CONE: 0, // 12 x 16
  HYDRANT: 1, // 12 x 18
  BIN: 2, // 18 x 24
  PUDDLE: 3, // any width x 3
  // Rooftops
  GAP: 4, // a hole between buildings: y = GROUND_Y, any width, h = 36 (down to the bottom of the screen)
  AC_UNIT: 5, // 22 x 16, on the roof
  VENT: 6, // 12 x 24, a chimney / vent pipe on the roof
  // Subway
  BARRIER: 7, // 22 x 18, on the floor
  FLOOR_SPIKES: 8, // 24 x 8, on the floor
  CEIL_PIPE: 9, // 16 x 22, hanging from the ceiling (y = CEIL_Y)
  CEIL_SPIKES: 10, // 24 x 8, on the ceiling, pointing down (y = CEIL_Y)
  // Construction (hang in the air: bottom edge at GROUND_Y - 28 = 206)
  BEAM: 11, // steel girder on cables, any width x 8 (y = 198)
  BUCKET: 12, // concrete bucket on a rope, 16 x 18 (y = 188)
  // Market Street (on the floor; smash them with a dash)
  CRATES: 13, // 16 x 22
  CART: 14, // 32 x 24
  BIKE: 15, // 28 x 18
  PIGEONS: 16, // 24 x 12
  // Crosswalk
  JUNCTION: 17, // a side street crossing the pavement: w = 56, y = GROUND_Y - 4, h = 4.
  //               a = car progress (see core/src/obstacles.rs), b = car paint (0-3)
};

// Which picture of the boy to show, numbered like Pose in core/src/lib.rs
export const POSE = {
  RIDE: 0,
  IDLE: 1,
  JUMP: 2,
  FALL: 3,
  DUCK: 4,
  DASH: 5,
  HURT: 6,
  BRAKE: 7,
  PUSH: 8,
  GRAB: 9,
};

// Things that happened during an update, as bit flags (several can happen
// in the same tick). Sounds and effects listen for these.
export const EVENT = {
  JUMP: 1,
  FLIP: 2,
  LAND: 4,
  DUCK: 8,
  DASH: 16,
  SMASH: 32,
  BRAKE: 64,
  PUSH: 128,
  CAR: 256, // a car started crossing a junction near the boy (horn!)
  DOUBLE_JUMP: 512, // Nova's second ollie in the air
  WARNING: 1024,
  ZONE_CHANGE: 2048,
  DIED: 4096,
  SHIELD: 8192, // Tony shrugged off a crash
};

// Numbers per obstacle in game.obstacles(): x, y, w, h, kind, a, b
export const OBSTACLE_STRIDE = 7;
