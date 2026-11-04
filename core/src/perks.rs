//! perks.rs: what makes each skater and each skateboard special.
//!
//! The crew and the boards are numbered like CREW and BOARDS in src/crew.js.
//! Every number the abilities change goes through a function here, so the
//! rest of the game just asks "how long is a dash?" and gets the right answer.
#![allow(dead_code)] // some perks (coins) are counted in JavaScript, but listed here so the numbers match

use crate::Game;
use crate::constants::*;
use crate::zones::Zone;

// The crew
pub const JAY: u8 = 0; // Combo King: +150 per zone instead of +100
pub const MAYA: u8 = 1; // Springy: jumps higher
pub const ROSA: u8 = 2; // Magnet: double coins (coins are counted in JavaScript)
pub const KAI: u8 = 3; // Quick: longer dashes, longer ducks, sharper brakes
pub const ZEKE: u8 = 4; // Chill: the city speeds up more slowly
pub const GLORIA: u8 = 5; // Old School: slower donut, more forgiving jump timing
pub const TONY: u8 = 6; // Tough: survives one crash per run
pub const NOVA: u8 = 7; // Double Ollie: jump again in mid-air

// The boards
pub const CLASSIC: u8 = 0; // just a good board
pub const POP: u8 = 1; // ollies a bit higher
pub const CRUISER: u8 = 2; // +25% score
pub const ROCKET: u8 = 3; // longer dashes, stronger pushes
pub const HOVER: u8 = 4; // floats down more slowly
pub const GOLD: u8 = 5; // +50% coins (counted in JavaScript)

pub const SHIELD_TICKS: u32 = 90; // after Tony shrugs off a crash, 1.5 s of safety

impl Game {
    pub(crate) fn zone_bonus(&self) -> u32 {
        if self.character == JAY { 150 } else { ZONE_BONUS }
    }

    pub(crate) fn jump_boost(&self) -> f32 {
        let mut boost = 1.0;
        if self.character == MAYA {
            boost *= 1.06;
        }
        if self.board == POP {
            boost *= 1.04;
        }
        boost
    }

    pub(crate) fn speed_up(&self) -> f32 {
        if self.character == ZEKE { 1.03 } else { SPEED_UP }
    }

    pub(crate) fn dash_ticks(&self) -> u32 {
        DASH_TICKS + if self.character == KAI { 8 } else { 0 } + if self.board == ROCKET { 6 } else { 0 }
    }

    pub(crate) fn dash_cooldown(&self) -> u32 {
        if self.character == KAI { 8 } else { DASH_COOLDOWN }
    }

    pub(crate) fn duck_max_ticks(&self) -> u32 {
        if self.character == KAI { 120 } else { DUCK_MAX_TICKS }
    }

    pub(crate) fn brake_rate(&self) -> f32 {
        if self.character == KAI { BRAKE_RATE * 1.5 } else { BRAKE_RATE }
    }

    pub(crate) fn donut_catch_up(&self) -> f32 {
        let slower = if self.character == GLORIA { 0.7 } else { 1.0 };
        DONUT_APPROACH * self.speed_mult.powf(0.35) * slower
    }

    pub(crate) fn donut_push(&self) -> f32 {
        if self.board == ROCKET { DONUT_PUSH * 1.4 } else { DONUT_PUSH }
    }

    pub(crate) fn coyote_ticks(&self) -> u32 {
        if self.character == GLORIA { 10 } else { COYOTE_TICKS }
    }

    pub(crate) fn buffer_ticks(&self) -> u32 {
        if self.character == GLORIA { 12 } else { BUFFER_TICKS }
    }

    /// Gravity is a bit weaker on the way down with the hoverboard
    /// (not in the Subway, where flipping should stay snappy)
    pub(crate) fn fall_gravity(&self, gravity: f32) -> f32 {
        let falling = self.player.vy * self.player.gdir > 0.0;
        if self.board == HOVER && falling && self.zone != Zone::Subway { gravity * 0.8 } else { gravity }
    }

    /// Nova: how many extra jumps she gets in the air
    pub(crate) fn air_jumps(&self) -> u32 {
        if self.character == NOVA { 1 } else { 0 }
    }

    /// Cruiser: every 4th point is doubled (+25%)
    pub(crate) fn bonus_point(&self) -> bool {
        self.board == CRUISER && (self.point_ticks / 6) % 4 == 0
    }
}
