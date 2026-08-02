(function () {
  KidsApp.initCommon();

  const SPECIES = {
    cat: {
      wrap: 'wrapCat', svg: 'svgCat', actor: 'actorCat', food: 'foodCat',
      name: 'みけ', treat: '🐟', talk: 'にゃー', purr: () => KidsApp.Sound.purr(),
    },
    dog: {
      wrap: 'wrapDog', svg: 'svgDog', actor: 'actorDog', food: 'foodDog',
      name: 'ポチ', treat: '🍖', talk: 'わん！', purr: () => KidsApp.Sound.pant(),
    },
  };

  const els = {
    btnCat: document.getElementById('btnCat'),
    btnDog: document.getElementById('btnDog'),
    affectionRow: document.getElementById('affectionRow'),
    petName: document.getElementById('petName'),
    treatBowl: document.getElementById('treatBowl'),
    wrapCat: document.getElementById('wrapCat'),
    wrapDog: document.getElementById('wrapDog'),
  };

  let species = 'cat';
  let affection = 0;
  let petting = false;
  let petSessionStart = 0;
  let petAwarded = false;
  let lastHeartAt = 0;
  let lastPurrAt = 0;
  let idleTimer = null;
  let feeding = false;

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
  function currentActor() {
    return document.getElementById(SPECIES[species].actor);
  }
  function currentFood() {
    return document.getElementById(SPECIES[species].food);
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
    if (petting || feeding) return;
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

  // Feeding is a little story: a bowl of food appears on the ground to one
  // side, the pet notices, waddles over to it, eats, then wanders back.
  const WALK_PX = 92;
  const WALK_MS = 800;

  function feed() {
    if (feeding) return;
    if (petting) stopPetting();
    feeding = true;
    els.treatBowl.disabled = true;

    const svg = currentSvg();
    const actor = currentActor();
    const food = currentFood();
    const side = Math.random() < 0.5 ? -1 : 1;
    const offset = side * WALK_PX;

    food.style.left = `calc(50% + ${offset}px)`;
    food.classList.remove('eaten');
    // force reflow so the pop-in transition replays even if reused quickly
    void food.offsetWidth;
    food.classList.add('shown');
    KidsApp.Sound.tap();

    svg.classList.add('walking');
    actor.style.transform = `translateX(${offset}px)`;

    setTimeout(() => {
      svg.classList.remove('walking');
      svg.classList.add('eating');
      KidsApp.Sound.munch();
      setTimeout(() => KidsApp.Sound.munch(), 220);
      food.classList.add('eaten');
      const rect = food.getBoundingClientRect();
      spawnHeart(rect.left + rect.width / 2, rect.top);

      setTimeout(() => {
        svg.classList.remove('eating');
        awardAffection();
        svg.classList.add('walking');
        actor.style.transform = 'translateX(0)';
        setTimeout(() => {
          svg.classList.remove('walking');
          feeding = false;
          els.treatBowl.disabled = false;
        }, WALK_MS);
      }, 700);
    }, WALK_MS);
  }
  els.treatBowl.addEventListener('pointerdown', feed);

  function setSpecies(next) {
    if (species === next || feeding) return;
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
      if (!petting && !feeding) {
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
