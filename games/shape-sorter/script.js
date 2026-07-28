(function () {
  KidsApp.initCommon();

  const board = document.getElementById('board');

  const SHAPES = [
    { id: 'circle', color: '#ff6fa5' },
    { id: 'square', color: '#2ec4b6' },
    { id: 'triangle', color: '#ffd23f' },
    { id: 'star', color: '#a78bfa' },
  ];
  const SLOTS_X = [0.16, 0.39, 0.61, 0.84];

  function starPointsStr(cx, cy, outerR, innerR) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = -Math.PI / 2 + (Math.PI * i) / 5;
      pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
    }
    return pts.join(' ');
  }

  function shapeInner(id, opts) {
    const { fill = 'none', stroke = '#000', strokeWidth = 6, dash = '' } = opts;
    const common = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-dasharray="${dash}"`;
    if (id === 'circle') return `<circle cx="50" cy="50" r="40" ${common}/>`;
    if (id === 'square') return `<rect x="12" y="12" width="76" height="76" rx="14" ${common}/>`;
    if (id === 'triangle') return `<polygon points="50,10 90,88 10,88" ${common}/>`;
    if (id === 'star') return `<polygon points="${starPointsStr(50, 52, 42, 18)}" ${common}/>`;
    return '';
  }

  function makeSVG(id, sizePx, opts) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', sizePx);
    svg.setAttribute('height', sizePx);
    svg.innerHTML = shapeInner(id, opts);
    return svg;
  }

  let holeSize = 100;
  let pieceSize = 84;

  const holeEls = [];
  const pieces = [];

  function layoutSize() {
    const w = board.clientWidth;
    const h = board.clientHeight;
    const base = Math.min(w / 4.6, h / 3.4);
    holeSize = Math.max(70, Math.min(150, base));
    pieceSize = holeSize * 0.86;
  }

  function posFor(fx, fy) {
    return { x: board.clientWidth * fx, y: board.clientHeight * fy };
  }

  function build() {
    board.innerHTML = '';
    holeEls.length = 0;
    pieces.length = 0;
    layoutSize();

    SHAPES.forEach((shape, i) => {
      const holeWrap = document.createElement('div');
      holeWrap.className = 'hole';
      const p = posFor(SLOTS_X[i], 0.27);
      holeWrap.style.left = p.x + 'px';
      holeWrap.style.top = p.y + 'px';
      const svg = makeSVG(shape.id, holeSize, { fill: 'rgba(255,255,255,0.5)', stroke: shape.color, strokeWidth: 6, dash: '10 8' });
      holeWrap.appendChild(svg);
      board.appendChild(holeWrap);
      holeEls.push({ shape, fx: SLOTS_X[i], fy: 0.27, el: holeWrap, filled: false });
    });

    const order = SHAPES.map((s, i) => i).sort(() => Math.random() - 0.5);
    order.forEach((shapeIdx, slot) => {
      const shape = SHAPES[shapeIdx];
      const pieceEl = document.createElement('div');
      pieceEl.className = 'piece';
      const home = posFor(SLOTS_X[slot], 0.78);
      pieceEl.style.left = home.x + 'px';
      pieceEl.style.top = home.y + 'px';
      const svg = makeSVG(shape.id, pieceSize, { fill: shape.color, stroke: 'rgba(0,0,0,0.15)', strokeWidth: 3 });
      pieceEl.appendChild(svg);
      board.appendChild(pieceEl);
      const piece = { shape, el: pieceEl, homeFx: SLOTS_X[slot], homeFy: 0.78, placed: false };
      pieces.push(piece);
      attachDrag(piece);
    });
  }

  function attachDrag(piece) {
    const el = piece.el;
    let offsetX = 0, offsetY = 0;

    el.addEventListener('pointerdown', (e) => {
      if (piece.placed) return;
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
      const rect = el.getBoundingClientRect();
      offsetX = e.clientX - (rect.left + rect.width / 2);
      offsetY = e.clientY - (rect.top + rect.height / 2);
      KidsApp.Sound.tap();
    });

    el.addEventListener('pointermove', (e) => {
      if (!el.classList.contains('dragging')) return;
      const boardRect = board.getBoundingClientRect();
      el.style.left = e.clientX - boardRect.left - offsetX + 'px';
      el.style.top = e.clientY - boardRect.top - offsetY + 'px';
    });

    function drop(e) {
      if (!el.classList.contains('dragging')) return;
      el.classList.remove('dragging');
      const px = parseFloat(el.style.left);
      const py = parseFloat(el.style.top);

      let bestHole = null;
      let bestDist = Infinity;
      holeEls.forEach((h) => {
        if (h.filled) return;
        const hp = posFor(h.fx, h.fy);
        const d = Math.hypot(px - hp.x, py - hp.y);
        if (d < bestDist) { bestDist = d; bestHole = h; }
      });

      if (bestHole && bestHole.shape.id === piece.shape.id && bestDist < holeSize * 0.55) {
        const hp = posFor(bestHole.fx, bestHole.fy);
        el.style.left = hp.x + 'px';
        el.style.top = hp.y + 'px';
        piece.placed = true;
        el.classList.add('placed');
        bestHole.filled = true;
        KidsApp.Sound.chime();
        const rect = el.getBoundingClientRect();
        KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 14);
        checkComplete();
      } else {
        const home = posFor(piece.homeFx, piece.homeFy);
        el.style.left = home.x + 'px';
        el.style.top = home.y + 'px';
        KidsApp.Sound.boing();
      }
    }
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);
  }

  function checkComplete() {
    if (holeEls.every((h) => h.filled)) {
      setTimeout(() => {
        KidsApp.Sound.success();
        KidsApp.speak('ぜんぶ できたね！');
        const w = board.clientWidth, h = board.clientHeight;
        KidsApp.confettiBurst(document.body, w * 0.25, h * 0.4, 16);
        KidsApp.confettiBurst(document.body, w * 0.75, h * 0.4, 16);
      }, 150);
      setTimeout(build, 1900);
    }
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 200);
  });
  window.addEventListener('orientationchange', () => setTimeout(build, 250));

  build();
})();
