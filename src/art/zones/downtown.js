// zones/downtown.js: Downtown, in the same shape as every other zone's art.
// (The drawing itself lives in ../downtown.js, ../downtown-obstacles.js and ../traffic.js.)
import { createDowntown as createBackdrop } from '../downtown.js';
import { drawDowntownObstacle } from '../downtown-obstacles.js';
import { createTraffic } from '../traffic.js';
import { snap } from '../strip.js';

export function createDowntown() {
  const backdrop = createBackdrop();
  const traffic = createTraffic();
  let lastTime = null;

  return {
    drawBack(ctx, scroll, time) {
      backdrop.drawBack(ctx, scroll, time);
    },
    // Cars on the road, closest to us of all
    drawFront(ctx, scroll, time) {
      const dt = lastTime === null ? 0 : Math.min(0.1, Math.max(0, time - lastTime));
      lastTime = time;
      traffic.update(dt);
      traffic.draw(ctx, snap);
    },
    drawObstacle(ctx, o, time) {
      drawDowntownObstacle(ctx, o.kind, o.x, o.y, o.w, o.h, time);
    },
  };
}
