// traffic.js: cars zooming along the road in front of the pavement.
// They're just for looks (the boy runs on the pavement, so they can't hit
// him), which is why they use Math.random() instead of the game's seed.
import { WIDTH } from '../world.js';
import { P } from './palette.js';
import { makeCanvas, rect, circle } from './pixel.js';

const CAR_W = 60;
const CAR_H = 24;

const PAINT = [
  { body: '#3fb8aa', light: '#7fe0d4', shade: '#2a7f78' }, // teal
  { body: '#e0474c', light: '#ff8a80', shade: '#a3303d' }, // red
  { body: '#ffc94a', light: '#ffe39a', shade: '#c9932a', taxi: true }, // taxi
  { body: '#7b6cff', light: '#a99cff', shade: '#5446c4' }, // purple
];

// Draws one car facing right, pixel by pixel
function makeCar({ body, light, shade, taxi }) {
  const [canvas, ctx] = makeCanvas(CAR_W, CAR_H);
  // Cabin: a sloped roof with two windows (they reflect the sunset)
  for (let row = 0; row <= 8; row++) {
    const left = 19 - Math.floor(row * 0.9);
    const right = 40 + Math.floor(row * 0.8);
    rect(ctx, left, 2 + row, right - left, 1, P.outline);
    if (row > 0) rect(ctx, left + 1, 2 + row, right - left - 2, 1, row < 7 ? '#f7c6b0' : body);
  }
  rect(ctx, 20, 3, 20, 1, light); // roof shine
  rect(ctx, 29, 3, 2, 7, body); // the pillar between the windows
  rect(ctx, 22, 4, 3, 1, '#ffe4d6'); // glint on the glass
  if (taxi) {
    rect(ctx, 25, 0, 10, 3, P.outline);
    rect(ctx, 26, 0, 8, 2, '#fff2b0');
  }
  // Body
  rect(ctx, 1, 10, 58, 10, P.outline);
  rect(ctx, 2, 11, 56, 8, body);
  rect(ctx, 2, 11, 56, 1, light);
  rect(ctx, 2, 17, 56, 2, shade);
  rect(ctx, 30, 11, 1, 7, shade); // door line
  rect(ctx, 33, 13, 3, 1, P.outline); // door handle
  rect(ctx, 55, 12, 3, 2, '#fff4c9'); // headlight
  rect(ctx, 2, 12, 2, 2, '#ff4d6d'); // tail light
  rect(ctx, 1, 18, 4, 2, '#5e5580'); // bumpers
  rect(ctx, 55, 18, 4, 2, '#5e5580');
  // Wheels in their arches
  for (const wx of [14, 46]) {
    circle(ctx, wx, 18, 6, P.outline);
    circle(ctx, wx, 18, 4, '#2b2440');
    circle(ctx, wx, 18, 2, '#9a90b6');
    rect(ctx, wx, 18, 1, 1, '#d9d2ea');
  }
  return canvas;
}

const SPRITES = PAINT.map(makeCar);

export function createTraffic() {
  let cars = [];
  let wait = 1.2;

  return {
    reset() {
      cars = [];
      wait = 1.2;
    },

    // Cars come up from behind the boy and zoom past him
    update(dt) {
      wait -= dt;
      const lastCar = cars[cars.length - 1];
      if (wait <= 0 && (!lastCar || lastCar.x > 40)) {
        cars.push({
          sprite: SPRITES[Math.floor(Math.random() * SPRITES.length)],
          x: -CAR_W,
          speed: 90 + Math.random() * 50, // faster than him, on screen
        });
        wait = 2 + Math.random() * 4;
      }
      for (const car of cars) car.x += car.speed * dt;
      cars = cars.filter((car) => car.x < WIDTH + 4);
    },

    // Drawn last in the world: they're the closest thing to us, so the bottom
    // edge of the screen cuts off their wheels a little
    draw(ctx, snap = Math.round) {
      for (const car of cars) ctx.drawImage(car.sprite, snap(car.x), 249);
    },
  };
}
