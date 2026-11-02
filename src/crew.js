// crew.js: the skaters and skateboards you can unlock in the shop, and what
// each one is good at. The order matches core/src/perks.rs and the rows in
// assets/sprites/crew.png and boards.png (made by tools/make_crew.py).

export const CREW = [
  { id: 'jay', name: 'JAY', price: 0, power: 'COMBO KING', about: '+150 POINTS PER ZONE INSTEAD OF +100' },
  { id: 'maya', name: 'MAYA', price: 100, power: 'SPRINGY', about: 'OLLIES AND BIG JUMPS GO HIGHER' },
  { id: 'rosa', name: 'ROSA', price: 150, power: 'MAGNET', about: 'EARNS DOUBLE COINS' },
  { id: 'kai', name: 'KAI', price: 200, power: 'QUICK', about: 'LONGER DASHES AND DUCKS, SHARPER BRAKES' },
  { id: 'zeke', name: 'ZEKE', price: 250, power: 'CHILL', about: 'THE CITY SPEEDS UP MORE SLOWLY' },
  { id: 'gloria', name: 'GRAN GLORIA', price: 300, power: 'OLD SCHOOL', about: 'SLOWER DONUT, MORE TIME TO REACT' },
  { id: 'tony', name: 'TONY', price: 400, power: 'TOUGH', about: 'SURVIVES ONE CRASH EVERY RUN' },
  { id: 'nova', name: 'NOVA', price: 600, power: 'DOUBLE OLLIE', about: 'TAP AGAIN IN THE AIR TO JUMP AGAIN' },
];

export const BOARDS = [
  { id: 'classic', name: 'CLASSIC', price: 0, power: 'TRUSTY', about: 'JUST A REALLY GOOD BOARD' },
  { id: 'pop', name: 'POP DECK', price: 80, power: 'POP', about: 'OLLIES A LITTLE HIGHER' },
  { id: 'cruiser', name: 'CRUISER', price: 150, power: 'CRUISE', about: '+25% SCORE' },
  { id: 'rocket', name: 'ROCKET', price: 220, power: 'BOOST', about: 'LONGER DASHES, STRONGER DONUT PUSHES' },
  { id: 'hover', name: 'HOVERBOARD', price: 300, power: 'FLOATY', about: 'FLOATS DOWN MORE SLOWLY' },
  { id: 'gold', name: 'GOLD DECK', price: 600, power: 'RICH', about: '+50% COINS' },
];

export function crewIndex(id) {
  return Math.max(0, CREW.findIndex((c) => c.id === id));
}

export function boardIndex(id) {
  return Math.max(0, BOARDS.findIndex((b) => b.id === id));
}

// Coins: 5 for every zone you beat, plus 1 more for every 3 zones already
// beaten in this run (long runs pay better), and 1 for each thing you smash.
export function coinsForZone(zonesBeaten) {
  return 5 + Math.floor((zonesBeaten - 1) / 3);
}
export const COINS_PER_SMASH = 1;

// Rosa doubles coins, the Gold Deck adds half again
export function coinMultiplier(crewId, boardId) {
  return (crewId === 'rosa' ? 2 : 1) * (boardId === 'gold' ? 1.5 : 1);
}
