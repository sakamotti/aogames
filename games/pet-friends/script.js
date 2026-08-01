(function () {
  KidsApp.initCommon();

  const SPECIES = {
    cat: { wrap: 'wrapCat', svg: 'svgCat', name: 'みけ', treat: '🐟', talk: 'にゃー', purr: () => KidsApp.Sound.purr() },
    dog: { wrap: 'wrapDog', svg: 'svgDog', name: 'ポチ', treat: '🍖', talk: 'わん！', purr: () => KidsApp.Sound.pant() },
  };
  const MOUTH_Y = { cat: 160, dog: 175 };

  const els = {
    btnCat: document.getElementById('btnCat'),
    btnDog: document.getElementById('btnDog'),
    affectionRow: document.getElementById('affectionRow'),
    petName: document.getElementById('petName'),
    treatBowl: document.getElementById('treatBowl'),
    wrapCat: document.getElementById('wrapCat'),
    wrapDog: document.getElementById('wrapDog'),
    svgCat: document.getElementById('svgCat'),
    svgDog: document.getElementById('svgDog'),
  };

  let species = 'cat';
  let affection = 0;
  let petting = false;
  let petSessionStart = 0;
  let petAwarded = false;
  let lastHeartAt = 0;
  let lastPurrAt = 0;
  let idleTimer = null;

  for (let i = 0; i < 5; i++) {
    const span = document.createElement('span');
    span.textContent = '🐾';
    els.affectionRow.appendChild(span);
  }

  function currentWrap() {
    return document.getElementById(SPECIES[species].wrap);
  }
  function currentSvg() {
    return document.getElementById(SPECIES[species].svg);
  }

  function renderAffection() {
    [...els.affectionRow.children].forEach((span, i) => {
      span.classList.toggle('filled', i < affection);
    });
  }

  function awardAffection() {
    affection = Math.min(5, affection + 1);
    renderAffection();
    if (affection >= 5) {
      setTimeout(() => {
        KidsApp.Sound.success();
        KidsApp.speak('だいすき！');
        const rect = currentWrap().getBoundingClientRect();
        KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 20);
        affection = 0;
        renderAffection();
      }, 250);
    }
  }

  function spawnHeart(x, y) {
    const el = document.createElement('div');
    el.className = 'heart-particle';
    el.textContent = KidsApp.choice(['💗', '💕', '💖']);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.setProperty('--hx', KidsApp.rand(-30, 30) + 'px');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  function startPetting() {
    if (petting) return;
    petting = true;
    petSessionStart = performance.now();
    petAwarded = false;
    currentSvg().classList.add('petting');
  }
  function stopPetting() {
    if (!petting) return;
    petting = false;
    currentSvg().classList.remove('petting');
  }

  function onPetMove(x, y) {
    if (!petting) return;
    const now = performance.now();
    if (now - lastHeartAt > 220) {
      spawnHeart(x, y);
      lastHeartAt = now;
    }
    if (now - lastPurrAt > 380) {
      SPECIES[species].purr();
      lastPurrAt = now;
    }
    if (!petAwarded && now - petSessionStart > 1200) {
      petAwarded = true;
      awardAffection();
    }
  }

  function attachPetting(wrapEl) {
    wrapEl.addEventListener('pointerdown', (e) => {
      startPetting();
      onPetMove(e.clientX, e.clientY);
    });
    wrapEl.addEventListener('pointermove', (e) => {
      if (e.buttons === 0 && e.pointerType !== 'touch') return;
      onPetMove(e.clientX, e.clientY);
    });
    wrapEl.addEventListener('pointerup', stopPetting);
    wrapEl.addEventListener('pointercancel', stopPetting);
    wrapEl.addEventListener('pointerleave', stopPetting);
  }
  attachPetting(els.wrapCat);
  attachPetting(els.wrapDog);

  function feed() {
    if (petting) stopPetting();
    const bowlRect = els.treatBowl.getBoundingClientRect();
    const svgRect = currentSvg().getBoundingClientRect();
    const mouthFrac = MOUTH_Y[species] / 240;
    const targetX = svgRect.left + svgRect.width / 2;
    const targetY = svgRect.top + svgRect.height * mouthFrac;

    const treat = document.createElement('div');
    treat.className = 'treat-flying';
    treat.textContent = SPECIES[species].treat;
    treat.style.left = bowlRect.left + bowlRect.width / 2 + 'px';
    treat.style.top = bowlRect.top + bowlRect.height / 2 + 'px';
    treat.style.transform = 'translate(-50%, -50%) scale(1)';
    document.body.appendChild(treat);
    KidsApp.Sound.tap();

    requestAnimationFrame(() => {
      treat.style.left = targetX + 'px';
      treat.style.top = targetY + 'px';
      treat.style.transform = 'translate(-50%, -50%) scale(0.4)';
    });

    setTimeout(() => {
      treat.remove();
      const svg = currentSvg();
      svg.classList.add('eating');
      KidsApp.Sound.munch();
      setTimeout(() => KidsApp.Sound.munch(), 220);
      spawnHeart(targetX, targetY - 20);
      setTimeout(() => {
        svg.classList.remove('eating');
        awardAffection();
      }, 650);
    }, 520);
  }
  els.treatBowl.addEventListener('pointerdown', feed);

  function setSpecies(next) {
    if (species === next) return;
    stopPetting();
    species = next;
    els.wrapCat.classList.toggle('active', next === 'cat');
    els.wrapDog.classList.toggle('active', next === 'dog');
    els.btnCat.classList.toggle('active', next === 'cat');
    els.btnDog.classList.toggle('active', next === 'dog');
    els.petName.textContent = SPECIES[next].name;
    els.treatBowl.textContent = SPECIES[next].treat;
    KidsApp.Sound.tap();
  }
  els.btnCat.addEventListener('pointerdown', () => setSpecies('cat'));
  els.btnDog.addEventListener('pointerdown', () => setSpecies('dog'));

  function scheduleIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!petting) {
        const svg = currentSvg();
        svg.classList.add('bounce');
        KidsApp.speak(SPECIES[species].talk);
        setTimeout(() => svg.classList.remove('bounce'), 550);
      }
      scheduleIdle();
    }, KidsApp.rand(5000, 9000));
  }

  renderAffection();
  scheduleIdle();
})();
