(function () {
  KidsApp.initCommon();

  const ANIMALS = [
    { img: '../../icons/animals/dog.png', sound: 'わんわん！', sfx: 'dog', color: 'var(--orange)' },
    { img: '../../icons/animals/cat.png', sound: 'にゃーん！', sfx: 'cat', color: 'var(--pink)' },
    { img: '../../icons/animals/cow.png', sound: 'もーう！', sfx: 'cow', color: 'var(--purple)' },
    { img: '../../icons/animals/frog.png', sound: 'げこげこ！', sfx: 'frog', color: 'var(--green)' },
    { img: '../../icons/animals/pig.png', sound: 'ぶーぶー！', sfx: 'pig', color: 'var(--coral)' },
    { img: '../../icons/animals/chicken.png', sound: 'こけこっこー！', sfx: 'chicken', color: 'var(--yellow)' },
    { img: '../../icons/animals/lion.png', sound: 'がおー！', sfx: 'lion', color: 'var(--blue)' },
    { img: '../../icons/animals/elephant.png', sound: 'ぱおーん！', sfx: 'elephant', color: 'var(--teal)' },
    { img: '../../icons/animals/sheep.png', sound: 'めーめー！', sfx: 'sheep', color: 'var(--pink)' },
  ];

  const grid = document.getElementById('grid');

  ANIMALS.forEach((a) => {
    const card = document.createElement('button');
    card.className = 'animal-card';
    card.style.setProperty('--card-color', a.color);
    card.innerHTML = `<img class="animal-card__img" src="${a.img}" alt="">`;
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
