(function () {
  KidsApp.initCommon();

  const EMOJI_POOL = ['🍎', '🍌', '🍇', '🍓', '🍊', '🥕', '🐶', '🐱', '🐸', '🦋', '🌸', '⭐'];
  const PAIR_COUNT = 6;

  const grid = document.getElementById('grid');
  let cards = [];
  let firstCard = null;
  let locked = false;
  let matchedCount = 0;

  function shuffle(arr) {
    return arr
      .map((v) => [Math.random(), v])
      .sort((a, b) => a[0] - b[0])
      .map((v) => v[1]);
  }

  function build() {
    grid.innerHTML = '';
    firstCard = null;
    locked = false;
    matchedCount = 0;

    const chosen = shuffle(EMOJI_POOL).slice(0, PAIR_COUNT);
    const deck = shuffle([...chosen, ...chosen]);

    cards = deck.map((emoji) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-front">★</div>
          <div class="card-face card-back">${emoji}</div>
        </div>`;
      grid.appendChild(card);
      const state = { emoji, el: card, flipped: false, matched: false };
      card.addEventListener('pointerdown', () => onTap(state));
      return state;
    });
  }

  function onTap(card) {
    if (locked || card.flipped || card.matched) return;
    flip(card, true);
    KidsApp.Sound.tap();

    if (!firstCard) {
      firstCard = card;
      return;
    }

    locked = true;
    if (card.emoji === firstCard.emoji) {
      card.matched = true;
      firstCard.matched = true;
      card.el.classList.add('matched');
      firstCard.el.classList.add('matched');
      KidsApp.Sound.chime();
      const rect = card.el.getBoundingClientRect();
      KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 12);
      matchedCount++;
      firstCard = null;
      locked = false;
      if (matchedCount === PAIR_COUNT) {
        setTimeout(() => {
          KidsApp.Sound.success();
          KidsApp.speak('ぜんぶ そろったね！');
          const w = window.innerWidth, h = window.innerHeight;
          KidsApp.confettiBurst(document.body, w * 0.3, h * 0.35, 16);
          KidsApp.confettiBurst(document.body, w * 0.7, h * 0.35, 16);
        }, 150);
        setTimeout(build, 2000);
      }
    } else {
      const second = card;
      const first = firstCard;
      setTimeout(() => {
        flip(first, false);
        flip(second, false);
        firstCard = null;
        locked = false;
      }, 700);
    }
  }

  function flip(card, on) {
    card.flipped = on;
    card.el.classList.toggle('flipped', on);
  }

  build();
})();
