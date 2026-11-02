//! zones.rs: the city zones. Each zone is one variant of the Zone enum, with
//! its own code for press (button down), release (button up) and every tick.

use crate::Game;
use crate::constants::*;
use crate::obstacles::{DONUT_KIND, Kind, NO_CAR};
use crate::physics::{die, move_vertical, smash_things};
use crate::rng::Rng;

/// The zones. The numbers must match ZONES in src/world.js.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum Zone {
    Downtown = 0,     // TAP = ollie
    Rooftops = 1,     // HOLD = big jump
    Subway = 2,       // TAP = flip gravity
    Construction = 3, // HOLD = duck
    Market = 4,       // TAP = dash
    Crosswalk = 5,    // HOLD = brake
    ParkHill = 6,     // MASH = push
}

impl Zone {
    /// The zones a run can visit
    pub const ALL: [Zone; 7] = [
        Zone::Downtown,
        Zone::Rooftops,
        Zone::Subway,
        Zone::Construction,
        Zone::Market,
        Zone::Crosswalk,
        Zone::ParkHill,
    ];

    /// Button down
    pub fn press(self, g: &mut Game) {
        match self {
            Zone::Downtown => try_jump(g, JUMP_SPEED * g.jump_boost()),
            Zone::Rooftops => try_jump(g, ROOF_JUMP_SPEED * g.jump_boost()),
            Zone::Subway => try_flip(g),
            Zone::Construction => {
                if !g.player.ducking {
                    g.player.ducking = true;
                    g.player.duck_ticks = 0;
                    g.player.set_height(DUCK_H);
                    g.events |= event::DUCK;
                }
            }
            Zone::Market => try_dash(g),
            Zone::Crosswalk => g.events |= event::BRAKE,
            Zone::ParkHill => {
                g.donut_gap = (g.donut_gap + g.donut_push()).min(DONUT_MAX_GAP);
                g.events |= event::PUSH;
            }
        }
    }

    /// Button up
    pub fn release(self, g: &mut Game) {
        match self {
            Zone::Rooftops => g.player.hold_ticks = 0, // letting go ends the big jump early
            Zone::Construction => stand_up(g),
            _ => {}
        }
    }

    /// One tick of this zone
    pub fn tick(self, g: &mut Game) {
        match self {
            Zone::Downtown | Zone::Market | Zone::Crosswalk | Zone::ParkHill | Zone::Construction => {
                let landed = move_vertical(g, GRAVITY);
                if landed && g.player.buffer > 0 && self == Zone::Downtown {
                    try_jump(g, JUMP_SPEED * g.jump_boost());
                }
            }
            Zone::Rooftops => {
                let p = &mut g.player;
                let lifting = g.held && p.hold_ticks > 0 && p.vy < 0.0;
                if p.hold_ticks > 0 && !p.grounded {
                    p.hold_ticks -= 1;
                }
                let gravity = if lifting { GRAVITY * ROOF_HOLD_GRAVITY } else { GRAVITY };
                let landed = move_vertical(g, gravity);
                if landed && g.player.buffer > 0 {
                    try_jump(g, ROOF_JUMP_SPEED * g.jump_boost());
                }
            }
            Zone::Subway => {
                let landed = move_vertical(g, FLIP_GRAVITY);
                if landed && g.player.buffer > 0 {
                    try_flip(g);
                }
            }
        }

        match self {
            Zone::Construction => {
                let duck_max = g.duck_max_ticks();
                let p = &mut g.player;
                if p.ducking {
                    p.duck_ticks += 1;
                    if p.duck_ticks >= duck_max {
                        stand_up(g); // legs give up: let go and press again
                    }
                }
            }
            Zone::Market => {
                let cooldown = g.dash_cooldown();
                let p = &mut g.player;
                if p.dash_ticks > 0 {
                    p.dash_ticks -= 1;
                    if p.dash_ticks == 0 {
                        p.dash_cooldown = cooldown;
                    }
                } else if p.dash_cooldown > 0 {
                    p.dash_cooldown -= 1;
                    if p.dash_cooldown == 0 && p.buffer > 0 {
                        try_dash(g);
                    }
                }
                if g.player.dash_ticks > 0 {
                    smash_things(g);
                }
            }
            Zone::Crosswalk => crosswalk_tick(g),
            Zone::ParkHill => {
                let catch_up = g.donut_catch_up();
                g.donut_gap -= catch_up * TICK;
                if g.donut_gap <= 0.0 {
                    die(g, DONUT_KIND);
                }
            }
            _ => {}
        }

        if g.player.buffer > 0 {
            g.player.buffer -= 1;
        }
    }
}

/// Ollie (or remember the press for a moment if he's still in the air).
fn try_jump(g: &mut Game, speed: f32) {
    let buffer = g.buffer_ticks();
    let p = &mut g.player;
    if p.gdir > 0.0 && !p.in_gap && (p.grounded || p.coyote > 0) {
        p.vy = -speed;
        p.grounded = false;
        p.coyote = 0;
        p.buffer = 0;
        p.hold_ticks = ROOF_HOLD_TICKS;
        g.events |= event::JUMP;
    } else if p.gdir > 0.0 && !p.grounded && p.air_jumps > 0 && p.y + p.h < GROUND_Y - 4.0 {
        // Nova's double ollie (only once she's properly off the ground)
        p.air_jumps -= 1;
        p.vy = -speed * 0.9;
        p.buffer = 0;
        p.hold_ticks = ROOF_HOLD_TICKS / 2;
        g.events |= event::JUMP | event::DOUBLE_JUMP;
    } else {
        p.buffer = buffer;
    }
}

/// Subway: gravity swaps between floor and ceiling.
fn try_flip(g: &mut Game) {
    let buffer = g.buffer_ticks();
    let p = &mut g.player;
    if p.grounded || p.coyote > 0 {
        p.gdir = -p.gdir;
        p.vy = 60.0 * p.gdir; // a little kick toward the new side
        p.grounded = false;
        p.coyote = 0;
        p.buffer = 0;
        g.events |= event::FLIP;
    } else {
        p.buffer = buffer;
    }
}

/// Market: a burst of speed that smashes things.
fn try_dash(g: &mut Game) {
    let (ticks, buffer) = (g.dash_ticks(), g.buffer_ticks());
    let p = &mut g.player;
    if p.dash_ticks == 0 && p.dash_cooldown == 0 {
        p.dash_ticks = ticks;
        p.buffer = 0;
        g.events |= event::DASH;
    } else {
        p.buffer = buffer;
    }
}

fn stand_up(g: &mut Game) {
    let p = &mut g.player;
    if p.ducking {
        p.ducking = false;
        p.set_height(PLAYER_H);
    }
}

/// Crosswalk: brake while held, roll again on release. Cars crossing a junction
/// are deadly while they're in the boy's lane.
fn crosswalk_tick(g: &mut Game) {
    let tick = g.tick;
    let (left, right) = (g.player.x, g.player.x + g.player.w);
    let mut hit = false;
    let mut honk = false;
    for o in &g.obstacles {
        if o.kind != Kind::Junction || o.zone != Zone::Crosswalk || o.t0 == NO_CAR {
            continue;
        }
        if tick >= o.t0 && tick <= o.t1 && left < o.x + o.w - 2.0 && right > o.x + 2.0 {
            hit = true;
        }
        if tick + CAR_WARN_TICKS == o.t0 && o.x < WIDTH {
            honk = true;
        }
    }
    if honk {
        g.events |= event::CAR;
    }
    if hit {
        die(g, Kind::Junction as u8);
    }
}

/// How fast the city scrolls this tick. Only the Crosswalk lets you stop.
pub fn target_speed(g: &Game) -> f32 {
    if g.zone == Zone::Crosswalk && g.held { 0.0 } else { g.speed }
}

// ---------- The zone order for a whole run ----------

fn shuffle(rng: &mut Rng, list: &mut [Zone]) {
    for i in (1..list.len()).rev() {
        let j = rng.int(i as u32 + 1) as usize;
        list.swap(i, j);
    }
}

/// Downtown first (so new players learn on the ollie), then shuffled "bags" of
/// every zone, so you see them all before any repeats. The same zone never
/// comes twice in a row.
pub fn make_zone_order(rng: &mut Rng) -> Vec<Zone> {
    let mut order = vec![Zone::Downtown];
    while order.len() < ZONE_ORDER_LENGTH {
        let mut bag = Zone::ALL.to_vec();
        shuffle(rng, &mut bag);
        if bag.len() > 1 && bag[0] == order[order.len() - 1] {
            let j = 1 + rng.int(bag.len() as u32 - 1) as usize;
            bag.swap(0, j);
        }
        order.extend(bag);
    }
    order.truncate(ZONE_ORDER_LENGTH);

    // The list loops back to the start at the very end, so the last zone must differ from the first
    let last = order.len() - 1;
    if Zone::ALL.len() > 1 && order[last] == order[0] {
        order.swap(last, last - 1);
    }
    order
}

/// Called when a new zone starts: undo the old zone's special moves.
pub fn enter_zone(g: &mut Game) {
    let p = &mut g.player;
    p.buffer = 0;
    p.hold_ticks = 0;
    p.dash_ticks = 0;
    p.dash_cooldown = 0;
    if p.ducking {
        p.ducking = false;
        p.set_height(PLAYER_H);
    }
    // Leaving the Subway upside down: gravity pulls him back to the floor
    if p.gdir < 0.0 && g.zone != Zone::Subway {
        p.gdir = 1.0;
        p.grounded = false;
        p.ceiling_fall = true;
    }
    if g.zone == Zone::ParkHill {
        g.donut_gap = DONUT_START_GAP;
    }
    // Holding the button into Construction counts as ducking straight away
    if g.held && g.zone == Zone::Construction {
        Zone::Construction.press(g);
    }
}
