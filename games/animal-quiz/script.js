(function () {
  KidsApp.initCommon();

  const ANIMALS = [
    { emoji: '🐶', name: 'いぬ', sound: 'わんわん' },
    { emoji: '🐱', name: 'ねこ', sound: 'にゃーん' },
    { emoji: '🐮', name: 'うし', sound: 'もーう' },
    { emoji: '🐸', name: 'かえる', sound: 'げこげこ' },
    { emoji: '🐷', name: 'ぶた', sound: 'ぶーぶー' },
    { emoji: '🐔', name: 'にわとり', sound: 'こけこっこー' },
    { emoji: '🦁', name: 'らいおん', sound: 'がおー' },
    { emoji: '🐘', name: 'ぞう', sound: 'ぱおーん' },
    { emoji: '🐑', name: 'ひつじ', sound: 'めーめー' },
  ];

  const host = KidsApp.choice(KidsApp.CHARACTERS);
  const mascot = KidsApp.mascotBubble(document.getElementById('mascotHost'), {
    img: host.img,
    name: host.name,
    text: '',
  });

  const optionsEl = document.getElementById('options');
  let target = null;
  let locked = false;

  function shuffle(arr) {
    return arr
      .map((v) => [Math.random(), v])
      .sort((a, b) => a[0] - b[0])
      .map((v) => v[1]);
  }

  function askQuestion() {
    locked = false;
    target = KidsApp.choice(ANIMALS);
    const distractors = shuffle(ANIMALS.filter((a) => a !== target)).slice(0, 3);
    const options = shuffle([target, ...distractors]);

    optionsEl.innerHTML = '';
    options.forEach((animal) => {
      const card = document.createElement('button');
      card.className = 'option-card';
      card.textContent = animal.emoji;
      card.addEventListener('pointerdown', () => onPick(animal, card));
      optionsEl.appendChild(card);
    });

    const prompt = `「${target.sound}」って なくのは だれかな？`;
    mascot.setText(prompt);
    setTimeout(() => KidsApp.speak(target.sound + '。 だれの こえかな？'), 300);
  }

  function onPick(animal, card) {
    if (locked) return;
    if (animal === target) {
      locked = true;
      card.classList.add('choice-correct');
      [...optionsEl.children].forEach((c) => {
        if (c !== card) c.classList.add('choice-dim');
      });
      KidsApp.Sound.success();
      const rect = card.getBoundingClientRect();
      KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 16);
      mascot.setText(`せいかい！「${target.name}」だね！`);
      KidsApp.speak('せいかい！ やったね！');
      setTimeout(askQuestion, 2500);
    } else {
      card.classList.remove('shake-x');
      void card.offsetWidth;
      card.classList.add('shake-x');
      KidsApp.Sound.tap();
      mascot.setText(`「${target.sound}」は どれかな？`);
    }
  }

  askQuestion();
})();
