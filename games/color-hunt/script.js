(function () {
  KidsApp.initCommon();

  const board = document.getElementById('board');
  const promptSwatch = document.getElementById('promptSwatch');
  const promptText = document.getElementById('promptText');

  const POOL = [
    { name: 'あか', hex: '#ff5a5a' },
    { name: 'あお', hex: '#4ea8de' },
    { name: 'きいろ', hex: '#ffd23f' },
    { name: 'みどり', hex: '#06d6a0' },
    { name: 'ピンク', hex: '#ff6fa5' },
    { name: 'むらさき', hex: '#a78bfa' },
    { name: 'オレンジ', hex: '#ffb84d' },
  ];

  let blobs = [];
  let target = null;
  let locked = false;

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
    const size = Math.max(70, Math.min(150, Math.min(w, h) * 0.26));
    const chosen = shuffle(POOL).slice(0, 6);
    const placed = [];

    chosen.forEach((c) => {
      let x, y, tries = 0;
      do {
        x = KidsApp.rand(size * 0.6, w - size * 0.6);
        y = KidsApp.rand(size * 0.6, h - size * 0.6);
        tries++;
      } while (tries < 40 && placed.some((p) => Math.hypot(p.x - x, p.y - y) < size * 1.05));
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

    target = KidsApp.choice(chosen);
    promptSwatch.style.background = target.hex;
    promptText.textContent = `「${target.name}」は どこかな？`;
    locked = false;
    setTimeout(() => KidsApp.speak(target.name + 'は どこかな？'), 300);
  }

  function onTap(blob) {
    if (locked) return;
    if (blob.color === target) {
      locked = true;
      KidsApp.Sound.chime();
      const rect = blob.el.getBoundingClientRect();
      KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 16);
      KidsApp.speak('せいかい！');
      setTimeout(layout, 1300);
    } else {
      blob.el.classList.remove('wrong');
      void blob.el.offsetWidth;
      blob.el.classList.add('wrong');
      KidsApp.Sound.tap();
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
    requestAnimationFrame(animate);
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 200);
  });
  window.addEventListener('orientationchange', () => setTimeout(layout, 250));

  layout();
  requestAnimationFrame(animate);
})();
