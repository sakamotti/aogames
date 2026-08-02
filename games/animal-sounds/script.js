(function () {
  KidsApp.initCommon();

  const ANIMALS = [
    { emoji: '🐶', sound: 'わんわん！', sfx: 'dog', color: 'var(--orange)' },
    { emoji: '🐱', sound: 'にゃーん！', sfx: 'cat', color: 'var(--pink)' },
    { emoji: '🐮', sound: 'もーう！', sfx: 'cow', color: 'var(--purple)' },
    { emoji: '🐸', sound: 'げこげこ！', sfx: 'frog', color: 'var(--green)' },
    { emoji: '🐷', sound: 'ぶーぶー！', sfx: 'pig', color: 'var(--coral)' },
    { emoji: '🐔', sound: 'こけこっこー！', sfx: 'chicken', color: 'var(--yellow)' },
    { emoji: '🦁', sound: 'がおー！', sfx: 'lion', color: 'var(--blue)' },
    { emoji: '🐘', sound: 'ぱおーん！', sfx: 'elephant', color: 'var(--teal)' },
    { emoji: '🐑', sound: 'めーめー！', sfx: 'sheep', color: 'var(--pink)' },
  ];

  const grid = document.getElementById('grid');

  ANIMALS.forEach((a) => {
    const card = document.createElement('button');
    card.className = 'animal-card';
    card.style.setProperty('--card-color', a.color);
    card.textContent = a.emoji;
    card.setAttribute('aria-label', a.sound);
    card.addEventListener('pointerdown', () => {
      card.classList.remove('bounce');
      // restart animation
      void card.offsetWidth;
      card.classList.add('bounce');
      KidsApp.AnimalSounds[a.sfx]();
      const rect = card.getBoundingClientRect();
      KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 10);
    });
    grid.appendChild(card);
  });
})();
