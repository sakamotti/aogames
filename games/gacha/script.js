(function () {
  KidsApp.initCommon();

  const ANIMALS = [
    { key: 'dog', emoji: '🐶', name: 'いぬ' },
    { key: 'cat', emoji: '🐱', name: 'ねこ' },
    { key: 'cow', emoji: '🐮', name: 'うし' },
    { key: 'frog', emoji: '🐸', name: 'かえる' },
    { key: 'pig', emoji: '🐷', name: 'ぶた' },
    { key: 'chicken', emoji: '🐔', name: 'にわとり' },
    { key: 'lion', emoji: '🦁', name: 'らいおん' },
    { key: 'elephant', emoji: '🐘', name: 'ぞう' },
    { key: 'sheep', emoji: '🐑', name: 'ひつじ' },
  ];
  const CAPSULE_COLORS = ['#ff6fa5', '#ffb84d', '#ffd23f', '#06d6a0', '#4ea8de', '#a78bfa', '#ff8a7a', '#2ec4b6'];
  const COLLECTION_KEY = 'kidsapp_gacha_collection';

  const els = {
    dome: document.getElementById('dome'),
    machine: document.getElementById('machine'),
    crank: document.getElementById('crank'),
    crankHandle: document.getElementById('crankHandle'),
    coinTray: document.getElementById('coinTray'),
    coinDrag: document.getElementById('coinDrag'),
    slot: document.querySelector('.machine__slot'),
    capsule: document.getElementById('capsule'),
    prizeEmoji: document.getElementById('prizeEmoji'),
    prizeLabel: document.getElementById('prizeLabel'),
    collectionRow: document.getElementById('collectionRow'),
  };

  // Decorative bobbing capsules inside the dome window.
  for (let i = 0; i < 10; i++) {
    const dot = document.createElement('div');
    dot.className = 'capsule-dot';
    dot.style.background = KidsApp.choice(CAPSULE_COLORS);
    dot.style.left = KidsApp.rand(8, 78) + '%';
    dot.style.top = KidsApp.rand(10, 68) + '%';
    dot.style.animationDelay = KidsApp.rand(0, 2) + 's';
    els.dome.appendChild(dot);
  }

  function loadCollection() {
    try {
      return new Set(JSON.parse(localStorage.getItem(COLLECTION_KEY) || '[]'));
    } catch (e) {
      return new Set();
    }
  }
  function saveCollection(set) {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify([...set]));
  }
  let collection = loadCollection();

  const slotEls = {};
  ANIMALS.forEach((a) => {
    const slot = document.createElement('div');
    slot.className = 'collection-row__slot';
    slot.textContent = a.emoji;
    if (collection.has(a.key)) slot.classList.add('got');
    els.collectionRow.appendChild(slot);
    slotEls[a.key] = slot;
  });

  let hasCoin = false;
  let crankTaps = 0;
  let busy = false;

  // ---- Coin: slide it up from its tray into the slot (not a tap) ----
  let restPos = { x: 0, y: 0 };
  let targetPos = { x: 0, y: 0 };
  let dragging = false;
  const SUCCESS_PROGRESS = 0.6; // doesn't need to be dragged all the way to the slot to count

  function setCoinTransform(scale) {
    els.coinDrag.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }
  function placeCoinAt(x, y) {
    els.coinDrag.style.left = x + 'px';
    els.coinDrag.style.top = y + 'px';
  }
  function computeCoinPositions() {
    const trayRect = els.coinTray.getBoundingClientRect();
    restPos = { x: trayRect.left + trayRect.width / 2, y: trayRect.top + trayRect.height / 2 };
    const slotRect = els.slot.getBoundingClientRect();
    targetPos = { x: slotRect.left + slotRect.width / 2, y: slotRect.top + slotRect.height / 2 };
    if (!dragging && !hasCoin) {
      setCoinTransform(1);
      placeCoinAt(restPos.x, restPos.y);
    }
  }

  els.coinDrag.addEventListener('pointerdown', (e) => {
    if (busy || hasCoin) return;
    dragging = true;
    els.coinDrag.classList.add('dragging');
    els.coinDrag.setPointerCapture(e.pointerId);
    KidsApp.Sound.unlock();
  });
  els.coinDrag.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const y = Math.max(targetPos.y, Math.min(restPos.y, e.clientY));
    const span = restPos.y - targetPos.y || 1;
    const progress = (restPos.y - y) / span;
    const x = restPos.x + (targetPos.x - restPos.x) * progress;
    placeCoinAt(x, y);
  });
  function endCoinDrag() {
    if (!dragging) return;
    dragging = false;
    els.coinDrag.classList.remove('dragging');
    const curTop = parseFloat(els.coinDrag.style.top) || restPos.y;
    const span = restPos.y - targetPos.y || 1;
    const progress = (restPos.y - curTop) / span;
    if (progress >= SUCCESS_PROGRESS) {
      hasCoin = true;
      placeCoinAt(targetPos.x, targetPos.y);
      KidsApp.Sound.click();
      setTimeout(() => {
        setCoinTransform(0);
        KidsApp.Sound.chime();
      }, 90);
      els.crank.classList.add('ready');
    } else {
      placeCoinAt(restPos.x, restPos.y);
      KidsApp.Sound.tap();
    }
  }
  els.coinDrag.addEventListener('pointerup', endCoinDrag);
  els.coinDrag.addEventListener('pointercancel', endCoinDrag);

  requestAnimationFrame(() => requestAnimationFrame(computeCoinPositions));
  window.addEventListener('resize', computeCoinPositions);
  window.addEventListener('orientationchange', () => setTimeout(computeCoinPositions, 250));

  function resetCoin() {
    hasCoin = false;
    computeCoinPositions();
  }

  function shakeMachine() {
    els.machine.classList.remove('shake');
    void els.machine.offsetWidth;
    els.machine.classList.add('shake');
  }

  els.crank.addEventListener('pointerdown', () => {
    if (busy) return;
    if (!hasCoin) {
      shakeMachine();
      KidsApp.Sound.tap();
      return;
    }
    crankTaps++;
    els.crankHandle.style.transform = `rotate(${crankTaps * 120}deg)`;
    shakeMachine();
    KidsApp.Sound.click();
    if (crankTaps >= 3) {
      dispense();
    }
  });

  function dispense() {
    busy = true;
    els.crank.classList.remove('ready');
    KidsApp.Sound.whoosh();

    const prize = KidsApp.choice(ANIMALS);
    els.capsule.style.background = 'none';
    const topHalf = els.capsule.querySelector('.capsule__half--top');
    const bottomHalf = els.capsule.querySelector('.capsule__half--bottom');
    const color = KidsApp.choice(CAPSULE_COLORS);
    topHalf.style.background = color;

    els.capsule.classList.remove('open');
    els.prizeEmoji.textContent = prize.emoji;
    els.prizeLabel.textContent = '';

    requestAnimationFrame(() => els.capsule.classList.add('drop'));

    setTimeout(() => {
      KidsApp.Sound.pop();
      els.capsule.classList.add('open');
      KidsApp.AnimalSounds[prize.key]();
      const rect = els.capsule.getBoundingClientRect();
      KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 14);

      const isNew = !collection.has(prize.key);
      collection.add(prize.key);
      saveCollection(collection);
      slotEls[prize.key].classList.add('got');

      els.prizeLabel.textContent = prize.name + ' が でてきたよ！';
      if (isNew) {
        const badge = document.createElement('div');
        badge.className = 'new-badge';
        badge.textContent = 'はじめて！';
        badge.style.left = rect.left + rect.width / 2 + 'px';
        badge.style.top = rect.top - 10 + 'px';
        document.body.appendChild(badge);
        setTimeout(() => badge.remove(), 950);
        setTimeout(() => KidsApp.speak(prize.name + '、はじめて ゲットだね！'), 400);
      } else {
        setTimeout(() => KidsApp.speak(prize.name + 'が でてきたよ'), 400);
      }
    }, 600);

    setTimeout(() => {
      els.capsule.classList.remove('drop', 'open');
      els.crankHandle.style.transition = 'none';
      els.crankHandle.style.transform = 'rotate(0deg)';
      requestAnimationFrame(() => {
        els.crankHandle.style.transition = '';
      });
      crankTaps = 0;
      busy = false;
      resetCoin();
      els.prizeLabel.textContent = '';
    }, 2900);
  }
})();
