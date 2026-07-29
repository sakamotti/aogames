(function () {
  KidsApp.initCommon();

  const canvas = document.getElementById('c');
  const stage = KidsApp.setupCanvas(canvas);
  const ctx = stage.ctx;
  const container = canvas.parentElement;
  const jar = document.getElementById('jar');

  let stars = [];
  let caught = 0;
  let lastSpawn = 0;

  function updateJar() {
    const shown = caught % 10;
    jar.textContent = '🫙 ' + '⭐'.repeat(shown) + (shown === 0 && caught > 0 ? ' やったね！' : '');
  }

  function spawn() {
    const r = KidsApp.rand(22, 34);
    stars.push({
      x: KidsApp.rand(r, stage.width - r),
      y: -r,
      r,
      vy: KidsApp.rand(30, 55),
      spin: KidsApp.rand(-1, 1),
      angle: 0,
      twinkle: KidsApp.rand(0, Math.PI * 2),
      caught: false,
      t: 0,
    });
  }

  function starPoints(cx, cy, outerR, innerR, rot) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 === 0 ? outerR : innerR;
      const a = rot + (Math.PI * i) / 5;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return pts;
  }

  function drawStar(s) {
    const pts = starPoints(s.x, s.y, s.r, s.r * 0.42, s.angle);
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
    ctx.closePath();
    const glow = 0.6 + Math.sin(s.twinkle) * 0.4;
    ctx.fillStyle = `rgba(255, 224, 130, ${glow})`;
    ctx.shadowColor = '#ffe082';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function hitTest(px, py) {
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      if (s.caught) continue;
      if (Math.hypot(px - s.x, py - s.y) <= s.r * 1.4) return s;
    }
    return null;
  }

  function tryCatch(px, py) {
    const s = hitTest(px, py);
    if (!s) return;
    s.caught = true;
    s.t = 0;
    caught++;
    updateJar();
    KidsApp.Sound.chime();
    KidsApp.confettiBurst(container, px, py, 12);
  }

  const active = new Map();
  canvas.addEventListener('pointerdown', (e) => {
    active.set(e.pointerId, true);
    tryCatch(e.offsetX, e.offsetY);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (active.has(e.pointerId)) tryCatch(e.offsetX, e.offsetY);
  });
  canvas.addEventListener('pointerup', (e) => active.delete(e.pointerId));
  canvas.addEventListener('pointercancel', (e) => active.delete(e.pointerId));

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (now - lastSpawn > 900 && stars.length < 10) {
      spawn();
      lastSpawn = now;
    }

    ctx.clearRect(0, 0, stage.width, stage.height);

    stars.forEach((s) => {
      s.angle += s.spin * dt;
      s.twinkle += dt * 2;
      if (s.caught) {
        s.t += dt;
        s.y -= 80 * dt;
        s.r *= 0.94;
      } else {
        s.y += s.vy * dt;
      }
    });
    stars = stars.filter((s) => (s.caught ? s.t < 0.4 : s.y < stage.height + s.r + 10));

    stars.forEach((s) => {
      ctx.save();
      if (s.caught) ctx.globalAlpha = Math.max(0, 1 - s.t / 0.4);
      drawStar(s);
      ctx.restore();
    });

    requestAnimationFrame(frame);
  }

  updateJar();
  for (let i = 0; i < 3; i++) spawn();
  requestAnimationFrame(frame);
})();
