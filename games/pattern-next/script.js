(function () {
  KidsApp.initCommon();

  const SETS = [
    ['🍎', '🍌', '🍇'],
    ['⭐', '🌙', '☀️'],
    ['🐶', '🐱', '🐸'],
    ['🚗', '🚲', '🚌'],
    ['🔴', '🔷', '🟨'],
  ];
  const adaptive = KidsApp.createAdaptive('pattern-next', 3);
  const host = KidsApp.choice(KidsApp.CHARACTERS);
  const mascot = KidsApp.mascotBubble(document.getElementById('mascotHost'), {
    img: host.img,
    name: host.name,
    text: 'つぎは どれかな？',
  });
  const sequenceEl = document.getElementById('sequence');
  const optionsEl = document.getElementById('options');
  let answer = '';
  let locked = false;

  function shuffle(array) {
    return array.map((value) => [Math.random(), value]).sort((a, b) => a[0] - b[0]).map((item) => item[1]);
  }

  function makePattern(symbols) {
    if (adaptive.level === 0) {
      return KidsApp.choice([
        [symbols[0], symbols[1], symbols[0], symbols[1], symbols[0]],
        [symbols[1], symbols[0], symbols[1], symbols[0], symbols[1]],
      ]);
    }
    if (adaptive.level === 1) {
      return KidsApp.choice([
        [symbols[0], symbols[0], symbols[1], symbols[0], symbols[0], symbols[1]],
        [symbols[0], symbols[1], symbols[1], symbols[0], symbols[1], symbols[1]],
      ]);
    }
    return [symbols[0], symbols[1], symbols[2], symbols[0], symbols[1], symbols[2]];
  }

  function build() {
    locked = false;
    sequenceEl.innerHTML = '';
    optionsEl.innerHTML = '';
    const symbols = KidsApp.choice(SETS);
    const pattern = makePattern(symbols);
    answer = pattern[pattern.length - 1];

    pattern.slice(0, -1).forEach((symbol) => {
      const item = document.createElement('div');
      item.className = 'sequence-item';
      item.textContent = symbol;
      sequenceEl.appendChild(item);
    });
    const missing = document.createElement('div');
    missing.className = 'sequence-item missing';
    missing.textContent = '？';
    sequenceEl.appendChild(missing);

    shuffle(symbols).forEach((symbol) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'pattern-option';
      option.textContent = symbol;
      option.setAttribute('aria-label', symbol + 'をえらぶ');
      option.addEventListener('pointerdown', () => choose(symbol, option, missing));
      optionsEl.appendChild(option);
    });
    mascot.setText('ならびかたを みてね。つぎは どれかな？');
    setTimeout(() => KidsApp.speak('ならびかたを みてね。つぎは どれかな？'), 250);
  }

  function choose(symbol, option, missing) {
    if (locked) return;
    if (symbol === answer) {
      locked = true;
      adaptive.record(true);
      option.classList.add('choice-correct');
      missing.textContent = answer;
      missing.classList.remove('missing');
      KidsApp.Sound.success();
      const rect = missing.getBoundingClientRect();
      KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 18);
      mascot.setText('せいかい！ きれいに ならんだね！');
      KidsApp.speak('せいかい！ きれいに ならんだね！');
      setTimeout(build, 2400);
    } else {
      adaptive.record(false);
      option.classList.remove('shake-x');
      void option.offsetWidth;
      option.classList.add('shake-x');
      KidsApp.Sound.tap();
      mascot.setText('さいしょから じゅんばんに みてみよう');
      KidsApp.speak('さいしょから じゅんばんに みてみよう');
    }
  }

  build();
})();
