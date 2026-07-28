(function () {
  KidsApp.initCommon();

  const ANIMALS = [
    { emoji: '🐶', sound: 'わんわん！', color: 'var(--orange)' },
    { emoji: '🐱', sound: 'にゃーん！', color: 'var(--pink)' },
    { emoji: '🐮', sound: 'もーう！', color: 'var(--purple)' },
    { emoji: '🐸', sound: 'げこげこ！', color: 'var(--green)' },
    { emoji: '🐷', sound: 'ぶーぶー！', color: 'var(--coral)' },
    { emoji: '🐔', sound: 'こけこっこー！', color: 'var(--yellow)' },
    { emoji: '🦁', sound: 'がおー！', color: 'var(--blue)' },
    { emoji: '🐘', sound: 'ぱおーん！', color: 'var(--teal)' },
    { emoji: '🐑', sound: 'めーめー！', color: 'var(--pink)' },
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
      KidsApp.Sound.boing();
      KidsApp.speak(a.sound);
      const rect = card.getBoundingClientRect();
      KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 10);
    });
    grid.appendChild(card);
  });
})();
