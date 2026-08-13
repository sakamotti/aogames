(function () {
  KidsApp.initCommon();

  const OBJECT_POOL = ['🍎', '🍓', '🍌', '🐥', '🎈', '⭐', '🍩', '🧸'];

  const host = KidsApp.choice(KidsApp.CHARACTERS);
  const mascot = KidsApp.mascotBubble(document.getElementById('mascotHost'), {
    img: host.img,
    name: host.name,
    text: '',
  });

  const area = document.getElementById('area');
  const optionsEl = document.getElementById('options');

  let target = 0;
  let currentEmoji = OBJECT_POOL[0];
  let locked = false;
  const MAX_COUNTS = [3, 5, 10];
  const adaptive = KidsApp.createAdaptive('counting', MAX_COUNTS.length);

  function shuffle(arr) {
    return arr
      .map((v) => [Math.random(), v])
      .sort((a, b) => a[0] - b[0])
      .map((v) => v[1]);
  }

  function layoutObjects(count, emoji) {
    area.innerHTML = '';
    const w = area.clientWidth || 300;
    const h = area.clientHeight || 300;
    const placed = [];
    const minDist = Math.min(w, h) / (count > 6 ? 4.4 : 3.4);
    for (let i = 0; i < count; i++) {
      let x, y, tries = 0;
      do {
        x = KidsApp.rand(w * 0.12, w * 0.88);
        y = KidsApp.rand(h * 0.12, h * 0.88);
        tries++;
      } while (tries < 50 && placed.some((p) => Math.hypot(p.x - x, p.y - y) < minDist));
      placed.push({ x, y });
      const span = document.createElement('span');
      span.textContent = emoji;
      span.style.left = x + 'px';
      span.style.top = y + 'px';
      span.dataset.order = String(i + 1);
      area.appendChild(span);
    }
  }

  function pickOptions(correct) {
    const opts = new Set([correct]);
    while (opts.size < 4) {
      const delta = Math.floor(KidsApp.rand(-3, 4));
      const candidate = correct + delta;
      if (candidate >= 1 && candidate <= 10) opts.add(candidate);
    }
    return shuffle([...opts]);
  }

  function askQuestion() {
    locked = false;
    target = Math.floor(KidsApp.rand(1, MAX_COUNTS[adaptive.level] + 1));
    currentEmoji = KidsApp.choice(OBJECT_POOL);
    layoutObjects(target, currentEmoji);

    mascot.setText('いくつ あるかな？ かぞえてみよう！');
    setTimeout(() => KidsApp.speak('いくつ あるかな？'), 300);

    optionsEl.innerHTML = '';
    pickOptions(target).forEach((n) => {
      const card = document.createElement('button');
      card.className = 'number-card';
      card.textContent = n;
      card.addEventListener('pointerdown', () => onPick(n, card));
      optionsEl.appendChild(card);
    });
  }

  function onPick(n, card) {
    if (locked) return;
    if (n === target) {
      locked = true;
      card.classList.add('choice-correct');
      [...optionsEl.children].forEach((c) => {
        if (c !== card) c.classList.add('choice-dim');
      });
      KidsApp.Sound.success();
      adaptive.record(true);
      const rect = card.getBoundingClientRect();
      KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 16);
      mascot.setText(`いっしょに かぞえよう！ ${target}こ だね！`);
      const objects = [...area.children];
      objects.forEach((object, i) => {
        setTimeout(() => object.classList.add('counted'), i * 180);
        setTimeout(() => object.classList.remove('counted'), i * 180 + 300);
      });
      const spokenCount = Array.from({ length: target }, (_, i) => i + 1).join('、');
      KidsApp.speak(`${spokenCount}。${target}こ だったね！`);
      setTimeout(askQuestion, target * 180 + 1600);
    } else {
      card.classList.remove('shake-x');
      void card.offsetWidth;
      card.classList.add('shake-x');
      KidsApp.Sound.tap();
      adaptive.record(false);
    }
  }

  askQuestion();
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => layoutObjects(target, currentEmoji), 200);
  });
})();
