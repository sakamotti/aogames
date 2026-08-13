(function () {
  KidsApp.initCommon();

  const board = document.getElementById('board');

  const SHAPES = [
    { id: 'circle', name: 'まる', color: '#ff6fa5' },
    { id: 'square', name: 'しかく', color: '#2ec4b6' },
    { id: 'triangle', name: 'さんかく', color: '#ffd23f' },
    { id: 'star', name: 'ほし', color: '#a78bfa' },
    { id: 'heart', name: 'はーと', color: '#ff8a7a' },
    { id: 'hexagon', name: 'ろっかくけい', color: '#4ea8de' },
  ];
  const SHAPE_COUNTS = [3, 4, 6];
  const adaptive = KidsApp.createAdaptive('shape-sorter', SHAPE_COUNTS.length);

  function makeSlots(count, section) {
    const cols = count <= 3 ? count : count === 4 ? 2 : 3;
    const rows = Math.ceil(count / cols);
    const yRows = section === 'holes'
      ? (rows === 1 ? [0.3] : [0.2, 0.42])
      : (rows === 1 ? [0.76] : [0.68, 0.89]);
    const slots = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const itemsInRow = Math.min(cols, count - row * cols);
      const col = i % cols;
      slots.push({ fx: (col + 1) / (itemsInRow + 1), fy: yRows[row] });
    }
    return slots;
  }

  function starPointsStr(cx, cy, outerR, innerR) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = -Math.PI / 2 + (Math.PI * i) / 5;
      pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
    }
    return pts.join(' ');
  }

  function polyPointsStr(cx, cy, r, sides) {
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = -Math.PI / 2 + (Math.PI * 2 * i) / sides;
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
    if (id === 'hexagon') return `<polygon points="${polyPointsStr(50, 50, 42, 6)}" ${common}/>`;
    if (id === 'heart') return `<path d="M50,86 C14,62 8,34 26,20 C38,10 50,18 50,30 C50,18 62,10 74,20 C92,34 86,62 50,86 Z" ${common}/>`;
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
    const base = Math.min(w / 3.6, h / 6.2);
    holeSize = Math.max(52, Math.min(130, base));
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
    const activeShapes = SHAPES.slice(0, SHAPE_COUNTS[adaptive.level]);
    const holeSlots = makeSlots(activeShapes.length, 'holes');
    const pieceSlots = makeSlots(activeShapes.length, 'pieces');

    activeShapes.forEach((shape, i) => {
      const holeWrap = document.createElement('div');
      holeWrap.className = 'hole';
      const slot = holeSlots[i];
      const p = posFor(slot.fx, slot.fy);
      holeWrap.style.left = p.x + 'px';
      holeWrap.style.top = p.y + 'px';
      const svg = makeSVG(shape.id, holeSize, { fill: 'rgba(255,255,255,0.5)', stroke: shape.color, strokeWidth: 6, dash: '10 8' });
      holeWrap.appendChild(svg);
      board.appendChild(holeWrap);
      holeEls.push({ shape, fx: slot.fx, fy: slot.fy, el: holeWrap, filled: false });
    });

    const order = activeShapes.map((s, i) => i).sort(() => Math.random() - 0.5);
    order.forEach((shapeIdx, i) => {
      const shape = activeShapes[shapeIdx];
      const slot = pieceSlots[i];
      const pieceEl = document.createElement('div');
      pieceEl.className = 'piece';
      const home = posFor(slot.fx, slot.fy);
      pieceEl.style.left = home.x + 'px';
      pieceEl.style.top = home.y + 'px';
      const svg = makeSVG(shape.id, pieceSize, { fill: shape.color, stroke: 'rgba(0,0,0,0.15)', strokeWidth: 3 });
      pieceEl.appendChild(svg);
      board.appendChild(pieceEl);
      const piece = { shape, el: pieceEl, homeFx: slot.fx, homeFy: slot.fy, placed: false };
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
        KidsApp.speak(piece.shape.name + '、できたね！');
        const rect = el.getBoundingClientRect();
        KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 14);
        checkComplete();
      } else {
        adaptive.record(false);
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
      adaptive.record(true);
      setTimeout(() => {
        KidsApp.Sound.success();
        KidsApp.speak('ぜんぶ できたね！');
        const w = board.clientWidth, h = board.clientHeight;
        KidsApp.confettiBurst(document.body, w * 0.25, h * 0.4, 16);
        KidsApp.confettiBurst(document.body, w * 0.75, h * 0.4, 16);
      }, 150);
      setTimeout(build, 2400);
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
