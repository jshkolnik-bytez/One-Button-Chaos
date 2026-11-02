// engine.js: loads the Rust game brain (compiled to WebAssembly) and gives
// main.js a way to start new games with it.
//
// core/pkg/ is made by `wasm-pack build core --target web`
// (npm run dev and npm run build do that for you).
import init, { Game } from '../core/pkg/chaos_core.js';

export async function loadEngine() {
  await init(); // downloads and starts the .wasm file
  let current = null;
  return {
    newGame(seed) {
      // Rust objects live in WebAssembly memory, so we hand the old game's memory back
      if (current) current.free();
      current = new Game(seed);
      return current;
    },
  };
}
