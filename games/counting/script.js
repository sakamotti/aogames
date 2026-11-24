(function () {
  KidsApp.initCommon();

  const OBJECT_POOL = ['🍎', '🍓', '🍌', '🐥', '🎈', '⭐', '🍩', '🧸'];

  // かずあそび's guide is ぴょん, as the README's cast table says.
  const host = KidsApp.CHARACTERS.find((c) => c.id === 'usagi');
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
  // All of this game's timers live in one scope, cleared together on
  // pagehide - no ghost timers after leaving mid-celebration.
  const timers = KidsApp.createTimerScope();

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
    // Keep choices inside the range this level actually asks about: at
    // the first level (at most 3 objects) a "4" card only confuses, and
    // with just 3 possible values there are only 3 cards to show.
    const max = MAX_COUNTS[adaptive.level];
    const count = Math.min(4, max);
    const opts = new Set([correct]);
    let guard = 0;
    while (opts.size < count && guard++ < 100) {
      const delta = Math.floor(KidsApp.rand(-3, 4));
      const candidate = correct + delta;
      if (candidate >= 1 && candidate <= max) opts.add(candidate);
    }
    for (let n = 1; opts.size < count && n <= max; n++) opts.add(n);
    return KidsApp.shuffle([...opts]);
  }

  function askQuestion() {
    locked = false;
    target = Math.floor(KidsApp.rand(1, MAX_COUNTS[adaptive.level] + 1));
    currentEmoji = KidsApp.choice(OBJECT_POOL);
    layoutObjects(target, currentEmoji);

    mascot.setText('いくつ あるかな？ かぞえてみよう！');
    KidsApp.speak('いくつ あるかな？', 120);

    optionsEl.innerHTML = '';
    pickOptions(target).forEach((n) => {
      const card = document.createElement('button');
      card.className = 'number-card';
      card.textContent = n;
      card.addEventListener('pointerdown', (e) => {
        // Ignore the palm/extra fingers of a hand holding the tablet.
        if (!e.isPrimary) return;
        onPick(n, card);
      });
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
        timers.setTimeout(() => object.classList.add('counted'), i * 180);
        timers.setTimeout(() => object.classList.remove('counted'), i * 180 + 300);
      });
      const spokenCount = Array.from({ length: target }, (_, i) => i + 1).join('、');
      KidsApp.speak(`${spokenCount}。${target}こ だったね！`);
      // Wait long enough for the counting narration to actually finish
      // at rate 0.85 - the old fixed wait cut it off mid-sentence for
      // targets of 8-10 and jumped to the next question.
      timers.setTimeout(askQuestion, target * 520 + 1800);
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
    timers.clearTimeout(resizeTimer);
    resizeTimer = timers.setTimeout(() => {
      // During the correct-answer celebration a relayout would rebuild
      // the objects and wipe the counting highlight mid-animation.
      if (locked) return;
      layoutObjects(target, currentEmoji);
    }, 200);
  });
})();
