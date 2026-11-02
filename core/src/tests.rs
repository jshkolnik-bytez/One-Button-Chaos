//! tests.rs: checks that the game is fair and always plays the same way.
//! Run them with: cargo test --release   (inside the core/ folder)

use crate::Game;
use crate::constants::*;
use crate::zones::{self, Zone};

// ---------- Same seed = same run ----------

#[test]
fn same_seed_gives_same_zone_order() {
    assert_eq!(Game::new(20261021).order, Game::new(20261021).order);
}

/// Plays a run with a fixed pattern of presses and returns what happened.
fn replay(seed: u32) -> (u32, u32, Vec<f32>) {
    let mut g = Game::new(seed);
    for t in 0..6000 {
        if t % 37 == 0 {
            g.press();
        }
        if t % 37 == 9 {
            g.release();
        }
        g.update();
    }
    (g.score(), g.tick, g.obstacles())
}

#[test]
fn same_seed_and_same_presses_give_same_score() {
    for seed in [1, 99, 20261021] {
        assert_eq!(replay(seed), replay(seed));
    }
}

#[test]
fn different_days_give_different_obstacles() {
    let run = |seed| {
        let mut g = Game::new(seed);
        for _ in 0..400 {
            g.obstacles.retain(|o| o.x > 200.0); // never crash: we only look at what spawns
            g.update();
        }
        g.obstacles()
    };
    assert_ne!(run(20261021), run(20261022));
}

// ---------- The zone order ----------

#[test]
fn every_run_starts_downtown() {
    for seed in 0..500u32 {
        let order = Game::new(seed.wrapping_mul(7919)).order;
        assert_eq!(order.len(), ZONE_ORDER_LENGTH);
        assert_eq!(order[0], Zone::Downtown, "new players learn on Jump");
        if Zone::ALL.len() > 1 {
            for i in 0..order.len() {
                assert_ne!(order[i], order[(i + 1) % order.len()], "never the same zone twice in a row");
            }
        }
    }
}

// ---------- Timing and scoring ----------

/// Updates without ever crashing (these tests only care about the clock)
fn safe_update(g: &mut Game) {
    g.obstacles.clear();
    g.donut_gap = DONUT_MAX_GAP; // the donut never catches up either
    g.update();
}

#[test]
fn warning_comes_two_seconds_before_each_zone_change() {
    let mut g = Game::new(5);
    let mut warnings = Vec::new();
    let mut changes = Vec::new();
    for _ in 0..(ZONE_TICKS * 3) {
        safe_update(&mut g);
        let e = g.take_events();
        if e & event::WARNING != 0 {
            warnings.push(g.tick);
        }
        if e & event::ZONE_CHANGE != 0 {
            changes.push(g.tick);
        }
    }
    assert_eq!(changes, vec![720, 1440, 2160]);
    assert_eq!(warnings, vec![600, 1320, 2040]);
}

#[test]
fn score_is_ten_per_second_plus_bonuses() {
    let mut g = Game::new(5);
    g.set_loadout(crate::perks::MAYA, 0); // Jay's zone bonus is bigger
    for _ in 0..(ZONE_TICKS - 1) {
        safe_update(&mut g);
    }
    assert_eq!(g.score(), 119); // 11.98 seconds
    safe_update(&mut g);
    assert_eq!(g.score(), 220); // 12 seconds = 120 points, + 100 for the new zone
}

#[test]
fn speed_goes_up_five_percent_per_zone_with_a_limit() {
    let mut g = Game::new(5);
    for _ in 0..ZONE_TICKS {
        safe_update(&mut g);
    }
    assert!((g.speed - BASE_SPEED * 1.05).abs() < 1e-3);
    for _ in 0..(ZONE_TICKS * 30) {
        safe_update(&mut g);
    }
    assert!((g.speed_mult - MAX_SPEED).abs() < 1e-4);
}

#[test]
fn the_boy_lands_back_on_the_pavement() {
    let mut g = Game::new(5);
    g.press();
    let mut highest = GROUND_Y;
    for _ in 0..60 {
        safe_update(&mut g);
        highest = highest.min(g.player.y + g.player.h);
    }
    assert!(g.player.grounded);
    assert_eq!(g.player.y + g.player.h, GROUND_Y);
    let jump_height = GROUND_Y - highest;
    assert!(jump_height > 45.0 && jump_height < 60.0, "jump height was {jump_height}");
}

// ---------- A look-ahead bot proves every zone can be beaten ----------

/// A game that starts in `zone` at `speed_mult` times the normal speed.
fn game_in_zone(seed: u32, zone: Zone, speed_mult: f32) -> Game {
    let mut g = Game::new(seed);
    g.order[0] = zone;
    g.zone = zone;
    g.speed_mult = speed_mult;
    g.speed = BASE_SPEED * speed_mult;
    g
}

#[derive(Clone, Copy)]
enum Action {
    Idle,    // let go
    Tap,     // a quick press and release
    Hold,    // press (or keep holding)
    Repress, // let go and press again straight away
}

fn options(zone: Zone) -> &'static [Action] {
    match zone {
        Zone::Downtown | Zone::Subway | Zone::Market | Zone::ParkHill => &[Action::Idle, Action::Tap],
        Zone::Rooftops | Zone::Crosswalk => &[Action::Idle, Action::Hold],
        Zone::Construction => &[Action::Idle, Action::Hold, Action::Repress],
    }
}

fn act(g: &mut Game, a: Action) {
    match a {
        Action::Idle => g.release(),
        Action::Tap => {
            g.release();
            g.press();
            g.release();
        }
        Action::Hold => g.press(),
        Action::Repress => {
            g.release();
            g.press();
        }
    }
}

const STEP: u32 = 4; // the bot decides every 4 ticks (15 times a second)

/// Can the game survive `ticks` more ticks if the bot plays well?
fn can_survive(g: &Game, ticks: i32, budget: &mut u32) -> bool {
    if g.dead {
        return false;
    }
    if ticks <= 0 {
        return true;
    }
    if *budget == 0 {
        return false;
    }
    *budget -= 1;
    for &a in options(g.zone) {
        let mut c = g.clone();
        act(&mut c, a);
        for _ in 0..STEP {
            c.update();
        }
        if can_survive(&c, ticks - STEP as i32, budget) {
            return true;
        }
    }
    false
}

/// The bot plays until `ticks` have passed. Returns true if it's still alive.
fn bot_plays(mut g: Game, ticks: u32) -> bool {
    let start = g.tick;
    while !g.dead && g.tick - start < ticks {
        let mut chosen = Action::Idle;
        for &a in options(g.zone) {
            let mut c = g.clone();
            act(&mut c, a);
            for _ in 0..STEP {
                c.update();
            }
            if can_survive(&c, 100, &mut 6000) {
                chosen = a;
                break;
            }
        }
        act(&mut g, chosen);
        for _ in 0..STEP {
            g.update();
        }
    }
    !g.dead
}

#[test]
fn every_zone_can_be_beaten_at_every_speed() {
    for zone in Zone::ALL {
        for speed in [1.0, 1.6, MAX_SPEED] {
            for i in 0..12 {
                let seed = 5000 + i * 131;
                assert!(
                    bot_plays(game_in_zone(seed, zone, speed), ZONE_TICKS - 10),
                    "bot died in {zone:?} at {speed}x speed (seed {seed})"
                );
            }
        }
    }
}

#[test]
fn bot_survives_long_daily_runs() {
    for day in [20261020, 20261021, 20261022] {
        assert!(bot_plays(Game::new(day), 60 * 120), "bot died on day {day}");
    }
}

/// A much bigger version of the test above. It takes a while, so it only runs
/// when you ask for it: cargo test --release -- --ignored
#[test]
#[ignore]
fn stress_every_zone_with_many_seeds() {
    let mut failures = Vec::new();
    for zone in Zone::ALL {
        for speed in [1.0, 1.3, 1.6, 2.0, MAX_SPEED] {
            for i in 0..200 {
                let seed = 90_000 + i * 7919;
                if !bot_plays(game_in_zone(seed, zone, speed), ZONE_TICKS - 10) {
                    failures.push(format!("{zone:?} at {speed}x (seed {seed})"));
                }
            }
        }
    }
    assert!(failures.is_empty(), "bot died {} times: {failures:#?}", failures.len());
}

// ---------- Park Hill at human mashing speed ----------

/// Taps `per_second` times a second in Park Hill. Returns true if he survives the zone.
fn mash(per_second: f32, speed_mult: f32) -> bool {
    let mut g = game_in_zone(77, Zone::ParkHill, speed_mult);
    zones::enter_zone(&mut g);
    let every = 60.0 / per_second;
    let mut next = 0.0;
    for t in 0..(ZONE_TICKS - 10) {
        if t as f32 >= next {
            g.press();
            next += every;
        } else {
            g.release();
        }
        g.update();
    }
    !g.dead
}

#[test]
fn park_hill_needs_real_mashing_but_not_superhuman_mashing() {
    assert!(mash(5.5, MAX_SPEED), "5.5 taps a second should be enough even at top speed");
    assert!(mash(4.0, 1.0), "4 taps a second should be enough at the start");
    assert!(!mash(2.5, 1.0), "2.5 taps a second is too lazy");
}

// ---------- Holding forever doesn't work either ----------

#[test]
fn ducking_forever_makes_his_legs_give_up() {
    let mut g = game_in_zone(3, Zone::Construction, 1.0);
    g.press();
    for _ in 0..DUCK_MAX_TICKS + 5 {
        g.obstacles.clear();
        g.update();
    }
    assert!(!g.player.ducking);
    g.release();
    g.press();
    assert!(g.player.ducking, "let go and press again to duck again");
}

#[test]
fn waiting_at_the_crosswalk_forever_doesnt_skip_it() {
    let mut g = game_in_zone(3, Zone::Crosswalk, 1.0);
    g.press();
    for _ in 0..ZONE_TICKS * 2 {
        g.obstacles.clear();
        g.update();
    }
    assert_eq!(g.zone, Zone::Crosswalk);
    assert!(g.cur_speed < 1.0);
}

#[test]
fn rooftop_hold_jumps_much_further_than_a_tap() {
    let air_time = |hold: bool| {
        let mut g = game_in_zone(3, Zone::Rooftops, 1.0);
        g.press();
        if !hold {
            g.release();
        }
        let mut t = 0;
        loop {
            g.obstacles.clear();
            g.update();
            t += 1;
            if g.player.grounded {
                return t;
            }
        }
    };
    let (tap, hold) = (air_time(false), air_time(true));
    assert!(hold as f32 > tap as f32 * 1.5, "tap {tap} ticks, hold {hold} ticks");
}

#[test]
fn subway_flips_to_the_ceiling_and_back() {
    let mut g = game_in_zone(3, Zone::Subway, 1.0);
    g.press();
    g.release();
    for _ in 0..40 {
        g.obstacles.clear();
        g.update();
    }
    assert!(g.player.grounded && g.player.y == CEIL_Y && g.upside_down());
    g.press();
    g.release();
    for _ in 0..40 {
        g.obstacles.clear();
        g.update();
    }
    assert!(g.player.grounded && g.player.y + g.player.h == GROUND_Y && !g.upside_down());
}

#[test]
fn leaving_the_subway_upside_down_drops_him_to_the_floor() {
    let mut g = game_in_zone(3, Zone::Subway, 1.0);
    g.order[1] = Zone::Downtown;
    g.press();
    g.release();
    while g.zone == Zone::Subway {
        g.obstacles.clear();
        g.update();
    }
    for _ in 0..40 {
        g.obstacles.clear();
        g.update();
    }
    assert!(g.player.grounded && g.player.y + g.player.h == GROUND_Y && !g.upside_down());
}

// ---------- ...and doing nothing doesn't work ----------

#[test]
fn doing_nothing_fails() {
    for zone in Zone::ALL {
        let survived = (0..40)
            .filter(|i| {
                let mut g = game_in_zone(1000 + i * 77, zone, 1.0);
                for _ in 0..(ZONE_TICKS - 10) {
                    g.update();
                }
                !g.dead
            })
            .count();
        assert_eq!(survived, 0, "{zone:?}: {survived}/40 survived doing nothing");
    }
}

// ---------- The crew and their boards ----------

use crate::perks;

fn with_loadout(mut g: Game, character: u8, board: u8) -> Game {
    g.set_loadout(character, board);
    g
}

#[test]
fn every_character_on_every_board_can_beat_every_zone() {
    for character in 0..8u8 {
        for board in 0..6u8 {
            for zone in Zone::ALL {
                for speed in [1.0, MAX_SPEED] {
                    let seed = 7000 + character as u32 * 101 + board as u32 * 13;
                    let g = with_loadout(game_in_zone(seed, zone, speed), character, board);
                    assert!(
                        bot_plays(g, ZONE_TICKS - 10),
                        "bot died as character {character} on board {board} in {zone:?} at {speed}x"
                    );
                }
            }
        }
    }
}

#[test]
fn tony_survives_exactly_one_crash() {
    let mut g = with_loadout(game_in_zone(9, Zone::Downtown, 1.0), perks::TONY, 0);
    assert!(g.shield_ready());
    let mut crashes = 0;
    for _ in 0..ZONE_TICKS * 2 {
        g.update();
        if g.take_events() & event::SHIELD != 0 {
            crashes += 1;
        }
        if g.dead {
            break;
        }
    }
    assert_eq!(crashes, 1, "the shield should save him once");
    assert!(g.dead, "...and only once");
}

#[test]
fn tony_is_even_saved_from_falling_off_a_roof() {
    let mut g = with_loadout(game_in_zone(9, Zone::Rooftops, 1.0), perks::TONY, 0);
    g.obstacles.clear();
    g.obstacles.push(crate::obstacles::Obstacle::on_ground(crate::obstacles::Kind::Gap, Zone::Rooftops, 60.0));
    g.obstacles[0].y = GROUND_Y;
    g.obstacles[0].w = 150.0;
    for _ in 0..120 {
        g.update();
    }
    assert!(!g.dead);
    assert!(!g.shield_ready());
}

#[test]
fn nova_can_ollie_once_more_in_the_air() {
    let mut g = with_loadout(game_in_zone(9, Zone::Downtown, 1.0), perks::NOVA, 0);
    g.press();
    g.release();
    for _ in 0..10 {
        g.obstacles.clear();
        g.update();
    }
    g.take_events();
    g.press();
    g.release();
    assert!(g.take_events() & event::DOUBLE_JUMP != 0, "second jump in the air");
    for _ in 0..4 {
        g.obstacles.clear();
        g.update();
    }
    g.take_events();
    g.press();
    g.release();
    assert!(g.take_events() & event::JUMP == 0, "but not a third");

    // Jay can't do it at all
    let mut g = game_in_zone(9, Zone::Downtown, 1.0);
    g.press();
    g.release();
    for _ in 0..10 {
        g.obstacles.clear();
        g.update();
    }
    g.take_events();
    g.press();
    g.release();
    assert!(g.take_events() & event::JUMP == 0);
}

#[test]
fn maya_and_the_pop_deck_jump_higher() {
    let peak = |character, board| {
        let mut g = with_loadout(game_in_zone(9, Zone::Downtown, 1.0), character, board);
        g.press();
        let mut top = GROUND_Y;
        for _ in 0..60 {
            g.obstacles.clear();
            g.update();
            top = top.min(g.player.y + g.player.h);
        }
        GROUND_Y - top
    };
    let jay = peak(perks::JAY, perks::CLASSIC);
    assert!(peak(perks::MAYA, perks::CLASSIC) > jay + 4.0);
    assert!(peak(perks::JAY, perks::POP) > jay + 2.0);
    assert!(peak(perks::MAYA, perks::POP) > peak(perks::MAYA, perks::CLASSIC));
}

#[test]
fn zeke_speeds_up_more_slowly() {
    let speed_after = |character| {
        let mut g = with_loadout(Game::new(5), character, 0);
        for _ in 0..ZONE_TICKS * 4 {
            safe_update(&mut g);
        }
        g.speed
    };
    assert!(speed_after(perks::ZEKE) < speed_after(perks::JAY));
}

#[test]
fn jay_gets_a_bigger_zone_bonus_and_the_cruiser_scores_more() {
    let score = |character, board| {
        let mut g = with_loadout(Game::new(5), character, board);
        for _ in 0..ZONE_TICKS {
            safe_update(&mut g);
        }
        g.score()
    };
    assert_eq!(score(perks::JAY, perks::CLASSIC), 270); // 120 + 150
    assert_eq!(score(perks::MAYA, perks::CLASSIC), 220); // 120 + 100
    assert_eq!(score(perks::MAYA, perks::CRUISER), 250); // 150 + 100
}

#[test]
fn gloria_slows_the_donut_and_the_rocket_pushes_harder() {
    let gap_after = |character, board| {
        let mut g = with_loadout(game_in_zone(9, Zone::ParkHill, 1.0), character, board);
        zones::enter_zone(&mut g);
        for t in 0..120 {
            if t % 30 == 0 {
                g.press();
            } else {
                g.release();
            }
            g.update();
        }
        g.donut_gap
    };
    let jay = gap_after(perks::JAY, perks::CLASSIC);
    assert!(gap_after(perks::GLORIA, perks::CLASSIC) > jay);
    assert!(gap_after(perks::JAY, perks::ROCKET) > jay);
}
