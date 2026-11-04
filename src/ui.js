// ui.js: the menus that sit on top of the game: the title screen buttons,
// the pause and game over screens, and the "More games" panel.
import { KIND, ZONES } from './world.js';
import { SHARED_RIVER_URL } from './links.js';
import { scoreText } from './hud.js';
import { CREW, BOARDS, crewIndex, boardIndex } from './crew.js';
import { drawLoadoutPreview, drawBoardPreview } from './art/boy.js';
import * as storage from './storage.js';

// Picked at random on the game over screen...
const DEATH_MESSAGES = [
  'Defeated by gravity. Again.',
  'The button was not your friend.',
  'You had ONE job. One button.',
  'The city wins this round.',
  'Bail of the day.',
];

// ...or one about the thing that got you
const KIND_MESSAGES = {
  [KIND.CONE]: 'Beaten by a traffic cone. A CONE.',
  [KIND.HYDRANT]: 'The hydrant did not even flinch.',
  [KIND.BIN]: 'Taken out with the trash.',
  [KIND.PUDDLE]: 'Slipped in a puddle. Very cool.',
  [KIND.GAP]: 'That gap was bigger than it looked.',
  [KIND.AC_UNIT]: 'Chilled out by an air conditioner.',
  [KIND.VENT]: 'Vented.',
  [KIND.BARRIER]: 'The barrier said STOP. You did.',
  [KIND.FLOOR_SPIKES]: 'Spikes: 1. You: 0.',
  [KIND.CEIL_PIPE]: 'Bonked by a pipe. Upside down.',
  [KIND.CEIL_SPIKES]: 'The ceiling had teeth.',
  [KIND.BEAM]: 'Should have ducked.',
  [KIND.BUCKET]: 'Hit by a bucket. Concrete proof.',
  [KIND.CRATES]: 'The crates won. Smash harder.',
  [KIND.CART]: 'Fruit salad.',
  [KIND.BIKE]: 'Parked bikes do not move. Neither do you now.',
  [KIND.PIGEONS]: 'Taken down by pigeons. Legendary.',
  [KIND.JUNCTION]: 'Look both ways next time!',
  [KIND.STALLED_CAR]: 'Rear-ended a broken-down car. It was having a bad day too.',
  [KIND.ROADWORK]: 'Roadworks ahead. Should have read the sign.',
  [KIND.POTHOLE]: 'Swallowed by a pothole.',
  [KIND.WATER_GAP]: 'SPLASH! The sea says hi.',
  [KIND.GULLS]: 'The seagulls wanted your chips.',
  18: 'Eaten by a donut. Ironic.',
};

function deathMessage(kind) {
  if (KIND_MESSAGES[kind] && Math.random() < 0.7) return KIND_MESSAGES[kind];
  return DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
}

const $ = (id) => document.getElementById(id);

// Copies text, with a fallback for older browsers. Returns true if it worked.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const box = document.createElement('textarea');
    box.value = text;
    box.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(box);
    box.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    box.remove();
    return copied;
  }
}

export function createUI({ onChooseMode, onMenu, onToggleMute, onUiSound, onBuy, onWear, onTutorial, onSkipTutorial }) {
  const screens = [$('title-screen'), $('pause-screen'), $('gameover-screen'), $('more-games'), $('shop')];
  let shareText = '';

  // Every "coins" number on screen shows your total
  function showCoins() {
    for (const el of document.querySelectorAll('.coin-count')) el.textContent = storage.coins();
  }

  // The title screen's nameplate: who you skate as, their power, which board
  function showLoadout() {
    const crew = CREW[crewIndex(storage.chosen('crew'))];
    const board = BOARDS[boardIndex(storage.chosen('boards'))];
    $('loadout-name').textContent = crew.name;
    $('loadout-power').textContent = crew.power;
    $('loadout-board').textContent = 'ON ' + board.name;
  }

  // ---------- The shop: CREW and BOARDS ----------
  let tab = 'crew';
  let selected = null; // the card tapped once (tap again to buy)

  function shopMessage(text) {
    $('shop-message').textContent = text;
  }

  function fillShop() {
    showCoins();
    $('tab-crew').classList.toggle('active', tab === 'crew');
    $('tab-boards').classList.toggle('active', tab === 'boards');
    const grid = $('skin-grid');
    grid.textContent = '';
    const list = tab === 'crew' ? CREW : BOARDS;
    const owned = storage.owned(tab);
    const using = storage.chosen(tab);
    const coins = storage.coins();
    list.forEach((item, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'skin-card';
      const has = owned.includes(item.id);
      if (item.id === using) card.classList.add('worn');
      else if (has) card.classList.add('owned');
      else if (coins < item.price) card.classList.add('locked');
      if (item.id === selected) card.classList.add('selected');

      // The picture: the skater on your board, or your skater on the board
      const picture = document.createElement('canvas');
      picture.width = 48;
      picture.height = 46;
      const ctx = picture.getContext('2d');
      if (tab === 'crew') drawLoadoutPreview(ctx, index, boardIndex(storage.chosen('boards')), 'idle_0', 0, -1);
      else drawLoadoutPreview(ctx, crewIndex(storage.chosen('crew')), index, 'ride_0', 0, -1);

      const name = document.createElement('span');
      name.textContent = item.name;
      const power = document.createElement('span');
      power.className = 'power';
      power.textContent = item.power;
      const price = document.createElement('span');
      price.className = 'price';
      if (item.id === using) price.textContent = 'USING';
      else if (has) price.textContent = 'OWNED';
      else {
        const coin = document.createElement('span');
        coin.className = 'coin';
        price.append(coin, ' ' + item.price);
      }
      card.append(picture, name, power, price);
      card.addEventListener('click', () => pick(item));
      grid.append(card);
    });
  }

  // Tap once to read what it does, tap again to buy (or tap an owned one to use it)
  function pick(item) {
    const has = storage.owned(tab).includes(item.id);
    if (has) {
      storage.choose(tab, item.id);
      selected = null;
      onWear();
      shopMessage(item.name + ': ' + item.about);
    } else if (selected !== item.id) {
      selected = item.id;
      onUiSound();
      const left = item.price - storage.coins();
      shopMessage(item.name + ': ' + item.about + (left > 0 ? ' \u00b7 NEED ' + left + ' MORE COINS' : ' \u00b7 TAP AGAIN TO BUY'));
    } else if (storage.spendCoins(item.price)) {
      storage.unlock(tab, item.id);
      storage.choose(tab, item.id);
      selected = null;
      onBuy();
      shopMessage('UNLOCKED ' + item.name + '! ' + item.about);
    } else {
      onUiSound();
      shopMessage('NEED ' + (item.price - storage.coins()) + ' MORE COINS FOR ' + item.name);
    }
    fillShop();
  }

  for (const [id, name] of [['tab-crew', 'crew'], ['tab-boards', 'boards']]) {
    $(id).addEventListener('click', () => {
      tab = name;
      selected = null;
      onUiSound();
      shopMessage(name === 'crew' ? 'EVERY SKATER HAS A POWER' : 'BOARDS HAVE POWERS TOO, AND THEY STACK');
      fillShop();
    });
  }

  for (const button of document.querySelectorAll('.shop-button')) {
    button.addEventListener('click', () => {
      onUiSound();
      selected = null;
      shopMessage(storage.coins() > 0 ? 'TAP A CARD TO SEE ITS POWER' : 'BEAT ZONES TO EARN COINS');
      fillShop();
      $('shop').hidden = false;
      $('close-shop').focus();
    });
  }
  $('close-shop').addEventListener('click', () => {
    onUiSound();
    $('shop').hidden = true;
    showCoins();
    showLoadout();
  });

  function hideAll() {
    for (const screen of screens) screen.hidden = true;
    $('tutorial-bar').hidden = true;
  }

  $('play-tutorial').addEventListener('click', () => onTutorial());
  $('skip-tutorial').addEventListener('click', () => onSkipTutorial());
  $('play-daily').addEventListener('click', () => onChooseMode('daily'));
  $('play-free').addEventListener('click', () => onChooseMode('free'));
  $('menu-button').addEventListener('click', () => onMenu());
  for (const button of document.querySelectorAll('.mute-button')) {
    button.addEventListener('click', () => onToggleMute());
  }

  $('copy-button').addEventListener('click', async () => {
    const copied = await copyText(shareText);
    onUiSound();
    $('copy-button').textContent = copied ? 'COPIED!' : 'COPY FAILED';
    $('share-text').hidden = copied; // if copying failed, show the text to copy by hand
    setTimeout(() => ($('copy-button').textContent = 'COPY RESULT'), 1500);
  });

  // "More games by jshkolnik" panel
  for (const button of document.querySelectorAll('.more-games-button')) {
    button.addEventListener('click', () => {
      onUiSound();
      $('more-games').hidden = false;
      $('close-more-games').focus();
    });
  }
  $('close-more-games').addEventListener('click', () => ($('more-games').hidden = true));
  if (SHARED_RIVER_URL) {
    $('shared-river-link').href = SHARED_RIVER_URL;
    $('shared-river-link').hidden = false;
  }

  return {
    hideAll,
    isPanelOpen: () => !$('more-games').hidden || !$('shop').hidden,
    loadout: () => ({ crew: storage.chosen('crew'), board: storage.chosen('boards') }),

    setMuteLabels(muted) {
      for (const button of document.querySelectorAll('.mute-button')) {
        button.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
      }
    },

    showTitle({ best, dailyBest, day }) {
      hideAll();
      $('daily-day').textContent = day.toUpperCase();
      $('best-score').textContent = scoreText(best);
      $('daily-best').textContent = scoreText(dailyBest);
      showCoins();
      showLoadout();
      $('title-screen').hidden = false;
    },

    showTutorialBar() {
      hideAll();
      $('tutorial-bar').hidden = false;
    },

    showPause() {
      hideAll();
      $('pause-screen').hidden = false;
    },

    showGameOver(run) {
      hideAll();
      $('death-message').textContent = deathMessage(run.deathKind);
      $('final-score').textContent = scoreText(run.score);
      $('new-best').hidden = !run.newBest;
      $('run-best').textContent = scoreText(run.best);
      $('death-zone').textContent = ZONES[run.deathZone].name.toUpperCase();
      $('run-coins').textContent = run.coins;
      showCoins();

      // "Copy result" is only for Daily Chaos, where everyone played the same run
      shareText = run.shareText || '';
      $('copy-button').hidden = !run.shareText;
      $('copy-button').textContent = 'COPY RESULT';
      $('share-text').textContent = shareText;
      $('share-text').hidden = true;
      $('gameover-screen').hidden = false;
    },
  };
}
