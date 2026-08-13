(function () {
  'use strict';

  KidsApp.initCommon();

  const PETS = {
    cat: {
      name: 'みけ', image: '../../icons/animals/cat.png', treat: '🐟', sfx: 'cat',
      happySound: () => KidsApp.Sound.purr(), petVoice: 'みけを やさしく なでなで してね',
    },
    dog: {
      name: 'ポチ', image: '../../icons/animals/dog.png', treat: '🍖', sfx: 'dog',
      happySound: () => KidsApp.Sound.pant(), petVoice: 'ポチを やさしく なでなで してね',
    },
  };

  const CARE = {
    food: { icon: '🍽️', need: 'おなか すいた！', doing: 'もぐもぐ', voice: 'ごはんが ほしいよ', className: 'eating' },
    water: { icon: '💧', need: 'のど かわいた！', doing: 'ごくごく', voice: 'おみずが ほしいよ', className: 'drinking' },
    brush: { icon: '🪮', need: 'けを ととのえたい！', doing: 'きれい きれい', voice: 'ブラシを してほしいよ', className: 'brushing' },
    sleep: { icon: '💤', need: 'ねむたいな', doing: 'すやすや', voice: 'ねんね したいよ', className: 'sleeping' },
  };

  const els = {
    btnCat: document.getElementById('btnCat'),
    btnDog: document.getElementById('btnDog'),
    affectionRow: document.getElementById('affectionRow'),
    petName: document.getElementById('petName'),
    petArea: document.querySelector('.pet-area'),
    petActor: document.getElementById('petActor'),
    petImage: document.getElementById('petImage'),
    hintBubble: document.getElementById('hintBubble'),
    foodSpot: document.getElementById('foodSpot'),
    foodIcon: document.getElementById('foodIcon'),
    careButtons: [...document.querySelectorAll('[data-care]')],
    treatIcon: document.getElementById('treatIcon'),
    rubGlow: document.getElementById('rubGlow'),
  };

  let species = 'cat';
  const affection = { cat: 0, dog: 0 };
  let activePointer = null;
  let lastPoint = null;
  let strokeDistance = 0;
  let particleDistance = 0;
  let lastHappySoundAt = 0;
  let feeding = false;
  const currentNeed = { cat: 'food', dog: 'water' };
  let idleTimer = null;

  for (let i = 0; i < 5; i++) {
    const heart = document.createElement('span');
    heart.textContent = '💗';
    els.affectionRow.appendChild(heart);
  }

  function currentPet() {
    return PETS[species];
  }

  function renderAffection() {
    [...els.affectionRow.children].forEach((heart, index) => {
      heart.classList.toggle('filled', index < affection[species]);
    });
    els.affectionRow.setAttribute('aria-label', `なかよし ${affection[species]} / 5`);
  }

  function showHint(text) {
    els.hintBubble.textContent = text;
    els.hintBubble.classList.remove('pop');
    void els.hintBubble.offsetWidth;
    els.hintBubble.classList.add('pop');
  }

  function showNeed(speak = false) {
    const care = CARE[currentNeed[species]];
    showHint(care.need);
    if (speak) KidsApp.speak(`${currentPet().name}は ${care.voice}`);
  }

  function setCareButtonsDisabled(disabled) {
    els.careButtons.forEach((button) => { button.disabled = disabled; });
  }

  function advanceNeed() {
    const choices = Object.keys(CARE).filter((key) => key !== currentNeed[species]);
    currentNeed[species] = KidsApp.choice(choices);
    setTimeout(() => showNeed(true), 900);
  }

  function spawnHeart(x, y) {
    const particle = document.createElement('div');
    particle.className = 'heart-particle';
    particle.textContent = KidsApp.choice(['💗', '💕', '💖']);
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty('--drift', `${KidsApp.rand(-38, 38)}px`);
    particle.style.setProperty('--turn', `${KidsApp.rand(-18, 18)}deg`);
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 850);
  }

  function spawnSpark(x, y) {
    const particle = document.createElement('div');
    particle.className = 'spark-particle';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty('--sx', `${KidsApp.rand(-35, 35)}px`);
    particle.style.setProperty('--sy', `${KidsApp.rand(-38, 10)}px`);
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 560);
  }

  function celebrateFriendship() {
    showHint('だいすき！');
    KidsApp.Sound.success();
    KidsApp.speak(`${currentPet().name}も だいすき！`);
    const rect = els.petImage.getBoundingClientRect();
    KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 22);
    setTimeout(() => {
      affection[species] = 0;
      renderAffection();
      showHint('もっと なでてね');
    }, 1300);
  }

  function awardAffection() {
    affection[species] = Math.min(5, affection[species] + 1);
    renderAffection();
    showHint(KidsApp.choice(['うれしい！', 'もっと！', 'きもちいい！']));
    KidsApp.Sound.chime();
    if (affection[species] >= 5) setTimeout(celebrateFriendship, 260);
  }

  function beginPetting(event) {
    if (feeding || activePointer !== null) return;
    activePointer = event.pointerId;
    lastPoint = { x: event.clientX, y: event.clientY };
    strokeDistance = 0;
    particleDistance = 0;
    els.petActor.classList.add('petting');
    els.rubGlow.classList.add('visible');
    els.rubGlow.style.left = `${event.clientX}px`;
    els.rubGlow.style.top = `${event.clientY}px`;
    els.petActor.setPointerCapture?.(event.pointerId);
    spawnSpark(event.clientX, event.clientY);
  }

  function continuePetting(event) {
    if (event.pointerId !== activePointer || !lastPoint) return;
    const dx = event.clientX - lastPoint.x;
    const dy = event.clientY - lastPoint.y;
    const distance = Math.min(Math.hypot(dx, dy), 55);
    lastPoint = { x: event.clientX, y: event.clientY };
    els.rubGlow.style.left = `${event.clientX}px`;
    els.rubGlow.style.top = `${event.clientY}px`;

    if (distance < 2) return;
    strokeDistance += distance;
    particleDistance += distance;

    if (particleDistance >= 52) {
      particleDistance = 0;
      spawnHeart(event.clientX, event.clientY);
      spawnSpark(event.clientX + KidsApp.rand(-16, 16), event.clientY + KidsApp.rand(-16, 16));
    }

    const now = performance.now();
    if (now - lastHappySoundAt > 430) {
      currentPet().happySound();
      lastHappySoundAt = now;
    }

    if (strokeDistance >= 285) {
      strokeDistance -= 285;
      awardAffection();
    }
  }

  function endPetting(event) {
    if (event && event.pointerId !== activePointer) return;
    activePointer = null;
    lastPoint = null;
    strokeDistance = 0;
    els.petActor.classList.remove('petting');
    els.rubGlow.classList.remove('visible');
  }

  els.petActor.addEventListener('pointerdown', beginPetting);
  els.petActor.addEventListener('pointermove', continuePetting);
  els.petActor.addEventListener('pointerup', endPetting);
  els.petActor.addEventListener('pointercancel', endPetting);
  els.petActor.addEventListener('lostpointercapture', endPetting);
  els.petActor.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && !feeding) {
      event.preventDefault();
      spawnHeart(innerWidth / 2, innerHeight / 2);
      awardAffection();
    }
  });

  const WALK_MS = 760;

  function feed() {
    if (feeding) return;
    endPetting();
    feeding = true;
    setCareButtonsDisabled(true);
    const side = Math.random() < .5 ? -1 : 1;
    const available = Math.min(96, Math.max(58, els.petArea.clientWidth * .19));
    const offset = side * available;

    els.foodSpot.style.left = `calc(50% + ${offset}px)`;
    els.foodSpot.classList.remove('eaten');
    void els.foodSpot.offsetWidth;
    els.foodSpot.classList.add('shown');
    showHint('ごはんだ！');
    KidsApp.Sound.tap();

    els.petActor.classList.add('walking');
    els.petActor.style.transform = `translateX(${offset}px)`;

    setTimeout(() => {
      els.petActor.classList.remove('walking');
      els.petActor.classList.add('eating');
      showHint('もぐもぐ');
      KidsApp.Sound.munch();
      setTimeout(() => KidsApp.Sound.munch(), 230);

      setTimeout(() => {
        const foodRect = els.foodSpot.getBoundingClientRect();
        els.foodSpot.classList.add('eaten');
        spawnHeart(foodRect.left + foodRect.width / 2, foodRect.top);
        awardAffection();
        advanceNeed();

        setTimeout(() => {
          els.petActor.classList.remove('eating');
          els.petActor.classList.add('walking');
          els.petActor.style.transform = 'translateX(0)';
          setTimeout(() => {
            els.petActor.classList.remove('walking');
            els.foodSpot.classList.remove('shown', 'eaten');
            setCareButtonsDisabled(false);
            feeding = false;
          }, WALK_MS);
        }, 560);
      }, 560);
    }, WALK_MS);
  }

  function care(action) {
    if (feeding) return;
    if (action !== currentNeed[species]) {
      showNeed(true);
      KidsApp.Sound.tap();
      return;
    }
    if (action === 'food') {
      feed();
      return;
    }

    endPetting();
    feeding = true;
    setCareButtonsDisabled(true);
    const careInfo = CARE[action];
    els.foodIcon.textContent = careInfo.icon;
    els.foodSpot.style.left = '50%';
    els.foodSpot.classList.remove('eaten');
    void els.foodSpot.offsetWidth;
    els.foodSpot.classList.add('shown');
    els.petActor.classList.add('caring', careInfo.className);
    showHint(careInfo.doing);
    KidsApp.Sound.chime();

    setTimeout(() => {
      const rect = els.petImage.getBoundingClientRect();
      spawnHeart(rect.left + rect.width / 2, rect.top + rect.height * .25);
      els.foodSpot.classList.add('eaten');
      awardAffection();
      advanceNeed();
      setTimeout(() => {
        els.petActor.classList.remove('caring', careInfo.className);
        els.foodSpot.classList.remove('shown', 'eaten');
        els.foodIcon.textContent = currentPet().treat;
        setCareButtonsDisabled(false);
        feeding = false;
      }, 760);
    }, action === 'sleep' ? 1500 : 1050);
  }

  els.careButtons.forEach((button) => {
    button.addEventListener('pointerdown', () => care(button.dataset.care));
  });

  function setSpecies(next) {
    if (feeding || next === species) return;
    endPetting();
    species = next;
    const pet = currentPet();
    els.petImage.src = pet.image;
    els.petImage.alt = pet.name;
    els.petName.textContent = pet.name;
    els.treatIcon.textContent = pet.treat;
    els.foodIcon.textContent = pet.treat;
    els.petActor.setAttribute('aria-label', `${pet.name}をなでる`);
    els.petArea.setAttribute('aria-label', `${pet.name}をなでる場所`);
    els.careButtons.forEach((button) => {
      const labels = {
        food: `${pet.name}にごはんをあげる`,
        water: `${pet.name}におみずをあげる`,
        brush: `${pet.name}をブラシする`,
        sleep: `${pet.name}をねかせる`,
      };
      button.setAttribute('aria-label', labels[button.dataset.care]);
    });
    els.btnCat.classList.toggle('active', next === 'cat');
    els.btnDog.classList.toggle('active', next === 'dog');
    els.btnCat.setAttribute('aria-pressed', String(next === 'cat'));
    els.btnDog.setAttribute('aria-pressed', String(next === 'dog'));
    renderAffection();
    showNeed();
    KidsApp.Sound.tap();
    KidsApp.speak(`${pet.petVoice} ${CARE[currentNeed[species]].voice}`);
  }

  els.btnCat.addEventListener('pointerdown', () => setSpecies('cat'));
  els.btnDog.addEventListener('pointerdown', () => setSpecies('dog'));

  function scheduleIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (activePointer === null && !feeding) {
        els.petActor.classList.add('bounce');
        showNeed();
        KidsApp.AnimalSounds[currentPet().sfx]();
        setTimeout(() => els.petActor.classList.remove('bounce'), 680);
      }
      scheduleIdle();
    }, KidsApp.rand(6200, 9800));
  }

  renderAffection();
  showNeed();
  scheduleIdle();
})();
