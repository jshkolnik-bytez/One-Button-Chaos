/* tslint:disable */
/* eslint-disable */

export class Game {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Can he do a trick right now? Only in the air after an ollie
     * (Downtown and Rooftops), and not once he's fallen into a gap.
     */
    can_trick(): boolean;
    /**
     * Market: is he dashing right now?
     */
    dashing(): boolean;
    /**
     * Which kind of obstacle you crashed into (255 = none), for a funnier death message
     */
    death_kind(): number;
    /**
     * Which zone you crashed in
     */
    death_zone(): number;
    /**
     * Park Hill: the donut's left edge on screen (far off screen in other zones)
     */
    donut_x(): number;
    /**
     * Seaside Pier: is he up in the air with the kite?
     */
    flying(): boolean;
    is_dead(): boolean;
    /**
     * Tony just used his shield: he blinks while he's safe
     */
    is_safe(): boolean;
    /**
     * Highway: where he is between the lanes (0 = front lane, 1 = back lane)
     */
    lane_pos(): number;
    /**
     * Tutorial: what he last got past cleanly (a CLEAR event says when)
     */
    last_cleared(): number;
    /**
     * Same seed = same run
     */
    constructor(seed: number);
    next_zone(): number;
    /**
     * [x, y, w, h, kind, a, b,  x, y, w, h, kind, a, b, ...]
     * a = Crosswalk car progress: 0..1 while the car blocks the junction
     *     (it shows up at -0.8 and has driven off by 1.8), or -999 = no car.
     * b = which picture (car paint, beam style...)
     */
    obstacles(): Float32Array;
    /**
     * The boy's hitbox: [x, y, width, height]
     */
    player(): Float32Array;
    /**
     * Which picture of the boy to show (see Pose)
     */
    pose(): number;
    /**
     * Practice: jump straight to a zone (0-6), keeping the run going from there
     */
    practice(zone: number): void;
    /**
     * Button down
     */
    press(): void;
    /**
     * Button up
     */
    release(): void;
    score(): number;
    /**
     * Total distance scrolled, for the moving background
     */
    scroll(): number;
    seconds_alive(): number;
    seconds_to_next_zone(): number;
    /**
     * Testing only: nothing can hurt him (used for screenshots)
     */
    set_invincible(on: boolean): void;
    /**
     * Picks the skater and the board (call it right after `new`, before the run starts)
     */
    set_loadout(character: number, board: number): void;
    /**
     * Tutorial mode: nothing can end the run (crashes are just "OOPS!"), the
     * zones only change when the tutorial says so, and the speed stays easy
     */
    set_tutorial(on: boolean): void;
    /**
     * Tony: is his one-time shield still ready?
     */
    shield_ready(): boolean;
    /**
     * Market: [x, y, kind] of the last thing smashed
     */
    smash(): Float32Array;
    /**
     * Scroll speed right now, in pixels per second
     */
    speed(): number;
    /**
     * Returns what happened since the last call (as event bit flags) and clears it
     */
    take_events(): number;
    /**
     * A trick landed in mid-air (the keys are checked in tricks.js).
     * Adds its bonus points and returns true, or false if it's too late.
     */
    trick(points: number): boolean;
    /**
     * Tutorial: switch to a zone right now (0-6), at the starting speed
     */
    tutorial_zone(zone: number): void;
    /**
     * One fixed tick: moves time forward exactly 1/60 of a second
     */
    update(): void;
    /**
     * Subway: is he upside down? (Riding the ceiling, or past halfway on his way there)
     */
    upside_down(): boolean;
    /**
     * How fast he's moving away from the surface he stands on (+ = going up, for the pictures)
     */
    vy_up(): number;
    /**
     * The current zone (0 = Downtown)
     */
    zone(): number;
    /**
     * How many zone changes you've survived
     */
    zone_changes(): number;
    /**
     * This zone's full speed
     */
    zone_speed(): number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_game_free: (a: number, b: number) => void;
    readonly game_can_trick: (a: number) => number;
    readonly game_dashing: (a: number) => number;
    readonly game_death_kind: (a: number) => number;
    readonly game_death_zone: (a: number) => number;
    readonly game_donut_x: (a: number) => number;
    readonly game_flying: (a: number) => number;
    readonly game_is_dead: (a: number) => number;
    readonly game_is_safe: (a: number) => number;
    readonly game_lane_pos: (a: number) => number;
    readonly game_last_cleared: (a: number) => number;
    readonly game_new: (a: number) => number;
    readonly game_next_zone: (a: number) => number;
    readonly game_obstacles: (a: number) => [number, number];
    readonly game_player: (a: number) => [number, number];
    readonly game_pose: (a: number) => number;
    readonly game_practice: (a: number, b: number) => void;
    readonly game_press: (a: number) => void;
    readonly game_release: (a: number) => void;
    readonly game_score: (a: number) => number;
    readonly game_scroll: (a: number) => number;
    readonly game_seconds_alive: (a: number) => number;
    readonly game_seconds_to_next_zone: (a: number) => number;
    readonly game_set_invincible: (a: number, b: number) => void;
    readonly game_set_loadout: (a: number, b: number, c: number) => void;
    readonly game_set_tutorial: (a: number, b: number) => void;
    readonly game_shield_ready: (a: number) => number;
    readonly game_smash: (a: number) => [number, number];
    readonly game_speed: (a: number) => number;
    readonly game_take_events: (a: number) => number;
    readonly game_trick: (a: number, b: number) => number;
    readonly game_tutorial_zone: (a: number, b: number) => void;
    readonly game_update: (a: number) => void;
    readonly game_upside_down: (a: number) => number;
    readonly game_vy_up: (a: number) => number;
    readonly game_zone: (a: number) => number;
    readonly game_zone_changes: (a: number) => number;
    readonly game_zone_speed: (a: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
