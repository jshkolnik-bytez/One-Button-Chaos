//! lib.rs: the Game object, and every function JavaScript can call.
//!
//! Rust owns everything that decides how a run goes. JavaScript only reads
//! the button, draws the screen and plays sounds. Each tick, main.js passes
//! the button to Game and calls update(); render.js then reads the new state
//! back through the getters at the bottom of this file.

use wasm_bindgen::prelude::*;

mod constants;
mod obstacles;
mod perks;
mod physics;
mod rng;
#[cfg(test)]
mod tests;
mod zones;

use constants::*;
use obstacles::{NO_CAR, Obstacle, clear_for_new_zone, move_obstacles, spawn_obstacles};
use physics::{Player, die, find_crash};
use rng::Rng;
use zones::{Zone, enter_zone, make_zone_order, target_speed};

/// Which picture of the boy to show. The numbers must match POSE in src/world.js.
#[derive(Clone, Copy)]
#[repr(u8)]
pub enum Pose {
    Ride = 0,
    Idle = 1,
    Jump = 2,
    Fall = 3,
    Duck = 4,
    Dash = 5,
    Hurt = 6,
    Brake = 7,
    Push = 8,
    Grab = 9,
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct Game {
    pub(crate) tick: u32,         // updates since the run started
    pub(crate) zone_tick: u32,    // updates since the current zone started
    pub(crate) zone_index: usize, // where we are in `order`
    pub(crate) order: Vec<Zone>,  // the whole run's zone order, made from the seed
    pub(crate) zone: Zone,
    pub(crate) speed_mult: f32,
    pub(crate) speed: f32,     // how fast this zone scrolls...
    pub(crate) cur_speed: f32, // ...and how fast it's scrolling right now (braking at the Crosswalk)
    pub(crate) scroll: f64, // total distance travelled (the background uses it)
    pub(crate) points: u32,
    pub(crate) point_ticks: u32, // ticks spent rolling (10 points per second of them)
    pub(crate) zone_changes: u32,
    pub(crate) dead: bool,
    pub(crate) death_zone: Zone,
    pub(crate) death_kind: u8, // which kind of obstacle got him (255 = none)
    pub(crate) events: u32,
    pub(crate) held: bool, // is the button down right now?
    pub(crate) player: Player,
    pub(crate) obstacles: Vec<Obstacle>,
    pub(crate) rng: Rng, // obstacles get their own stream of random numbers
    pub(crate) spawn_cursor: f32,
    pub(crate) donut_gap: f32,              // Park Hill: pixels between the donut and the boy
    pub(crate) last_smash: (f32, f32, u8), // Market: where the last smash happened, and what broke
    pub(crate) invincible: bool,            // testing only: nothing can hurt him
    pub(crate) character: u8,               // who's skating (see perks.rs)
    pub(crate) board: u8,                   // ...and on which board
    pub(crate) shield: bool,                // Tony: can still shrug off one crash
    pub(crate) safe_ticks: u32,             // ...and is safe for this many more ticks after using it
}

#[wasm_bindgen]
impl Game {
    /// Same seed = same run
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32) -> Game {
        Game {
            tick: 0,
            zone_tick: 0,
            zone_index: 0,
            order: make_zone_order(&mut Rng::new(seed)),
            zone: Zone::Downtown,
            speed_mult: 1.0,
            speed: BASE_SPEED,
            cur_speed: BASE_SPEED,
            scroll: 0.0,
            points: 0,
            point_ticks: 0,
            zone_changes: 0,
            dead: false,
            death_zone: Zone::Downtown,
            death_kind: 255,
            events: 0,
            held: false,
            player: Player::new(),
            obstacles: Vec::new(),
            rng: Rng::new(seed ^ 0x5bd1e995),
            spawn_cursor: BASE_SPEED * 1.0, // first obstacle shows up after a short run-up
            donut_gap: DONUT_START_GAP,
            last_smash: (0.0, 0.0, 0),
            invincible: false,
            character: 0,
            board: 0,
            shield: false,
            safe_ticks: 0,
        }
    }

    /// Button down
    pub fn press(&mut self) {
        if self.dead || self.held {
            return;
        }
        self.held = true;
        self.zone.press(self);
    }

    /// Button up
    pub fn release(&mut self) {
        if self.dead || !self.held {
            return;
        }
        self.held = false;
        self.zone.release(self);
    }

    /// One fixed tick: moves time forward exactly 1/60 of a second
    pub fn update(&mut self) {
        if self.dead {
            return;
        }
        self.tick += 1;
        if self.safe_ticks > 0 {
            self.safe_ticks -= 1;
        }

        // Braking (Crosswalk) or rolling back up to speed
        let target = target_speed(self);
        if self.cur_speed < target {
            self.cur_speed = (self.cur_speed + self.speed * ROLL_RATE * TICK).min(target);
        } else {
            self.cur_speed = (self.cur_speed - self.speed * self.brake_rate() * TICK).max(target);
        }
        let rolling = self.cur_speed > self.speed * 0.5;

        // The zone clock. At the Crosswalk it only runs while you roll, so
        // waiting forever doesn't skip the zone.
        if self.zone != Zone::Crosswalk || rolling {
            self.zone_tick += 1;
            if self.zone_tick == ZONE_TICKS {
                self.next_zone_starts();
            } else if self.zone_tick == ZONE_TICKS - WARNING_TICKS {
                self.events |= event::WARNING;
            }
        }

        let dx = self.cur_speed * TICK;
        self.scroll += dx as f64;
        move_obstacles(self, dx);
        spawn_obstacles(self, dx);

        self.zone.tick(self);
        if self.dead {
            return;
        }
        if let Some(i) = find_crash(self) {
            let kind = self.obstacles[i].kind as u8;
            die(self, kind);
            return;
        }

        // 10 points per second of rolling = 1 point every 6 ticks
        if rolling {
            self.point_ticks += 1;
            if self.point_ticks % 6 == 0 {
                self.points += if self.bonus_point() { 2 } else { 1 };
            }
        }
    }

    /// Picks the skater and the board (call it right after `new`, before the run starts)
    pub fn set_loadout(&mut self, character: u8, board: u8) {
        self.character = character;
        self.board = board;
        self.shield = character == perks::TONY;
        self.player.air_jumps = self.air_jumps();
    }

    /// Tony: is his one-time shield still ready?
    pub fn shield_ready(&self) -> bool {
        self.shield
    }

    /// Tony just used his shield: he blinks while he's safe
    pub fn is_safe(&self) -> bool {
        self.safe_ticks > 0
    }

    /// Practice: jump straight to a zone (0-6), keeping the run going from there
    pub fn practice(&mut self, zone: u8) {
        if let Some(&z) = Zone::ALL.get(zone as usize) {
            if z == self.zone {
                return;
            }
            let next = (self.zone_index + 1) % self.order.len();
            self.order[next] = z;
            self.zone_tick = ZONE_TICKS - 1;
        }
    }

    /// Testing only: nothing can hurt him (used for screenshots)
    pub fn set_invincible(&mut self, on: bool) {
        self.invincible = on;
    }

    // ---------- Getters: render.js and ui.js read the game through these ----------

    pub fn is_dead(&self) -> bool {
        self.dead
    }

    pub fn score(&self) -> u32 {
        self.points
    }

    /// The current zone (0 = Downtown)
    pub fn zone(&self) -> u8 {
        self.zone as u8
    }

    pub fn next_zone(&self) -> u8 {
        self.order[(self.zone_index + 1) % self.order.len()] as u8
    }

    pub fn seconds_to_next_zone(&self) -> f32 {
        (ZONE_TICKS - self.zone_tick) as f32 * TICK
    }

    /// The boy's hitbox: [x, y, width, height]
    pub fn player(&self) -> Vec<f32> {
        let p = &self.player;
        vec![p.x, p.y, p.w, p.h]
    }

    /// Which picture of the boy to show (see Pose)
    pub fn pose(&self) -> u8 {
        let p = &self.player;
        let pose = if self.dead {
            Pose::Hurt
        } else if self.zone == Zone::Construction && p.ducking {
            Pose::Duck
        } else if self.zone == Zone::Market && p.dash_ticks > 0 {
            Pose::Dash
        } else if self.zone == Zone::Crosswalk && self.held && p.grounded {
            if self.cur_speed < 1.0 { Pose::Idle } else { Pose::Brake }
        } else if p.grounded {
            if self.zone == Zone::ParkHill { Pose::Push } else { Pose::Ride }
        } else if self.zone == Zone::Rooftops && self.held && p.hold_ticks > 0 {
            Pose::Grab
        } else if p.vy * p.gdir < 0.0 {
            Pose::Jump
        } else {
            Pose::Fall
        };
        pose as u8
    }

    /// How fast he's moving away from the surface he stands on (+ = going up, for the pictures)
    pub fn vy_up(&self) -> f32 {
        -self.player.vy * self.player.gdir
    }

    /// Subway: is he upside down? (Riding the ceiling, or past halfway on his way there)
    pub fn upside_down(&self) -> bool {
        let p = &self.player;
        if p.grounded {
            return p.gdir < 0.0;
        }
        let flipping = self.zone == Zone::Subway || p.ceiling_fall;
        flipping && p.y + p.h / 2.0 < (CEIL_Y + GROUND_Y) / 2.0
    }

    /// Market: is he dashing right now?
    pub fn dashing(&self) -> bool {
        self.player.dash_ticks > 0
    }

    /// Park Hill: the donut's left edge on screen (far off screen in other zones)
    pub fn donut_x(&self) -> f32 {
        if self.zone == Zone::ParkHill { PLAYER_X - self.donut_gap - DONUT_SIZE } else { -9999.0 }
    }

    /// Market: [x, y, kind] of the last thing smashed
    pub fn smash(&self) -> Vec<f32> {
        let (x, y, k) = self.last_smash;
        vec![x, y, k as f32]
    }

    /// [x, y, w, h, kind, a, b,  x, y, w, h, kind, a, b, ...]
    /// a = Crosswalk car progress: 0..1 while the car blocks the junction
    ///     (it shows up at -0.8 and has driven off by 1.8), or -999 = no car.
    /// b = which picture (car paint, beam style...)
    pub fn obstacles(&self) -> Vec<f32> {
        let mut out = Vec::with_capacity(self.obstacles.len() * 7);
        for o in &self.obstacles {
            let a = if o.t0 == NO_CAR {
                -999.0
            } else {
                (self.tick as f32 - o.t0 as f32) / (o.t1 - o.t0) as f32
            };
            out.extend_from_slice(&[o.x, o.y, o.w, o.h, o.kind as u8 as f32, a, o.paint as f32]);
        }
        out
    }

    /// Which zone you crashed in
    pub fn death_zone(&self) -> u8 {
        self.death_zone as u8
    }

    /// Which kind of obstacle you crashed into (255 = none), for a funnier death message
    pub fn death_kind(&self) -> u8 {
        self.death_kind
    }

    /// Scroll speed right now, in pixels per second
    pub fn speed(&self) -> f32 {
        self.cur_speed
    }

    /// This zone's full speed
    pub fn zone_speed(&self) -> f32 {
        self.speed
    }

    /// Total distance scrolled, for the moving background
    pub fn scroll(&self) -> f64 {
        self.scroll
    }

    /// How many zone changes you've survived
    pub fn zone_changes(&self) -> u32 {
        self.zone_changes
    }

    pub fn seconds_alive(&self) -> f32 {
        self.tick as f32 * TICK
    }

    /// Returns what happened since the last call (as event bit flags) and clears it
    pub fn take_events(&mut self) -> u32 {
        let e = self.events;
        self.events = 0;
        e
    }
}

// Helpers that JavaScript doesn't need to see
impl Game {
    /// Moves on to the next zone in the run's zone order.
    fn next_zone_starts(&mut self) {
        self.points += self.zone_bonus(); // +100 for making it to a new zone (Jay gets 150)
        self.zone_changes += 1;
        self.zone_index = (self.zone_index + 1) % self.order.len();
        self.zone = self.order[self.zone_index];
        self.zone_tick = 0;
        self.speed_mult = (self.speed_mult * self.speed_up()).min(MAX_SPEED);
        self.speed = BASE_SPEED * self.speed_mult;
        clear_for_new_zone(self);
        enter_zone(self);
        self.events |= event::ZONE_CHANGE;
    }
}
