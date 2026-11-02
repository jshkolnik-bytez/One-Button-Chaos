// Vite settings for the dev server and the production build.
import { defineConfig } from 'vite';
import { exec } from 'node:child_process';

// While `npm run dev` is running, this rebuilds the Rust core whenever you
// save a .rs file, then reloads the page. (No special WASM plugin is needed:
// wasm-pack's --target web output already works with Vite.)
function rebuildRustOnSave() {
  let building = false;
  let again = false;

  return {
    name: 'rebuild-rust-on-save',
    configureServer(server) {
      const build = () => {
        building = true;
        server.config.logger.info('🦀 Rust changed: rebuilding core/ ...');
        exec('wasm-pack build core --target web', (error, stdout, stderr) => {
          building = false;
          if (error) {
            server.config.logger.error(stderr || error.message);
          } else {
            server.config.logger.info('🦀 Rust rebuilt, reloading the page');
            server.ws.send({ type: 'full-reload' });
          }
          if (again) {
            again = false;
            build();
          }
        });
      };

      server.watcher.on('change', (file) => {
        if (!file.endsWith('.rs')) return;
        if (building) again = true;
        else build();
      });
    },
  };
}

export default defineConfig({
  // './' makes every file path in dist/ relative, so the built game
  // works from any folder: GitHub Pages, itch.io, or a plain download.
  base: './',
  plugins: [rebuildRustOnSave()],
});
