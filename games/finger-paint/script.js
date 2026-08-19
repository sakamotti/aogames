(function () {
  KidsApp.initCommon();
  KidsApp.BGM.start('calm');

  const canvas = document.getElementById('c');
  const stage = KidsApp.setupCanvas(canvas);
  const ctx = stage.ctx;
  const container = canvas.parentElement;

  const PALETTE = ['#ff6fa5', '#ffb84d', '#ffd23f', '#06d6a0', '#4ea8de', '#a78bfa', '#ff8a7a'];
  const strokes = new Map(); // pointerId -> {color, x, y}

  function newColor() {
    return KidsApp.choice(PALETTE);
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    strokes.set(e.pointerId, { color: newColor(), x: e.offsetX, y: e.offsetY });
    dot(e.offsetX, e.offsetY, strokes.get(e.pointerId).color);
    KidsApp.Sound.tap();
  });

  canvas.addEventListener('pointermove', (e) => {
    const s = strokes.get(e.pointerId);
    if (!s) return;
    line(s.x, s.y, e.offsetX, e.offsetY, s.color);
    s.x = e.offsetX;
    s.y = e.offsetY;
  });

  function end(e) {
    strokes.delete(e.pointerId);
  }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  function dot(x, y, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  function line(x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  document.getElementById('clearBtn').addEventListener('click', () => {
    ctx.clearRect(0, 0, stage.width, stage.height);
    KidsApp.Sound.whoosh();
    KidsApp.confettiBurst(container, stage.width / 2, stage.height / 2, 14);
  });
})();
