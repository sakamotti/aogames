(function () {
  'use strict';

  KidsApp.initCommon();

  const canvas = document.getElementById('crosswalkCanvas');
  const stage = KidsApp.setupCanvas(canvas);
  const ctx = stage.ctx;
  const container = canvas.parentElement;
  const signalIcon = document.getElementById('signalIcon');
  const promptEl = document.getElementById('prompt');
  const medalsEl = document.getElementById('medals');
  const gestureHint = document.getElementById('gestureHint');

  const MEDAL_KEY = 'kidsapp_crosswalk_medals';
  const TRAFFIC_MS = 3800;
  const LOOK_MS = 2100;
  const READY_MS = 5600;
  const CROSS_MS = 2200;
  const CELEBRATE_MS = 1700;
  const CAR_COLORS = ['#ff6fa5', '#4ea8de', '#ffd23f', '#06d6a0', '#ff8a7a', '#a78bfa'];

  let phase = 'traffic';
  let phaseTime = 0;
  let spawnTime = 0;
  let cars = [];
  let crossingProgress = 0;
  let gesture = null;
  let lastBlockedAt = -Infinity;
  let lookStep = -1;
  let medals = Number(localStorage.getItem(MEDAL_KEY)) || 0;

  function geometry() {
    const w = stage.width;
    const h = stage.height;
    const roadTop = h * (h < 500 ? 0.23 : 0.29);
    const roadBottom = h * (h < 500 ? 0.76 : 0.70);
    const roadHeight = roadBottom - roadTop;
    const crossWidth = Math.max(88, Math.min(150, w * 0.29));
    return {
      w, h, roadTop, roadBottom, roadHeight, crossWidth,
      crossLeft: w / 2 - crossWidth / 2,
      crossRight: w / 2 + crossWidth / 2,
      childStartY: Math.min(h - 46, roadBottom + Math.max(40, (h - roadBottom) * 0.48)),
      childEndY: Math.max(42, roadTop - Math.max(38, roadTop * 0.28)),
    };
  }

  function childPosition() {
    const g = geometry();
    const eased = 1 - Math.pow(1 - crossingProgress, 2);
    return { x: g.w / 2, y: g.childStartY + (g.childEndY - g.childStartY) * eased };
  }

  function isPedestrianGreen() {
    return phase === 'look' || phase === 'ready' || phase === 'crossing' || phase === 'celebrate';
  }

  function setHud(text) {
    if (promptEl.textContent !== text) promptEl.textContent = text;
    signalIcon.textContent = isPedestrianGreen() ? '🔵' : '🔴';
    medalsEl.textContent = '⭐ ' + medals;
    gestureHint.classList.toggle('show', phase === 'ready');
  }

  function phasePrompt() {
    if (phase === 'traffic') return 'あかは とまろう';
    if (phase === 'clearing') return 'くるまが とまるまで まとう';
    if (phase === 'look') {
      return ['みぎを みよう →', '← ひだりを みよう', 'もういちど みぎ →'][Math.max(0, lookStep)];
    }
    if (phase === 'ready') return 'くるまは こないね！ てを あげよう';
    if (phase === 'crossing') return 'てを あげて わたろう';
    return 'じょうずに わたれたね！';
  }

  function setPhase(next) {
    phase = next;
    phaseTime = 0;
    lookStep = -1;
    if (next !== 'ready') gesture = null;
    setHud(phasePrompt());
    if (next === 'traffic') {
      crossingProgress = 0;
      spawnTime = 500;
    } else if (next === 'look') {
      KidsApp.Sound.chime();
      KidsApp.speak('あおに なったよ。みぎ、ひだり、みぎを みよう');
    } else if (next === 'ready') {
      KidsApp.speak('くるまは こないね。てを あげて わたろう');
    }
  }

  function spawnCar(onScreen) {
    const g = geometry();
    const direction = Math.random() < 0.5 ? 1 : -1;
    const lane = direction > 0 ? 0 : 1;
    cars.push({
      x: onScreen ? KidsApp.rand(30, g.w - 30) : (direction > 0 ? -65 : g.w + 65),
      y: g.roadTop + g.roadHeight * (lane === 0 ? 0.28 : 0.72),
      direction,
      speed: KidsApp.rand(125, 185),
      color: KidsApp.choice(CAR_COLORS),
      size: KidsApp.rand(0.88, 1.08),
    });
  }

  function blockedAttempt() {
    const now = performance.now();
    if (now - lastBlockedAt < 900) return;
    lastBlockedAt = now;
    KidsApp.Sound.tap();
    if (phase === 'look') {
      setHud('みぎ・ひだり・みぎを みてからね');
      KidsApp.speak('みぎ、ひだり、みぎを みてからね');
    } else {
      setHud('あかで とまれて えらいね！');
      KidsApp.speak('あかは とまろう。とまれて えらいね');
    }
    setTimeout(() => setHud(phasePrompt()), 1200);
  }

  function beginCrossing() {
    if (phase !== 'ready') {
      blockedAttempt();
      return;
    }
    gesture = null;
    crossingProgress = 0;
    setPhase('crossing');
    KidsApp.Sound.chime();
    KidsApp.speak('てを あげて わたろう');
  }

  canvas.addEventListener('pointerdown', (event) => {
    const child = childPosition();
    const distance = Math.hypot(event.offsetX - child.x, event.offsetY - child.y);
    if (distance > 105 || phase === 'crossing' || phase === 'celebrate') return;
    if (phase !== 'ready') {
      blockedAttempt();
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    gesture = { id: event.pointerId, startY: event.offsetY, latestY: event.offsetY };
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    gesture.latestY = event.offsetY;
    if (gesture.startY - gesture.latestY >= 46) beginCrossing();
  });

  function endGesture(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (phase === 'ready' && gesture.startY - gesture.latestY < 46) {
      setHud('こどもを うえに なぞってね ☝️');
      KidsApp.speak('うえに なぞって、てを あげよう');
      setTimeout(() => setHud(phasePrompt()), 1300);
    }
    gesture = null;
  }
  canvas.addEventListener('pointerup', endGesture);
  canvas.addEventListener('pointercancel', endGesture);

  function update(dt, now) {
    const g = geometry();
    phaseTime += dt * 1000;

    if (phase === 'traffic') {
      spawnTime += dt * 1000;
      if (spawnTime >= 760 && cars.length < 7) {
        spawnCar(false);
        spawnTime = 0;
      }
    }

    cars.forEach((car) => {
      car.x += car.direction * car.speed * dt;
      const lane = car.direction > 0 ? 0.28 : 0.72;
      car.y = g.roadTop + g.roadHeight * lane;
    });
    cars = cars.filter((car) => car.x > -100 && car.x < g.w + 100);

    if (phase === 'traffic' && phaseTime >= TRAFFIC_MS) {
      setPhase('clearing');
    } else if (phase === 'clearing' && cars.length === 0) {
      setPhase('look');
    } else if (phase === 'look') {
      const nextStep = Math.min(2, Math.floor(phaseTime / (LOOK_MS / 3)));
      if (nextStep !== lookStep) {
        lookStep = nextStep;
        setHud(phasePrompt());
        KidsApp.Sound.click();
      }
      if (phaseTime >= LOOK_MS) setPhase('ready');
    } else if (phase === 'ready' && phaseTime >= READY_MS) {
      setPhase('traffic');
    } else if (phase === 'crossing') {
      crossingProgress = Math.min(1, phaseTime / CROSS_MS);
      if (crossingProgress >= 1) {
        medals++;
        localStorage.setItem(MEDAL_KEY, String(medals));
        setPhase('celebrate');
        KidsApp.Sound.success();
        const child = childPosition();
        KidsApp.confettiBurst(container, child.x, child.y, 24);
        KidsApp.speak('じょうずに わたれたね。あんぜん はなまる！');
      }
    } else if (phase === 'celebrate' && phaseTime >= CELEBRATE_MS) {
      setPhase('traffic');
    }

    draw(now);
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function drawRoad(g) {
    ctx.fillStyle = '#bfe58c';
    ctx.fillRect(0, 0, g.w, g.h);

    ctx.fillStyle = '#d8dde3';
    ctx.fillRect(0, g.roadTop - 54, g.w, 54);
    ctx.fillRect(0, g.roadBottom, g.w, g.h - g.roadBottom);
    ctx.strokeStyle = '#b0b7c0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, g.roadTop - 7);
    ctx.lineTo(g.w, g.roadTop - 7);
    ctx.moveTo(0, g.roadBottom + 7);
    ctx.lineTo(g.w, g.roadBottom + 7);
    ctx.stroke();

    ctx.fillStyle = '#515866';
    ctx.fillRect(0, g.roadTop, g.w, g.roadHeight);
    ctx.setLineDash([24, 20]);
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, g.roadTop + g.roadHeight / 2);
    ctx.lineTo(g.w, g.roadTop + g.roadHeight / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const stripeGap = g.roadHeight / 10;
    ctx.fillStyle = '#f7f7f3';
    for (let i = 0; i < 10; i += 2) {
      ctx.fillRect(g.crossLeft, g.roadTop + i * stripeGap + 3, g.crossWidth, stripeGap - 6);
    }

    ctx.strokeStyle = '#fff6a8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(g.crossLeft - 18, g.roadTop);
    ctx.lineTo(g.crossLeft - 18, g.roadBottom);
    ctx.moveTo(g.crossRight + 18, g.roadTop);
    ctx.lineTo(g.crossRight + 18, g.roadBottom);
    ctx.stroke();
  }

  function drawCar(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.scale(car.direction * car.size, car.size);
    ctx.fillStyle = car.color;
    roundedRect(-34, -17, 68, 30, 10);
    ctx.fill();
    ctx.fillStyle = '#dff4ff';
    roundedRect(-15, -27, 31, 17, 7);
    ctx.fill();
    ctx.fillStyle = '#303541';
    [-21, 21].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, 15, 7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#fff4a8';
    ctx.beginPath();
    ctx.arc(31, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSignals(g) {
    const x = Math.min(g.w - 34, g.crossRight + 48);
    const y = g.roadTop - 66;
    ctx.strokeStyle = '#4a4f58';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x, y + 40);
    ctx.lineTo(x, g.roadTop + 4);
    ctx.stroke();
    ctx.fillStyle = '#313640';
    roundedRect(x - 20, y - 24, 40, 66, 9);
    ctx.fill();
    ctx.fillStyle = isPedestrianGreen() ? '#522c38' : '#ff4f62';
    ctx.beginPath();
    ctx.arc(x, y - 7, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isPedestrianGreen() ? '#36dba2' : '#254d47';
    ctx.beginPath();
    ctx.arc(x, y + 24, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawChild(now) {
    const child = childPosition();
    const raised = phase === 'crossing' || phase === 'celebrate';
    const bob = phase === 'crossing' ? Math.sin(now / 110) * 3 : 0;
    const scale = Math.max(0.8, Math.min(1.2, stage.width / 420));
    ctx.save();
    ctx.translate(child.x, child.y + bob);
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#5d446f';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, 22);
    ctx.lineTo(-12, 42);
    ctx.moveTo(7, 22);
    ctx.lineTo(13, 42);
    ctx.stroke();

    ctx.fillStyle = '#ff9f70';
    roundedRect(-18, -13, 36, 43, 13);
    ctx.fill();

    ctx.strokeStyle = '#8c5a42';
    ctx.lineWidth = 6;
    ctx.beginPath();
    if (raised) {
      ctx.moveTo(13, -5);
      ctx.lineTo(25, -23);
      ctx.lineTo(22, -45);
    } else {
      ctx.moveTo(13, -4);
      ctx.lineTo(27, 14);
    }
    ctx.moveTo(-13, -4);
    ctx.lineTo(-25, 13);
    ctx.stroke();

    ctx.fillStyle = '#f3b58a';
    ctx.beginPath();
    ctx.arc(0, -29, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#503b37';
    ctx.beginPath();
    ctx.arc(0, -34, 18, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f3153';
    ctx.beginPath();
    ctx.arc(-6, -28, 2, 0, Math.PI * 2);
    ctx.arc(6, -28, 2, 0, Math.PI * 2);
    ctx.fill();

    if (phase === 'look') {
      const arrow = lookStep === 1 ? '👀 ←' : '👀 →';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(arrow, 0, -62);
    } else if (phase === 'ready') {
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('☝️', 0, -62);
    }
    ctx.restore();
  }

  function draw(now) {
    const g = geometry();
    ctx.clearRect(0, 0, g.w, g.h);
    drawRoad(g);
    cars.forEach(drawCar);
    drawSignals(g);
    drawChild(now);
  }

  for (let i = 0; i < 3; i++) spawnCar(true);
  setHud(phasePrompt());
  let lastFrame = performance.now();
  KidsApp.startAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    update(dt, now);
  });
})();
