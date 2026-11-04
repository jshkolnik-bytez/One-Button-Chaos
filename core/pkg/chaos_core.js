/* @ts-self-types="./chaos_core.d.ts" */

export class Game {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GameFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_game_free(ptr, 0);
    }
    /**
     * Can he do a trick right now? Only in the air after an ollie
     * (Downtown and Rooftops), and not once he's fallen into a gap.
     * @returns {boolean}
     */
    can_trick() {
        const ret = wasm.game_can_trick(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Market: is he dashing right now?
     * @returns {boolean}
     */
    dashing() {
        const ret = wasm.game_dashing(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Which kind of obstacle you crashed into (255 = none), for a funnier death message
     * @returns {number}
     */
    death_kind() {
        const ret = wasm.game_death_kind(this.__wbg_ptr);
        return ret;
    }
    /**
     * Which zone you crashed in
     * @returns {number}
     */
    death_zone() {
        const ret = wasm.game_death_zone(this.__wbg_ptr);
        return ret;
    }
    /**
     * Park Hill: the donut's left edge on screen (far off screen in other zones)
     * @returns {number}
     */
    donut_x() {
        const ret = wasm.game_donut_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * Seaside Pier: is he up in the air with the kite?
     * @returns {boolean}
     */
    flying() {
        const ret = wasm.game_flying(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    is_dead() {
        const ret = wasm.game_is_dead(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Tony just used his shield: he blinks while he's safe
     * @returns {boolean}
     */
    is_safe() {
        const ret = wasm.game_is_safe(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Highway: where he is between the lanes (0 = front lane, 1 = back lane)
     * @returns {number}
     */
    lane_pos() {
        const ret = wasm.game_lane_pos(this.__wbg_ptr);
        return ret;
    }
    /**
     * Tutorial: what he last got past cleanly (a CLEAR event says when)
     * @returns {number}
     */
    last_cleared() {
        const ret = wasm.game_last_cleared(this.__wbg_ptr);
        return ret;
    }
    /**
     * Same seed = same run
     * @param {number} seed
     */
    constructor(seed) {
        const ret = wasm.game_new(seed);
        this.__wbg_ptr = ret;
        GameFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    next_zone() {
        const ret = wasm.game_next_zone(this.__wbg_ptr);
        return ret;
    }
    /**
     * [x, y, w, h, kind, a, b,  x, y, w, h, kind, a, b, ...]
     * a = Crosswalk car progress: 0..1 while the car blocks the junction
     *     (it shows up at -0.8 and has driven off by 1.8), or -999 = no car.
     * b = which picture (car paint, beam style...)
     * @returns {Float32Array}
     */
    obstacles() {
        const ret = wasm.game_obstacles(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * The boy's hitbox: [x, y, width, height]
     * @returns {Float32Array}
     */
    player() {
        const ret = wasm.game_player(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Which picture of the boy to show (see Pose)
     * @returns {number}
     */
    pose() {
        const ret = wasm.game_pose(this.__wbg_ptr);
        return ret;
    }
    /**
     * Practice: jump straight to a zone (0-6), keeping the run going from there
     * @param {number} zone
     */
    practice(zone) {
        wasm.game_practice(this.__wbg_ptr, zone);
    }
    /**
     * Button down
     */
    press() {
        wasm.game_press(this.__wbg_ptr);
    }
    /**
     * Button up
     */
    release() {
        wasm.game_release(this.__wbg_ptr);
    }
    /**
     * @returns {number}
     */
    score() {
        const ret = wasm.game_score(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Total distance scrolled, for the moving background
     * @returns {number}
     */
    scroll() {
        const ret = wasm.game_scroll(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    seconds_alive() {
        const ret = wasm.game_seconds_alive(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    seconds_to_next_zone() {
        const ret = wasm.game_seconds_to_next_zone(this.__wbg_ptr);
        return ret;
    }
    /**
     * Testing only: nothing can hurt him (used for screenshots)
     * @param {boolean} on
     */
    set_invincible(on) {
        wasm.game_set_invincible(this.__wbg_ptr, on);
    }
    /**
     * Picks the skater and the board (call it right after `new`, before the run starts)
     * @param {number} character
     * @param {number} board
     */
    set_loadout(character, board) {
        wasm.game_set_loadout(this.__wbg_ptr, character, board);
    }
    /**
     * Tutorial mode: nothing can end the run (crashes are just "OOPS!"), the
     * zones only change when the tutorial says so, and the speed stays easy
     * @param {boolean} on
     */
    set_tutorial(on) {
        wasm.game_set_tutorial(this.__wbg_ptr, on);
    }
    /**
     * Tony: is his one-time shield still ready?
     * @returns {boolean}
     */
    shield_ready() {
        const ret = wasm.game_shield_ready(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Market: [x, y, kind] of the last thing smashed
     * @returns {Float32Array}
     */
    smash() {
        const ret = wasm.game_smash(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Scroll speed right now, in pixels per second
     * @returns {number}
     */
    speed() {
        const ret = wasm.game_speed(this.__wbg_ptr);
        return ret;
    }
    /**
     * Returns what happened since the last call (as event bit flags) and clears it
     * @returns {number}
     */
    take_events() {
        const ret = wasm.game_take_events(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * A trick landed in mid-air (the keys are checked in tricks.js).
     * Adds its bonus points and returns true, or false if it's too late.
     * @param {number} points
     * @returns {boolean}
     */
    trick(points) {
        const ret = wasm.game_trick(this.__wbg_ptr, points);
        return ret !== 0;
    }
    /**
     * Tutorial: switch to a zone right now (0-6), at the starting speed
     * @param {number} zone
     */
    tutorial_zone(zone) {
        wasm.game_tutorial_zone(this.__wbg_ptr, zone);
    }
    /**
     * One fixed tick: moves time forward exactly 1/60 of a second
     */
    update() {
        wasm.game_update(this.__wbg_ptr);
    }
    /**
     * Subway: is he upside down? (Riding the ceiling, or past halfway on his way there)
     * @returns {boolean}
     */
    upside_down() {
        const ret = wasm.game_upside_down(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * How fast he's moving away from the surface he stands on (+ = going up, for the pictures)
     * @returns {number}
     */
    vy_up() {
        const ret = wasm.game_vy_up(this.__wbg_ptr);
        return ret;
    }
    /**
     * The current zone (0 = Downtown)
     * @returns {number}
     */
    zone() {
        const ret = wasm.game_zone(this.__wbg_ptr);
        return ret;
    }
    /**
     * How many zone changes you've survived
     * @returns {number}
     */
    zone_changes() {
        const ret = wasm.game_zone_changes(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * This zone's full speed
     * @returns {number}
     */
    zone_speed() {
        const ret = wasm.game_zone_speed(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) Game.prototype[Symbol.dispose] = Game.prototype.free;
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./chaos_core_bg.js": import0,
    };
}

const GameFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_game_free(ptr, 1));

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('chaos_core_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
