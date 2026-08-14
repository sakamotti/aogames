(function () {
  KidsApp.initCommon();

  const ANIMALS = [
    { img: '../../icons/animals/dog.png', name: 'いぬ', sound: 'わんわん', sfx: 'dog' },
    { img: '../../icons/animals/cat.png', name: 'ねこ', sound: 'にゃーん', sfx: 'cat' },
    { img: '../../icons/animals/cow.png', name: 'うし', sound: 'もーう', sfx: 'cow' },
    { img: '../../icons/animals/frog.png', name: 'かえる', sound: 'げこげこ', sfx: 'frog' },
    { img: '../../icons/animals/pig.png', name: 'ぶた', sound: 'ぶーぶー', sfx: 'pig' },
    { img: '../../icons/animals/chicken.png', name: 'にわとり', sound: 'こけこっこー', sfx: 'chicken' },
    { img: '../../icons/animals/lion.png', name: 'らいおん', sound: 'がおー', sfx: 'lion' },
    { img: '../../icons/animals/elephant.png', name: 'ぞう', sound: 'ぱおーん', sfx: 'elephant' },
    { img: '../../icons/animals/sheep.png', name: 'ひつじ', sound: 'めーめー', sfx: 'sheep' },
  ];

  const host = KidsApp.choice(KidsApp.CHARACTERS);
  const mascot = KidsApp.mascotBubble(document.getElementById('mascotHost'), {
    img: host.img,
    name: host.name,
    text: '',
  });

  const optionsEl = document.getElementById('options');
  const repeatSound = document.getElementById('repeatSound');
  const OPTION_COUNTS = [2, 3, 4];
  const adaptive = KidsApp.createAdaptive('animal-quiz', OPTION_COUNTS.length);
  let target = null;
  let previousTarget = null;
  let locked = false;
  let questionSequence = 0;

  function shuffle(arr) {
    return arr
      .map((v) => [Math.random(), v])
      .sort((a, b) => a[0] - b[0])
      .map((v) => v[1]);
  }

  function askQuestion() {
    const sequence = ++questionSequence;
    locked = false;
    const candidates = ANIMALS.filter((a) => a !== previousTarget);
    target = KidsApp.choice(candidates);
    previousTarget = target;
    const optionCount = OPTION_COUNTS[adaptive.level];
    const distractors = shuffle(ANIMALS.filter((a) => a !== target)).slice(0, optionCount - 1);
    const options = shuffle([target, ...distractors]);

    optionsEl.innerHTML = '';
    options.forEach((animal) => {
      const card = document.createElement('button');
      card.className = 'option-card';
      card.innerHTML = `<img class="option-card__img" src="${animal.img}" alt="${animal.name}">`;
      card.setAttribute('aria-label', animal.name);
      card.addEventListener('pointerdown', () => onPick(animal, card));
      optionsEl.appendChild(card);
    });

    const prompt = `「${target.sound}」って なくのは だれかな？`;
    mascot.setText(prompt);
    setTimeout(() => {
      if (sequence !== questionSequence || locked) return;
      KidsApp.AnimalSounds[target.sfx]();
      KidsApp.speak('だれの こえかな？', 320);
    }, 120);
  }

  function onPick(animal, card) {
    if (locked) return;
    if (animal === target) {
      locked = true;
      questionSequence++;
      card.classList.add('choice-correct');
      [...optionsEl.children].forEach((c) => {
        if (c !== card) c.classList.add('choice-dim');
      });
      KidsApp.Sound.success();
      adaptive.record(true);
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
      adaptive.record(false);
      mascot.setText(`「${target.sound}」は どれかな？`);
      KidsApp.AnimalSounds[target.sfx]();
    }
  }

  repeatSound.addEventListener('pointerdown', () => {
    if (!target) return;
    KidsApp.AnimalSounds[target.sfx]();
    KidsApp.speak('だれの こえかな？', 300);
  });

  askQuestion();
})();
