//! physics.rs: gravity, landing (on the floor, or the ceiling in the Subway),
//! falling into gaps, and checking for crashes.

use crate::Game;
use crate::constants::*;
use crate::obstacles::{DONUT_KIND, Kind, Obstacle};
use crate::perks::SHIELD_TICKS;

#[derive(Clone)]
pub struct Player {
    pub x: f32, // the hitbox: left edge...
    pub y: f32, // ...top edge...
    pub w: f32, // ...and size
    pub h: f32,
    pub vy: f32,        // up/down speed (positive = moving down the screen)
    pub gdir: f32,      // which way gravity pulls: 1 = down to the floor, -1 = up to the ceiling
    pub grounded: bool, // wheels on a surface (floor, or ceiling when upside down)?
    pub coyote: u32,    // ticks left where a jump still works after leaving the ground
    pub buffer: u32,    // ticks left where an early press is remembered
    pub in_gap: bool,   // fell below the roofs: no way back up
    pub ceiling_fall: bool, // dropping off the Subway ceiling after the zone ended
    // Zone moves
    pub hold_ticks: u32,    // Rooftops: how much longer holding still lifts the jump
    pub ducking: bool,      // Construction
    pub duck_ticks: u32,    // ...and for how long
    pub dash_ticks: u32,    // Market: ticks of dash left
    pub dash_cooldown: u32, // ...and of recovering after it
    pub air_jumps: u32,     // Nova: extra jumps left before landing
}

impl Player {
    pub fn new() -> Player {
        Player {
            x: PLAYER_X,
            y: GROUND_Y - PLAYER_H,
            w: PLAYER_W,
            h: PLAYER_H,
            vy: 0.0,
            gdir: 1.0,
            grounded: true,
            coyote: 0,
            buffer: 0,
            in_gap: false,
            ceiling_fall: false,
            hold_ticks: 0,
            ducking: false,
            duck_ticks: 0,
            dash_ticks: 0,
            dash_cooldown: 0,
            air_jumps: 0,
        }
    }

    /// Ducking makes him shorter. His wheels stay where they are.
    pub fn set_height(&mut self, h: f32) {
        if self.gdir > 0.0 {
            let bottom = self.y + self.h;
            self.y = bottom - h;
        }
        self.h = h;
    }
}

/// Ends the run and remembers which zone you crashed in.
pub fn die(g: &mut Game, kind: u8) {
    if g.dead || g.invincible || g.safe_ticks > 0 {
        return;
    }
    // Tony shrugs off his first crash
    if g.shield {
        g.shield = false;
        g.safe_ticks = SHIELD_TICKS;
        g.events |= event::SHIELD;
        if kind == DONUT_KIND {
            g.donut_gap = 70.0; // knocks the donut back
        }
        return;
    }
    g.dead = true;
    g.death_zone = g.zone;
    g.death_kind = kind;
    g.events |= event::DIED;
}

/// Is there a hole in the roof right under the middle of the boy?
fn over_gap(g: &Game) -> bool {
    let cx = g.player.x + g.player.w / 2.0;
    g.obstacles
        .iter()
        .any(|o| o.kind == Kind::Gap && cx > o.x + GAP_EDGE && cx < o.x + o.w - GAP_EDGE)
}

/// Moves the boy with gravity and lands him on the floor (or the ceiling).
/// Returns true on the tick he lands.
pub fn move_vertical(g: &mut Game, gravity: f32) -> bool {
    let gap = over_gap(g);
    let gravity = g.fall_gravity(gravity);
    let coyote = g.coyote_ticks();
    let air_jumps = g.air_jumps();
    let p = &mut g.player;
    let was_grounded = p.grounded;
    let old_bottom = p.y + p.h;
    p.vy += gravity * p.gdir * TICK;
    p.y += p.vy * TICK;

    let mut landed = false;
    if p.gdir > 0.0 {
        // The floor is solid unless there's a gap under him (or he already fell in one)
        let solid = !gap && !p.in_gap && old_bottom <= GROUND_Y + 0.5;
        if p.y + p.h >= GROUND_Y && solid {
            p.y = GROUND_Y - p.h;
            p.vy = 0.0;
            p.grounded = true;
            p.ceiling_fall = false;
            p.air_jumps = air_jumps;
            landed = !was_grounded;
        } else {
            p.grounded = false;
            if p.y + p.h > GROUND_Y + 2.0 {
                p.in_gap = true;
            }
        }
    } else if p.y <= CEIL_Y {
        p.y = CEIL_Y;
        p.vy = 0.0;
        p.grounded = true;
        p.air_jumps = air_jumps;
        landed = !was_grounded;
    } else {
        p.grounded = false;
    }

    // Coyote time: if you just left the ground without jumping, a jump still works for a moment
    if was_grounded && !p.grounded {
        p.coyote = coyote;
    } else if p.coyote > 0 {
        p.coyote -= 1;
    }
    if p.in_gap {
        p.coyote = 0;
    }

    if landed {
        g.events |= event::LAND;
    }
    // Fell all the way down between the buildings
    if g.player.y > HEIGHT + 10.0 {
        die(g, Kind::Gap as u8);
        if !g.dead {
            // Saved (Tony's shield, or testing): he bounces back up out of the gap
            let p = &mut g.player;
            p.in_gap = false;
            p.y = GROUND_Y - p.h;
            p.vy = -ROOF_JUMP_SPEED;
            p.grounded = false;
        }
    }
    landed
}

/// The part of an obstacle that actually hurts: (left, right, top, bottom).
/// A pixel or two smaller than the picture, so brushing an outline is fine.
fn hitbox(o: &Obstacle) -> (f32, f32, f32, f32) {
    let (l, r, t, b) = (o.x, o.x + o.w, o.y, o.y + o.h);
    match o.kind {
        // A cone is thin at the top, so its top corners don't count
        Kind::Cone => (l + 2.0, r - 2.0, t + 3.0, b),
        // A puddle is flat: only rolling through it counts
        Kind::Puddle => (l + 2.0, r - 2.0, t, b),
        Kind::FloorSpikes => (l + 2.0, r - 2.0, t + 3.0, b),
        Kind::CeilSpikes => (l + 2.0, r - 2.0, t, b - 3.0),
        Kind::CeilPipe => (l + 1.0, r - 1.0, t, b - 1.0),
        Kind::Beam | Kind::Bucket => (l + 2.0, r - 2.0, t, b),
        Kind::Pigeons => (l + 2.0, r - 2.0, t + 3.0, b),
        _ => (l + 1.0, r - 1.0, t + 1.0, b),
    }
}

/// Returns the index of an obstacle of the current zone that the boy is touching.
/// (Gaps and junctions work differently: see move_vertical and zones.rs.)
pub fn find_crash(g: &Game) -> Option<usize> {
    let p = &g.player;
    g.obstacles.iter().position(|o| {
        if o.zone != g.zone || matches!(o.kind, Kind::Gap | Kind::Junction) {
            return false;
        }
        let (l, r, t, b) = hitbox(o);
        p.x < r && p.x + p.w > l && p.y < b && p.y + p.h > t
    })
}

/// Market Street: a dash smashes everything it touches. Returns how many.
pub fn smash_things(g: &mut Game) -> usize {
    let p = &g.player;
    let (pl, pr, pt, pb) = (p.x, p.x + p.w + SMASH_REACH, p.y, p.y + p.h);
    let zone = g.zone;
    let mut smashed = Vec::new();
    g.obstacles.retain(|o| {
        let hit = o.zone == zone && o.kind.breakable() && {
            let (l, r, t, b) = hitbox(o);
            pl < r && pr > l && pt < b && pb > t
        };
        if hit {
            smashed.push((o.x + o.w / 2.0, o.y + o.h / 2.0, o.kind as u8));
        }
        !hit
    });
    if let Some(&last) = smashed.last() {
        g.last_smash = last;
        g.events |= event::SMASH;
    }
    smashed.len()
}
