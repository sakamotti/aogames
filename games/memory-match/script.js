(function () {
  KidsApp.initCommon();

  const EMOJI_POOL = ['🍎', '🍌', '🍇', '🍓', '🍊', '🥕', '🐶', '🐱', '🐸', '🦋', '🌸', '⭐'];
  const EMOJI_NAMES = {
    '🍎': 'りんご', '🍌': 'ばなな', '🍇': 'ぶどう', '🍓': 'いちご',
    '🍊': 'みかん', '🥕': 'にんじん', '🐶': 'いぬ', '🐱': 'ねこ',
    '🐸': 'かえる', '🦋': 'ちょうちょ', '🌸': 'おはな', '⭐': 'ほし',
  };
  const PAIR_COUNTS = [2, 3, 4, 6];
  const adaptive = KidsApp.createAdaptive('memory-match', PAIR_COUNTS.length);

  const grid = document.getElementById('grid');
  let cards = [];
  let firstCard = null;
  let locked = false;
  let matchedCount = 0;
  let currentPairCount = PAIR_COUNTS[0];

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

    currentPairCount = PAIR_COUNTS[adaptive.level];
    grid.style.gridTemplateColumns = `repeat(${currentPairCount <= 2 ? 2 : currentPairCount === 3 ? 3 : 4}, minmax(60px, 1fr))`;
    grid.style.maxWidth = currentPairCount <= 2 ? '340px' : currentPairCount === 3 ? '470px' : '620px';
    const chosen = shuffle(EMOJI_POOL).slice(0, currentPairCount);
    const deck = shuffle([...chosen, ...chosen]);

    cards = deck.map((emoji) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.setAttribute('aria-label', 'カードをめくる');
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

    if (adaptive.level <= 1) {
      locked = true;
      cards.forEach((card) => flip(card, true));
      setTimeout(() => {
        cards.forEach((card) => flip(card, false));
        locked = false;
      }, 900);
    }
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
      KidsApp.speak(EMOJI_NAMES[card.emoji] + '、そろったね！');
      const rect = card.el.getBoundingClientRect();
      KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 12);
      matchedCount++;
      firstCard = null;
      locked = false;
      if (matchedCount === currentPairCount) {
        adaptive.record(true);
        setTimeout(() => {
          KidsApp.Sound.success();
          KidsApp.speak('ぜんぶ そろったね！');
          const w = window.innerWidth, h = window.innerHeight;
          KidsApp.confettiBurst(document.body, w * 0.3, h * 0.35, 16);
          KidsApp.confettiBurst(document.body, w * 0.7, h * 0.35, 16);
        }, 150);
        setTimeout(build, 2500);
      }
    } else {
      adaptive.record(false);
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
