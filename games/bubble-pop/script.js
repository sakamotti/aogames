(function () {
  KidsApp.initCommon();

  const canvas = document.getElementById('c');
  const stage = KidsApp.setupCanvas(canvas);
  const container = canvas.parentElement;

  const PALETTE = ['#ff9fc0', '#a9e4ff', '#c9f7d0', '#ffe29a', '#d9c6ff', '#ffc2a1'];
  let bubbles = [];
  let lastSpawn = 0;

  function spawnBubble(onScreen) {
    const r = KidsApp.rand(34, 70);
    bubbles.push({
      x: KidsApp.rand(r, stage.width - r),
      y: onScreen ? KidsApp.rand(r, stage.height - r) : stage.height + r + KidsApp.rand(0, 120),
      r,
      vy: KidsApp.rand(18, 34),
      sway: KidsApp.rand(0.6, 1.6),
      swayPhase: KidsApp.rand(0, Math.PI * 2),
      color: KidsApp.choice(PALETTE),
      popped: false,
      popT: 0,
    });
  }

  function hitTest(px, py) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (b.popped) continue;
      const d = Math.hypot(px - b.x, py - b.y);
      if (d <= b.r) return b;
    }
    return null;
  }

  function pop(b, px, py) {
    b.popped = true;
    b.popT = 0;
    KidsApp.Sound.pop();
    KidsApp.confettiBurst(container, px, py, 8);
  }

  function handlePoint(px, py) {
    const b = hitTest(px, py);
    if (b) pop(b, px, py);
  }

  const activePointers = new Map();
  canvas.addEventListener('pointerdown', (e) => {
    activePointers.set(e.pointerId, true);
    handlePoint(e.offsetX, e.offsetY);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (activePointers.has(e.pointerId)) handlePoint(e.offsetX, e.offsetY);
  });
  canvas.addEventListener('pointerup', (e) => activePointers.delete(e.pointerId));
  canvas.addEventListener('pointercancel', (e) => activePointers.delete(e.pointerId));

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (now - lastSpawn > 650 && bubbles.length < 14) {
      spawnBubble();
      lastSpawn = now;
    }

    const ctx = stage.ctx;
    ctx.clearRect(0, 0, stage.width, stage.height);

    bubbles.forEach((b) => {
      if (b.popped) {
        b.popT += dt;
      } else {
        b.y -= b.vy * dt;
        b.swayPhase += dt * b.sway;
        b.x += Math.sin(b.swayPhase) * 0.6;
      }
    });
    bubbles = bubbles.filter((b) => (b.popped ? b.popT < 0.25 : b.y > -b.r - 20));

    bubbles.forEach((b) => {
      ctx.save();
      if (b.popped) {
        const t = b.popT / 0.25;
        ctx.globalAlpha = 1 - t;
        const r = b.r * (1 + t * 0.6);
        drawBubble(ctx, b.x, b.y, r, b.color);
      } else {
        drawBubble(ctx, b.x, b.y, b.r, b.color);
      }
      ctx.restore();
    });

    requestAnimationFrame(frame);
  }

  function drawBubble(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.35, color + 'cc');
    grad.addColorStop(1, color + '88');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
  }

  for (let i = 0; i < 6; i++) spawnBubble(true);
  requestAnimationFrame(frame);
})();
