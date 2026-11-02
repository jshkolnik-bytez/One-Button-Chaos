//! constants.rs: the numbers that control how the game feels.
//! Tweak these while playtesting! The world is 480 x 270 pixels (the same
//! size as the pixel-art canvas) and speeds are pixels per second.
//! (src/world.js has a copy of the world size for the drawing code.)

pub const TICK: f32 = 1.0 / 60.0; // one update moves time forward 1/60 of a second

// The world
pub const WIDTH: f32 = 480.0;
pub const HEIGHT: f32 = 270.0;
pub const GROUND_Y: f32 = 234.0; // the floor: where the skateboard's wheels touch
pub const CEIL_Y: f32 = 150.0; // Subway: the ceiling he can ride upside down

// Zones and difficulty
pub const ZONE_TICKS: u32 = 720; // each zone lasts 12 seconds
pub const WARNING_TICKS: u32 = 120; // the street sign warns 2 seconds before a change
pub const ZONE_BONUS: u32 = 100; // points for reaching a new zone
pub const SPEED_UP: f32 = 1.05; // +5% speed every zone...
pub const MAX_SPEED: f32 = 2.4; // ...but never more than 2.4x the starting speed
pub const ZONE_ORDER_LENGTH: usize = 1000; // zones planned per run (over 3 hours!)

// Fair zone changes: the first obstacle of a new zone arrives at least this many
// seconds after the change, and old obstacles must arrive this long before it.
pub const NEW_ZONE_GAP: f32 = 1.0;
pub const OLD_ZONE_GAP: f32 = 1.1;

// The boy. His hitbox (18 x 36) is smaller than his 48 x 48 sprite,
// so near-misses feel fair.
pub const PLAYER_X: f32 = 88.0; // left edge of his hitbox
pub const PLAYER_W: f32 = 18.0;
pub const PLAYER_H: f32 = 36.0;
pub const BASE_SPEED: f32 = 140.0; // how fast the city scrolls at the start

// Downtown: tap to ollie (about 52 px high, 0.6 s in the air)
pub const GRAVITY: f32 = 1100.0;
pub const JUMP_SPEED: f32 = 340.0;
pub const COYOTE_TICKS: u32 = 6; // a jump still works just after leaving the ground
pub const BUFFER_TICKS: u32 = 8; // a press just before landing still counts

// Rooftops: hold to jump further. A tap is a little hop; holding makes
// gravity weaker on the way up, for up to half a second.
pub const ROOF_JUMP_SPEED: f32 = 300.0;
pub const ROOF_HOLD_GRAVITY: f32 = 0.42; // x GRAVITY while holding on the way up
pub const ROOF_HOLD_TICKS: u32 = 30;
pub const GAP_EDGE: f32 = 3.0; // he can stand this far over the edge of a gap

// Subway: tap to flip gravity between the floor and the ceiling
pub const FLIP_GRAVITY: f32 = 1400.0;

// Construction: hold to duck. His legs give up after a while, so you can't
// just hold the whole time: let go and press again to duck again.
pub const DUCK_H: f32 = 24.0;
pub const DUCK_MAX_TICKS: u32 = 78; // 1.3 seconds

// Market Street: tap to dash and smash things
pub const DASH_TICKS: u32 = 18; // 0.3 s of smashing...
pub const DASH_COOLDOWN: u32 = 12; // ...then 0.2 s to recover
pub const SMASH_REACH: f32 = 6.0; // a dash smashes things this far in front of him

// Crosswalk: hold to brake, let go to roll again
pub const BRAKE_RATE: f32 = 7.0; // stops in about 1/7 s
pub const ROLL_RATE: f32 = 4.0; // back to full speed in about 1/4 s
pub const CAR_WARN_TICKS: u32 = 30; // the horn honks this long before a car crosses

// Park Hill: mash to stay ahead of the giant runaway donut
pub const DONUT_SIZE: f32 = 52.0;
pub const DONUT_START_GAP: f32 = 110.0; // starts off screen
pub const DONUT_MAX_GAP: f32 = 120.0;
pub const DONUT_PUSH: f32 = 11.0; // each press gains this much
pub const DONUT_APPROACH: f32 = 38.0; // px per second it catches up (more when faster)

/// Things that happened during an update, as bit flags (several can happen
/// in the same tick). JavaScript plays sounds and effects for these.
/// The numbers must match EVENT in src/world.js.
pub mod event {
    pub const JUMP: u32 = 1;
    pub const FLIP: u32 = 2;
    pub const LAND: u32 = 4;
    pub const DUCK: u32 = 8;
    pub const DASH: u32 = 16;
    pub const SMASH: u32 = 32;
    pub const BRAKE: u32 = 64;
    pub const PUSH: u32 = 128;
    pub const CAR: u32 = 256;
    pub const DOUBLE_JUMP: u32 = 512;
    pub const WARNING: u32 = 1024;
    pub const ZONE_CHANGE: u32 = 2048;
    pub const DIED: u32 = 4096;
    pub const SHIELD: u32 = 8192;
}
