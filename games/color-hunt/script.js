(function () {
  KidsApp.initCommon();

  const board = document.getElementById('board');
  const promptSwatch = document.getElementById('promptSwatch');
  const promptText = document.getElementById('promptText');

  const POOL = [
    { name: 'あか', hex: '#ff5a5a' },
    { name: 'あお', hex: '#4ea8de' },
    { name: 'みずいろ', hex: '#7ecbf0' },
    { name: 'きいろ', hex: '#ffd23f' },
    { name: 'みどり', hex: '#06d6a0' },
    { name: 'きみどり', hex: '#b0e04c' },
    { name: 'ピンク', hex: '#ff6fa5' },
    { name: 'むらさき', hex: '#a78bfa' },
    { name: 'オレンジ', hex: '#ffb84d' },
    { name: 'ちゃいろ', hex: '#a97452' },
  ];

  let blobs = [];
  let target = null;
  let previousTarget = null;
  let locked = false;
  const LEVELS = [
    { count: 3, names: ['あか', 'あお', 'きいろ', 'みどり'] },
    { count: 5, names: ['あか', 'あお', 'きいろ', 'みどり', 'ピンク', 'むらさき', 'オレンジ'] },
    { count: 8, names: POOL.map((color) => color.name) },
  ];
  const adaptive = KidsApp.createAdaptive('color-hunt', LEVELS.length);

  function shuffle(arr) {
    return arr
      .map((v) => [Math.random(), v])
      .sort((a, b) => a[0] - b[0])
      .map((v) => v[1]);
  }

  function layout() {
    board.innerHTML = '';
    blobs = [];
    const w = board.clientWidth;
    const h = board.clientHeight;
    const level = LEVELS[adaptive.level];
    const size = Math.max(58, Math.min(150, Math.min(w, h) * (level.count <= 3 ? 0.28 : 0.21)));
    const pool = POOL.filter((color) => level.names.includes(color.name));
    const chosen = shuffle(pool).slice(0, level.count);
    const placed = [];

    chosen.forEach((c) => {
      let x, y, tries = 0;
      do {
        x = KidsApp.rand(size * 0.6, w - size * 0.6);
        y = KidsApp.rand(size * 0.6, h - size * 0.6);
        tries++;
      } while (tries < 60 && placed.some((p) => Math.hypot(p.x - x, p.y - y) < size * 1.02));
      placed.push({ x, y });

      const el = document.createElement('div');
      el.className = 'blob';
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.background = `radial-gradient(circle at 35% 30%, #ffffffaa, ${c.hex})`;
      board.appendChild(el);

      const blob = { color: c, el, baseX: x, baseY: y, phase: Math.random() * Math.PI * 2 };
      el.addEventListener('pointerdown', () => onTap(blob));
      blobs.push(blob);
    });

    const targetPool = chosen.filter((color) => color !== previousTarget);
    target = KidsApp.choice(targetPool.length ? targetPool : chosen);
    previousTarget = target;
    promptSwatch.style.background = target.hex;
    promptText.textContent = `「${target.name}」は どこかな？`;
    locked = false;
    KidsApp.speak(target.name + 'は どこかな？', 120);
  }

  function onTap(blob) {
    if (locked) return;
    if (blob.color === target) {
      locked = true;
      blob.el.classList.add('choice-correct');
      blobs.forEach((b) => {
        if (b !== blob) b.el.classList.add('choice-dim');
      });
      KidsApp.Sound.chime();
      adaptive.record(true);
      const rect = blob.el.getBoundingClientRect();
      KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 16);
      KidsApp.speak(`せいかい！ ${target.name} だね！`);
      setTimeout(layout, 2300);
    } else {
      blob.el.classList.remove('wrong');
      void blob.el.offsetWidth;
      blob.el.classList.add('wrong');
      KidsApp.Sound.tap();
      adaptive.record(false);
    }
  }

  let t0 = performance.now();
  function animate(now) {
    const t = (now - t0) / 1000;
    blobs.forEach((b) => {
      const dy = Math.sin(t * 1.2 + b.phase) * 6;
      const dx = Math.cos(t * 0.9 + b.phase) * 4;
      b.el.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 200);
  });
  window.addEventListener('orientationchange', () => setTimeout(layout, 250));

  layout();
  KidsApp.startAnimationLoop(animate);
})();
