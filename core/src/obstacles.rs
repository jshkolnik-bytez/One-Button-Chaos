//! obstacles.rs: creating ("spawning"), moving and removing obstacles.
//!
//! Obstacles come in "chunks": a little pattern such as one bin, two cones
//! close together, or a gap between rooftops. Each zone has its own chunks.
//! Chunks appear off the right edge of the screen and scroll left toward the boy.

use crate::Game;
use crate::constants::*;
use crate::zones::Zone;

/// What an obstacle is. The numbers must match KIND in src/world.js.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum Kind {
    // Downtown
    Cone = 0,
    Hydrant = 1,
    Bin = 2,
    Puddle = 3,
    // Rooftops
    Gap = 4,
    AcUnit = 5,
    Vent = 6,
    // Subway
    Barrier = 7,
    FloorSpikes = 8,
    CeilPipe = 9,
    CeilSpikes = 10,
    // Construction
    Beam = 11,
    Bucket = 12,
    // Market Street
    Crates = 13,
    Cart = 14,
    Bike = 15,
    Pigeons = 16,
    // Crosswalk
    Junction = 17,
    // (18 is the donut, see DONUT_KIND)
    // Highway
    StalledCar = 19,
    Roadwork = 20,
    Pothole = 21,
    // Seaside Pier
    WaterGap = 22,
    Gulls = 23,
}

/// Not an obstacle: the "kind" reported when the donut catches you
pub const DONUT_KIND: u8 = 18;

/// A junction with no car crossing it
pub const NO_CAR: u32 = u32::MAX;

impl Kind {
    /// Width and height of each kind, in pixels (the same size as its picture).
    /// Puddles, gaps and beams are stretched to fit (see the chunks below).
    pub fn size(self) -> (f32, f32) {
        match self {
            Kind::Cone => (12.0, 16.0),
            Kind::Hydrant => (12.0, 18.0),
            Kind::Bin => (18.0, 24.0),
            Kind::Puddle => (30.0, 3.0),
            Kind::Gap => (80.0, HEIGHT - GROUND_Y),
            Kind::AcUnit => (22.0, 16.0),
            Kind::Vent => (12.0, 24.0),
            Kind::Barrier => (22.0, 18.0),
            Kind::FloorSpikes => (24.0, 8.0),
            Kind::CeilPipe => (16.0, 22.0),
            Kind::CeilSpikes => (24.0, 8.0),
            Kind::Beam => (60.0, 8.0),
            Kind::Bucket => (16.0, 18.0),
            Kind::Crates => (16.0, 22.0),
            Kind::Cart => (32.0, 24.0),
            Kind::Bike => (28.0, 18.0),
            Kind::Pigeons => (24.0, 12.0),
            Kind::Junction => (56.0, 4.0),
            Kind::StalledCar => (44.0, 22.0),
            Kind::Roadwork => (22.0, 18.0),
            Kind::Pothole => (26.0, 4.0),
            Kind::WaterGap => (120.0, HEIGHT - GROUND_Y),
            Kind::Gulls => (26.0, 14.0),
        }
    }

    /// Market Street things break when you dash into them
    pub fn breakable(self) -> bool {
        matches!(self, Kind::Crates | Kind::Cart | Kind::Bike | Kind::Pigeons)
    }

    /// Highway things sit in one of the two lanes
    pub fn in_lane(self) -> bool {
        matches!(self, Kind::StalledCar | Kind::Roadwork | Kind::Pothole)
    }

    /// Holes you fall through (the rooftops' alleys and the pier's broken planks)
    pub fn is_hole(self) -> bool {
        matches!(self, Kind::Gap | Kind::WaterGap)
    }
}

/// Construction: things hang in the air with their bottom edge here. Standing
/// up you hit them; ducking (24 tall) you pass under with 4 pixels to spare.
pub const HANG_BOTTOM: f32 = GROUND_Y - 28.0;

#[derive(Clone)]
pub struct Obstacle {
    pub kind: Kind,
    pub zone: Zone, // which zone it belongs to
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
    // Crosswalk: the car blocks the junction from tick t0 to tick t1 (NO_CAR = none)
    pub t0: u32,
    pub t1: u32,
    pub paint: u8, // which car (or any other look variation)
    // Tutorial: did he hit it (and so passes through it), and has he got past it?
    pub bumped: bool,
    pub passed: bool,
    pub lane: u8, // Highway: 0 = front lane, 1 = back lane
}

impl Obstacle {
    fn new(kind: Kind, zone: Zone, x: f32, y: f32) -> Obstacle {
        let (w, h) = kind.size();
        Obstacle { kind, zone, x, y, w, h, t0: NO_CAR, t1: NO_CAR, paint: 0, bumped: false, passed: false, lane: 0 }
    }

    /// Standing on the floor with its left edge at x
    pub fn on_ground(kind: Kind, zone: Zone, x: f32) -> Obstacle {
        let h = kind.size().1;
        Obstacle::new(kind, zone, x, GROUND_Y - h)
    }

    /// Hanging from the Subway ceiling
    fn on_ceiling(kind: Kind, zone: Zone, x: f32) -> Obstacle {
        Obstacle::new(kind, zone, x, CEIL_Y)
    }

    /// Hanging in the air over the Construction site
    fn hanging(kind: Kind, zone: Zone, x: f32) -> Obstacle {
        let h = kind.size().1;
        Obstacle::new(kind, zone, x, HANG_BOTTOM - h)
    }
}

// ---------- Chunks: each returns how far to wait before the next chunk ----------

/// Downtown: cones, hydrants, bins and puddles on the pavement. Tap to ollie.
fn downtown_chunk(g: &mut Game, zone: Zone, x: f32) -> f32 {
    let roll = g.rng.int(100);
    let length = if roll < 26 {
        g.obstacles.push(Obstacle::on_ground(Kind::Cone, zone, x));
        Kind::Cone.size().0
    } else if roll < 46 {
        g.obstacles.push(Obstacle::on_ground(Kind::Hydrant, zone, x));
        Kind::Hydrant.size().0
    } else if roll < 64 {
        g.obstacles.push(Obstacle::on_ground(Kind::Bin, zone, x));
        Kind::Bin.size().0
    } else if roll < 80 {
        // A puddle. It gets longer as the game speeds up, so it's never trivial.
        let mut puddle = Obstacle::on_ground(Kind::Puddle, zone, x);
        puddle.w = (g.speed * g.rng.range(0.18, 0.28)).round();
        let w = puddle.w;
        g.obstacles.push(puddle);
        w
    } else {
        // Two cones close together: one ollie clears both
        let gap = g.rng.range(8.0, 14.0).round();
        let w = Kind::Cone.size().0;
        g.obstacles.push(Obstacle::on_ground(Kind::Cone, zone, x));
        g.obstacles.push(Obstacle::on_ground(Kind::Cone, zone, x + w + gap));
        w * 2.0 + gap
    };
    length + g.speed * g.rng.range(0.75, 1.3)
}

/// Rooftops: gaps between the buildings (hold to jump far enough), and
/// air-conditioners and vents (a quick tap hops over them).
fn rooftops_chunk(g: &mut Game, zone: Zone, x: f32) -> f32 {
    let roll = g.rng.int(100);
    let gap = |g: &mut Game, x: f32| {
        let mut o = Obstacle::new(Kind::Gap, zone, x, GROUND_Y);
        o.w = (g.speed * g.rng.range(0.5, 0.72)).round().max(56.0);
        o.paint = g.rng.int(4) as u8;
        let w = o.w;
        g.obstacles.push(o);
        w
    };
    let length = if roll < 50 {
        gap(g, x)
    } else if roll < 72 {
        g.obstacles.push(Obstacle::on_ground(Kind::AcUnit, zone, x));
        Kind::AcUnit.size().0
    } else if roll < 88 {
        g.obstacles.push(Obstacle::on_ground(Kind::Vent, zone, x));
        Kind::Vent.size().0
    } else {
        // An air-conditioner, then a gap after it: hop, land, then the big one
        g.obstacles.push(Obstacle::on_ground(Kind::AcUnit, zone, x));
        let gx = x + Kind::AcUnit.size().0 + (g.speed * 0.85).round();
        gx - x + gap(g, gx)
    };
    length + g.speed * g.rng.range(0.8, 1.25)
}

/// Subway: things on the floor and things on the ceiling. Flip to whichever is clear.
fn subway_chunk(g: &mut Game, zone: Zone, x: f32) -> f32 {
    let roll = g.rng.int(100);
    let kind = match roll {
        0..30 => Kind::Barrier,
        30..50 => Kind::FloorSpikes,
        50..78 => Kind::CeilPipe,
        _ => Kind::CeilSpikes,
    };
    let o = if matches!(kind, Kind::CeilPipe | Kind::CeilSpikes) {
        Obstacle::on_ceiling(kind, zone, x)
    } else {
        Obstacle::on_ground(kind, zone, x)
    };
    g.obstacles.push(o);
    kind.size().0 + g.speed * g.rng.range(0.78, 1.15)
}

/// Construction: steel beams and buckets swinging at head height. Duck!
fn construction_chunk(g: &mut Game, zone: Zone, x: f32) -> f32 {
    let roll = g.rng.int(100);
    let beam = |g: &mut Game, x: f32| {
        let mut o = Obstacle::hanging(Kind::Beam, zone, x);
        o.w = (40.0 + g.rng.range(0.0, 1.0) * g.speed * 0.55).round();
        o.paint = g.rng.int(3) as u8;
        let w = o.w;
        g.obstacles.push(o);
        w
    };
    let length = if roll < 55 {
        beam(g, x)
    } else if roll < 85 {
        g.obstacles.push(Obstacle::hanging(Kind::Bucket, zone, x));
        Kind::Bucket.size().0
    } else {
        // A bucket right behind a beam: stay down for both
        let w = beam(g, x);
        let bx = x + w + (g.speed * 0.2).round();
        g.obstacles.push(Obstacle::hanging(Kind::Bucket, zone, bx));
        bx - x + Kind::Bucket.size().0
    };
    length + g.speed * g.rng.range(0.6, 1.05)
}

/// Market Street: crates, fruit carts, bikes and pigeons. Dash to smash through.
fn market_chunk(g: &mut Game, zone: Zone, x: f32) -> f32 {
    let roll = g.rng.int(100);
    let kind = match roll {
        0..30 => Kind::Crates,
        30..55 => Kind::Cart,
        55..78 => Kind::Bike,
        _ => Kind::Pigeons,
    };
    let mut o = Obstacle::on_ground(kind, zone, x);
    o.paint = g.rng.int(4) as u8;
    g.obstacles.push(o);
    kind.size().0 + g.speed * g.rng.range(0.68, 1.1)
}

/// Crosswalk: side streets cross the pavement. Most have a car coming, timed
/// so it crosses right when you'd get there, unless you stop and wait.
fn crosswalk_chunk(g: &mut Game, zone: Zone, x: f32) -> f32 {
    let mut o = Obstacle::new(Kind::Junction, zone, x, GROUND_Y - 4.0);
    o.paint = g.rng.int(4) as u8;
    if g.rng.int(100) < 82 {
        let distance = x - (PLAYER_X + PLAYER_W);
        let arrive = g.tick as f32 + (distance / g.speed / TICK).max(0.0);
        let start = (arrive + g.rng.range(-28.0, 4.0)).round().max(g.tick as f32 + 50.0);
        o.t0 = start as u32;
        o.t1 = o.t0 + g.rng.range(48.0, 66.0).round() as u32;
    }
    g.obstacles.push(o);
    Kind::Junction.size().0 + g.speed * g.rng.range(1.2, 1.7)
}

/// Highway: stalled cars, roadworks and potholes in one lane or the other.
/// Tap to switch to the clear lane.
fn highway_chunk(g: &mut Game, zone: Zone, x: f32) -> f32 {
    let place = |g: &mut Game, lane: u8, x: f32| {
        let kind = match g.rng.int(100) {
            0..45 => Kind::StalledCar,
            45..75 => Kind::Roadwork,
            _ => Kind::Pothole,
        };
        let (w, h) = kind.size();
        let mut o = Obstacle::new(kind, zone, x, GROUND_Y - LANE_GAP * lane as f32 - h);
        o.lane = lane;
        o.paint = g.rng.int(4) as u8;
        g.obstacles.push(o);
        w
    };
    let lane = g.rng.int(2) as u8;
    let w = place(g, lane, x);
    if g.rng.int(100) < 35 {
        // ...and soon after, something in the other lane: switch, then switch back
        let x2 = x + w + (g.speed * 0.55).round();
        let w2 = place(g, 1 - lane, x2);
        return x2 - x + w2 + g.speed * g.rng.range(0.75, 1.1);
    }
    w + g.speed * g.rng.range(0.7, 1.1)
}

/// Seaside Pier: broken bits of pier over the sea (fly over them with the
/// kite), often with seagulls in the way at some height.
fn pier_chunk(g: &mut Game, zone: Zone, x: f32) -> f32 {
    let w = (g.speed * g.rng.range(0.9, 1.6)).round();
    let mut hole = Obstacle::new(Kind::WaterGap, zone, x, GROUND_Y);
    hole.w = w;
    g.obstacles.push(hole);
    let roll = g.rng.int(100);
    if roll < 70 {
        let gy = g.rng.range(110.0, 175.0).round();
        let gx = x + (w * g.rng.range(0.3, 0.6)).round();
        g.obstacles.push(Obstacle::new(Kind::Gulls, zone, gx, gy));
        if roll < 25 && w > g.speed * 1.2 {
            let gy2 = if gy < 142.0 { gy + 50.0 } else { gy - 50.0 };
            g.obstacles.push(Obstacle::new(Kind::Gulls, zone, gx + (g.speed * 0.45).round(), gy2));
        }
    }
    w + g.speed * g.rng.range(0.55, 0.9)
}

fn make_chunk(g: &mut Game, zone: Zone, x: f32) -> f32 {
    match zone {
        Zone::Downtown => downtown_chunk(g, zone, x),
        Zone::Rooftops => rooftops_chunk(g, zone, x),
        Zone::Subway => subway_chunk(g, zone, x),
        Zone::Construction => construction_chunk(g, zone, x),
        Zone::Market => market_chunk(g, zone, x),
        Zone::Crosswalk => crosswalk_chunk(g, zone, x),
        Zone::ParkHill => g.speed * 0.5, // nothing on the path: the donut is enough
        Zone::Highway => highway_chunk(g, zone, x),
        Zone::Pier => pier_chunk(g, zone, x),
    }
}

/// Decides which zone a chunk starting at x should belong to, so that nothing
/// ever reaches the boy in the wrong zone:
/// - this zone's chunks must reach him well before the zone ends
/// - the next zone's chunks may appear during the warning (a sneak peek!)
///   but only reach him a moment after the change
/// Returns None if nothing fits right now.
fn choose_zone(g: &Game, x: f32) -> Option<Zone> {
    let next = g.order[(g.zone_index + 1) % g.order.len()];
    if next == g.zone || g.tutorial {
        return Some(g.zone);
    }

    let ticks_left = (ZONE_TICKS - g.zone_tick) as f32;
    let distance = x - (PLAYER_X + PLAYER_W);
    let reach_now = distance / g.speed / TICK; // ticks until it reaches the boy
    if reach_now + OLD_ZONE_GAP / TICK <= ticks_left {
        return Some(g.zone);
    }
    let reach_next = distance / (g.speed * g.speed_up()) / TICK;
    if ticks_left <= WARNING_TICKS as f32 && reach_next >= ticks_left + NEW_ZONE_GAP / TICK {
        return Some(next);
    }
    None
}

/// Called every tick: makes a new chunk whenever the last one has moved far enough.
pub fn spawn_obstacles(g: &mut Game, dx: f32) {
    g.spawn_cursor -= dx;
    while g.spawn_cursor <= 0.0 {
        // Start just off screen; adding the (negative) cursor keeps spacing exact
        let x = WIDTH + 20.0 + g.spawn_cursor;
        match choose_zone(g, x) {
            Some(zone) => g.spawn_cursor += make_chunk(g, zone, x),
            None => g.spawn_cursor += g.speed * 0.05, // nothing fits yet, look again soon
        }
    }
}

/// Called every tick: slides everything left and forgets what's off screen.
pub fn move_obstacles(g: &mut Game, dx: f32) {
    let (px, zone) = (g.player.x, g.zone);
    let mut cleared = None;
    for o in g.obstacles.iter_mut() {
        o.x -= dx;
        // Tutorial: count things he got past without hitting them
        if !o.passed && o.zone == zone && o.x + o.w < px {
            o.passed = true;
            if !o.bumped {
                cleared = Some(o.kind as u8);
            }
        }
    }
    if let Some(kind) = cleared {
        g.last_cleared = kind;
        g.events |= event::CLEAR;
    }
    g.obstacles.retain(|o| o.x + o.w > -60.0);
}

/// At a zone change: anything from the old zone that hasn't passed the boy
/// yet vanishes, so he never gets hit by something meant for another zone.
pub fn clear_for_new_zone(g: &mut Game) {
    let (px, pw, zone) = (g.player.x, g.player.w, g.zone);
    g.obstacles.retain(|o| {
        if o.zone != zone {
            o.x + o.w < px - 6.0 // keep only what's behind him
        } else {
            o.x > px + pw + 10.0 // new zone: keep unless it's right on top of him
        }
    });
}
