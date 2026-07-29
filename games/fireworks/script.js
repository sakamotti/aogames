(function () {
  KidsApp.initCommon();

  const canvas = document.getElementById('c');
  const stage = KidsApp.setupCanvas(canvas);
  const ctx = stage.ctx;

  const COLORS = ['#ff6fa5', '#ffd23f', '#4ea8de', '#06d6a0', '#a78bfa', '#ffb84d', '#ff8a7a', '#ffffff'];

  let rockets = [];
  let particles = [];
  let stars = [];

  function initStars() {
    stars = [];
    for (let i = 0; i < 70; i++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.7, r: Math.random() * 1.6 + 0.4, tw: Math.random() * Math.PI * 2 });
    }
  }
  initStars();

  function launch(targetX, targetY) {
    const startX = targetX + KidsApp.rand(-20, 20);
    rockets.push({
      x: startX,
      y: stage.height,
      startY: stage.height,
      targetX,
      targetY,
      t: 0,
      dur: KidsApp.rand(0.5, 0.75),
      color: KidsApp.choice(COLORS),
      trail: [],
    });
    KidsApp.Sound.whoosh();
  }

  function explode(x, y, color) {
    const count = 46;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + KidsApp.rand(-0.1, 0.1);
      const speed = KidsApp.rand(90, 220);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: KidsApp.rand(0.8, 1.3),
        color,
      });
    }
    KidsApp.Sound.chime();
  }

  function pointerToLaunch(e) {
    launch(e.offsetX, Math.max(60, e.offsetY));
  }
  canvas.addEventListener('pointerdown', pointerToLaunch);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const ctx2 = ctx;
    ctx2.clearRect(0, 0, stage.width, stage.height);

    // twinkling stars
    stars.forEach((s) => {
      s.tw += dt * 1.5;
      const a = 0.4 + Math.sin(s.tw) * 0.3;
      ctx2.fillStyle = `rgba(255,255,255,${Math.max(0, a)})`;
      ctx2.beginPath();
      ctx2.arc(s.x * stage.width, s.y * stage.height, s.r, 0, Math.PI * 2);
      ctx2.fill();
    });

    // rockets
    rockets.forEach((r) => {
      r.t += dt;
      const p = Math.min(1, r.t / r.dur);
      const ease = 1 - Math.pow(1 - p, 2);
      r.x = r.x + (r.targetX - r.x) * 0.06;
      r.y = r.startY + (r.targetY - r.startY) * ease;
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 10) r.trail.shift();
    });
    rockets.forEach((r) => {
      ctx2.strokeStyle = r.color;
      ctx2.lineWidth = 3;
      ctx2.beginPath();
      r.trail.forEach((pt, i) => (i === 0 ? ctx2.moveTo(pt.x, pt.y) : ctx2.lineTo(pt.x, pt.y)));
      ctx2.stroke();
    });
    rockets = rockets.filter((r) => {
      if (r.t >= r.dur) {
        explode(r.targetX, r.targetY, r.color);
        return false;
      }
      return true;
    });

    // particles
    particles.forEach((pt) => {
      pt.life += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 120 * dt;
      pt.vx *= 0.98;
    });
    particles = particles.filter((pt) => pt.life < pt.maxLife);
    particles.forEach((pt) => {
      const a = 1 - pt.life / pt.maxLife;
      ctx2.globalAlpha = Math.max(0, a);
      ctx2.fillStyle = pt.color;
      ctx2.beginPath();
      ctx2.arc(pt.x, pt.y, 3.4, 0, Math.PI * 2);
      ctx2.fill();
    });
    ctx2.globalAlpha = 1;

    if (particles.length > 900) particles.splice(0, particles.length - 900);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  setTimeout(() => launch(stage.width / 2, stage.height * 0.35), 500);
})();
