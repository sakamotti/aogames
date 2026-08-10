(function () {
  KidsApp.initCommon();

  const canvas = document.getElementById('c');
  const stage = KidsApp.setupCanvas(canvas);
  const ctx = stage.ctx;
  const container = canvas.parentElement;
  const progressEl = document.getElementById('progress');
  const hintEl = document.getElementById('hint');

  const ANIMALS = [
    { key: 'dog', img: '../../icons/animals/dog.png', name: 'いぬ' },
    { key: 'cat', img: '../../icons/animals/cat.png', name: 'ねこ' },
    { key: 'cow', img: '../../icons/animals/cow.png', name: 'うし' },
    { key: 'frog', img: '../../icons/animals/frog.png', name: 'かえる' },
    { key: 'pig', img: '../../icons/animals/pig.png', name: 'ぶた' },
    { key: 'chicken', img: '../../icons/animals/chicken.png', name: 'にわとり' },
    { key: 'lion', img: '../../icons/animals/lion.png', name: 'らいおん' },
    { key: 'elephant', img: '../../icons/animals/elephant.png', name: 'ぞう' },
    { key: 'sheep', img: '../../icons/animals/sheep.png', name: 'ひつじ' },
  ];
  const ROUND_SIZE = 5;

  const IMAGES = {};
  function preloadImages() {
    return Promise.all(
      ANIMALS.map(
        (a) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = a.img;
            IMAGES[a.key] = img;
          })
      )
    );
  }

  let hidden = [];
  let stars = [];
  let lightPos = null;
  let lightOn = false;
  let roundFound = 0;
  let celebrating = false;

  // The flashlight circle scales with the screen so it feels the same size
  // (relative to how much you can see at once) on a phone or a tablet.
  function revealRadius() {
    const r = Math.min(stage.width, stage.height) * 0.17;
    return Math.max(65, Math.min(120, r));
  }

  function shuffledAnimals() {
    const pool = ANIMALS.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }

  function placeAnimals() {
    const chosen = shuffledAnimals().slice(0, ROUND_SIZE);
    const margin = 46;
    const minDist = revealRadius() * 1.3;
    const placed = [];
    chosen.forEach((a) => {
      let x = stage.width / 2;
      let y = stage.height / 2;
      let tries = 0;
      do {
        x = KidsApp.rand(margin, Math.max(margin + 1, stage.width - margin));
        y = KidsApp.rand(margin, Math.max(margin + 1, stage.height - margin));
        tries++;
      } while (tries < 30 && placed.some((p) => Math.hypot(p.x - x, p.y - y) < minDist));
      placed.push({ key: a.key, name: a.name, x, y, found: false });
    });
    hidden = placed;
    roundFound = 0;
    updateProgress();
  }

  function initStars() {
    const density = (stage.width * stage.height) / 9000;
    const count = Math.round(Math.max(20, Math.min(60, density)));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: KidsApp.rand(0, stage.width),
        y: KidsApp.rand(0, stage.height),
        r: KidsApp.rand(1, 2.4),
        phase: KidsApp.rand(0, Math.PI * 2),
        speed: KidsApp.rand(1, 2.4),
      });
    }
  }

  function clampAnimals() {
    hidden.forEach((a) => {
      a.x = Math.min(Math.max(a.x, 40), Math.max(41, stage.width - 40));
      a.y = Math.min(Math.max(a.y, 40), Math.max(41, stage.height - 40));
    });
  }

  function updateProgress() {
    progressEl.textContent = '🔦 ' + roundFound + ' / ' + ROUND_SIZE;
  }

  function setLight(x, y) {
    lightPos = { x, y };
    if (!lightOn) {
      lightOn = true;
      hintEl.classList.add('hidden');
    }
  }

  const active = new Map();
  canvas.addEventListener('pointerdown', (e) => {
    KidsApp.Sound.unlock();
    active.set(e.pointerId, true);
    setLight(e.offsetX, e.offsetY);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (active.has(e.pointerId)) setLight(e.offsetX, e.offsetY);
  });
  canvas.addEventListener('pointerup', (e) => active.delete(e.pointerId));
  canvas.addEventListener('pointercancel', (e) => active.delete(e.pointerId));

  const POP_MS = 420;

  function foundAnimal(a) {
    a.found = true;
    a.foundAt = performance.now();
    roundFound++;
    updateProgress();
    KidsApp.Sound.chime();
    KidsApp.AnimalSounds[a.key]();
    KidsApp.confettiBurst(container, a.x, a.y, 16);
    setTimeout(() => KidsApp.speak(a.name + '、みつけた！'), 150);

    if (roundFound >= ROUND_SIZE) {
      celebrating = true;
      setTimeout(() => {
        KidsApp.confettiBurst(container, stage.width / 2, stage.height / 2, 30);
        KidsApp.speak('ぜんぶ みつけたね！すごい！');
      }, 400);
      setTimeout(() => {
        placeAnimals();
        celebrating = false;
      }, 2800);
    }
  }

  window.addEventListener('resize', () => {
    initStars();
    clampAnimals();
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      initStars();
      clampAnimals();
    }, 250);
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    ctx.clearRect(0, 0, stage.width, stage.height);

    const bg = ctx.createLinearGradient(0, 0, 0, stage.height);
    bg.addColorStop(0, '#0d1230');
    bg.addColorStop(1, '#2c1f5c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, stage.width, stage.height);

    const rr = revealRadius();
    const emojiSize = Math.round(rr * 0.9);

    // Hidden animals, drawn normally - the fog painted next hides them
    // everywhere except right under the light.
    hidden.forEach((a) => {
      if (a.found) return;
      const img = IMAGES[a.key];
      if (img) ctx.drawImage(img, a.x - emojiSize / 2, a.y - emojiSize / 2, emojiSize, emojiSize);
    });

    // Fog of darkness with a soft-edged hole cut wherever the light is.
    // Left slightly translucent (not fully opaque) so hidden animals show
    // through as a faint silhouette - a gentle hint of where to look,
    // rather than a completely blank void to search blindly.
    ctx.save();
    ctx.fillStyle = 'rgba(8, 8, 26, 0.86)';
    ctx.fillRect(0, 0, stage.width, stage.height);
    if (lightOn && lightPos) {
      ctx.globalCompositeOperation = 'destination-out';
      const grad = ctx.createRadialGradient(lightPos.x, lightPos.y, rr * 0.15, lightPos.x, lightPos.y, rr);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.75, 'rgba(0,0,0,0.9)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lightPos.x, lightPos.y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // A warm ring right at the light's edge - reads as an actual beam
    // rather than just a hole in the dark.
    if (lightOn && lightPos) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 224, 130, 0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(lightPos.x, lightPos.y, rr - 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Twinkling stars sit above the fog - always visible, so the screen
    // never looks like a flat empty void even before the light finds
    // anything.
    stars.forEach((s) => {
      s.phase += dt * s.speed;
      const alpha = 0.35 + Math.sin(s.phase) * 0.3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0.15, Math.min(0.85, alpha))})`;
      ctx.fill();
    });

    // Animals already found stay lit permanently, with a bright layered
    // glow (much stronger than the faint hidden hint) plus a quick pop-in
    // bounce right when found, so the moment of discovery reads as a
    // clear, unmistakable "found!" against the faint silhouettes still
    // hiding elsewhere.
    hidden.forEach((a) => {
      if (!a.found) return;
      const sinceFound = now - (a.foundAt || 0);
      const popT = Math.min(1, sinceFound / POP_MS);
      const ease = 1 - Math.pow(1 - popT, 3);
      const scale = popT >= 1 ? 1 : 0.4 + ease * 0.85;

      ctx.save();
      ctx.beginPath();
      ctx.arc(a.x, a.y, rr * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 224, 130, 0.22)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(a.x, a.y, rr * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 244, 200, 0.35)';
      ctx.fill();

      ctx.translate(a.x, a.y);
      ctx.scale(scale, scale);
      const foundSize = Math.round(emojiSize * 1.15);
      const img = IMAGES[a.key];
      if (img) ctx.drawImage(img, -foundSize / 2, -foundSize / 2, foundSize, foundSize);
      ctx.restore();
    });

    // A little flashlight glyph rides just above the beam so it's obvious
    // what's being dragged around, not just an abstract circle.
    if (lightOn && lightPos) {
      ctx.save();
      ctx.font = Math.round(rr * 0.5) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔦', lightPos.x, lightPos.y - rr - 16);
      ctx.restore();
    }

    if (lightOn && lightPos && !celebrating) {
      hidden.forEach((a) => {
        if (a.found) return;
        if (Math.hypot(a.x - lightPos.x, a.y - lightPos.y) < rr * 0.7) {
          foundAnimal(a);
        }
      });
    }

    requestAnimationFrame(frame);
  }

  initStars();
  preloadImages().then(() => {
    placeAnimals();
    requestAnimationFrame(frame);
  });
})();
