(function () {
  KidsApp.initCommon();

  const canvas = document.getElementById('c');
  const stage = KidsApp.setupCanvas(canvas);
  const ctx = stage.ctx;

  const SURPRISES = ['🐟', '🐸', '🦆', '🐢'];

  let drops = [];
  let ripples = [];
  let surprises = [];

  function spawnDrop() {
    drops.push({
      x: KidsApp.rand(0, stage.width),
      y: KidsApp.rand(-stage.height, 0),
      len: KidsApp.rand(14, 26),
      speed: KidsApp.rand(220, 340),
      opacity: KidsApp.rand(0.15, 0.35),
    });
  }
  for (let i = 0; i < 40; i++) spawnDrop();

  function addRipple(x, y) {
    ripples.push({ x, y, life: 0, maxLife: 0.9, maxR: KidsApp.rand(90, 150) });
    KidsApp.Sound.splash();
    if (Math.random() < 0.3) {
      surprises.push({ x, y, life: 0, maxLife: 1.1, emoji: KidsApp.choice(SURPRISES) });
    }
  }

  canvas.addEventListener('pointerdown', (e) => addRipple(e.offsetX, e.offsetY));

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    ctx.clearRect(0, 0, stage.width, stage.height);

    drops.forEach((d) => {
      d.y += d.speed * dt;
      if (d.y > stage.height) {
        d.y = KidsApp.rand(-60, 0);
        d.x = KidsApp.rand(0, stage.width);
      }
      ctx.strokeStyle = `rgba(255,255,255,${d.opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 3, d.y + d.len);
      ctx.stroke();
    });

    ripples.forEach((r) => (r.life += dt));
    ripples = ripples.filter((r) => r.life < r.maxLife);
    ripples.forEach((r) => {
      const t = r.life / r.maxLife;
      const rad = r.maxR * t;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - t) * 0.8})`;
      ctx.lineWidth = 4 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${(1 - t) * 0.5})`;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    });

    surprises.forEach((s) => (s.life += dt));
    surprises = surprises.filter((s) => s.life < s.maxLife);
    surprises.forEach((s) => {
      const t = s.life / s.maxLife;
      const alpha = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = '48px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.emoji, s.x, s.y - 20 * t);
      ctx.restore();
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
