# One Button Chaos

A pixel-art skateboarding game you play with **one button**: Space, a click, or a tap.
You skate through a city, and every 12 seconds the city zone changes, and so does what the button does.

Made by **jshkolnik**.

## The zones

| Zone | Button | What it does |
| --- | --- | --- |
| Downtown | TAP | Ollie over cones, bins and puddles |
| Rooftops | HOLD | Hold longer to jump further over the gaps between buildings |
| Subway | TAP | Flip gravity and ride on the ceiling |
| Construction | HOLD | Duck under swinging beams (your legs get tired if you hold too long) |
| Market Street | TAP | Dash and smash through crates, carts and pigeons |
| Crosswalk | HOLD | Brake and wait while cars cross |
| Park Hill | MASH | Outrun a giant runaway donut |

A sign drops in 2 seconds before each change. The city speeds up 5% every zone.

## The crew and boards

Beat zones to earn coins, then unlock skaters and boards in the shop. Each has a power, and the powers stack.

| Skater | Power |
| --- | --- |
| Jay | Combo King: +150 points per zone |
| Maya | Springy: jumps higher |
| Rosa | Magnet: double coins |
| Kai | Quick: longer dashes and ducks, sharper brakes |
| Zeke | Chill: the city speeds up more slowly |
| Gran Gloria | Old School: slower donut, more time to react |
| Tony | Tough: survives one crash every run |
| Nova | Double Ollie: jump again in mid-air |

| Board | Power |
| --- | --- |
| Classic | Just a really good board |
| Pop Deck | Ollies a little higher |
| Cruiser | +25% score |
| Rocket | Longer dashes, stronger donut pushes |
| Hoverboard | Floats down more slowly |
| Gold Deck | +50% coins |

## Modes

- **Daily Chaos**: everyone gets the same city that day, so scores are fair to compare.
- **Free Play**: a new city every run.

## Run it

You need [Node.js](https://nodejs.org), [Rust](https://rustup.rs) and [wasm-pack](https://rustwasm.github.io/wasm-pack/).

```
npm install
npm run dev
```

The compiled Rust game is already in `core/pkg/`, so if you don't have wasm-pack, `npx vite` works too.

`npm run build` makes a `dist/` folder you can put on GitHub Pages or itch.io.

## How it's built

- **Rust** (`core/`): the game's brain. Physics, the zones, obstacles, scoring and every power. It compiles to WebAssembly.
- **JavaScript** (`src/`): reads the button, draws everything, plays sounds and runs the menus.
- **Pixel art** is all drawn in code: the city zones in `src/art/`, and the skaters and boards by `tools/make_crew.py`.
- **Tests**: `npm test` runs the Rust tests, including a bot that proves every zone can be beaten with every skater and board.
