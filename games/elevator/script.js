(function () {
  KidsApp.initCommon();

  // Bottom to top, matching a real Japanese elevator panel.
  const FLOORS = [
    { label: 'B2', speech: 'ちか に かい' },
    { label: 'B1', speech: 'ちか いち かい' },
    { label: '1', speech: 'いっかい です' },
    { label: '2', speech: 'にかい です' },
    { label: '3', speech: 'さんがい です' },
    { label: '4', speech: 'よんかい です' },
    { label: '5', speech: 'ごかい です' },
    { label: '6', speech: 'ろっかい です' },
    { label: '7', speech: 'ななかい です' },
    { label: '8', speech: 'はっかい です' },
    { label: '9', speech: 'きゅうかい です' },
    { label: '10', speech: 'じゅっかい です' },
    { label: '屋上', speech: 'おくじょう です' },
  ];
  const START_INDEX = 2; // "1"

  const els = {
    grid: document.getElementById('floorGrid'),
    floorNum: document.getElementById('floorNum'),
    arrowUp: document.getElementById('arrowUp'),
    arrowDown: document.getElementById('arrowDown'),
    doors: document.getElementById('doors'),
    doorsMascot: document.getElementById('doorsMascot'),
    btnOpen: document.getElementById('btnOpen'),
    btnClose: document.getElementById('btnClose'),
  };

  let currentIndex = START_INDEX;
  let traveling = false;
  let doorsOpen = false;
  let travelTimer = null;
  let closeTimer = null;
  let activeBtn = null;

  els.floorNum.textContent = FLOORS[currentIndex].label;

  const buttons = FLOORS.map((floor, i) => {
    const btn = document.createElement('button');
    btn.className = 'floor-btn';
    btn.textContent = floor.label;
    btn.addEventListener('pointerdown', () => requestFloor(i, btn));
    els.grid.appendChild(btn);
    return btn;
  });

  function clearTimers() {
    clearTimeout(travelTimer);
    clearTimeout(closeTimer);
    travelTimer = null;
    closeTimer = null;
  }

  function closeDoors(after) {
    if (!doorsOpen) {
      if (after) after();
      return;
    }
    doorsOpen = false;
    els.doors.classList.remove('open');
    KidsApp.Sound.whoosh();
    setTimeout(() => after && after(), 400);
  }

  function openDoors(index) {
    doorsOpen = true;
    els.doorsMascot.src = KidsApp.choice(KidsApp.CHARACTERS).img;
    els.doors.classList.add('open');
    KidsApp.Sound.whoosh();
    const rect = els.doors.getBoundingClientRect();
    KidsApp.confettiBurst(document.body, rect.left + rect.width / 2, rect.top + rect.height / 2, 10);
    KidsApp.speak(FLOORS[index].speech, 100);

    closeTimer = setTimeout(() => {
      closeDoors(() => {
        traveling = false;
        if (activeBtn) activeBtn.classList.remove('lit');
        activeBtn = null;
      });
    }, 2200);
  }

  function stepTravel(targetIndex, btn) {
    if (currentIndex === targetIndex) {
      els.arrowUp.classList.remove('on');
      els.arrowDown.classList.remove('on');
      KidsApp.Sound.chime();
      openDoors(targetIndex);
      return;
    }
    const goingUp = targetIndex > currentIndex;
    els.arrowUp.classList.toggle('on', goingUp);
    els.arrowDown.classList.toggle('on', !goingUp);
    currentIndex += goingUp ? 1 : -1;
    els.floorNum.textContent = FLOORS[currentIndex].label;
    KidsApp.Sound.click();
    travelTimer = setTimeout(() => stepTravel(targetIndex, btn), 190);
  }

  function requestFloor(targetIndex, btn) {
    clearTimers();
    buttons.forEach((b) => b.classList.remove('lit'));
    btn.classList.add('lit');
    activeBtn = btn;
    KidsApp.Sound.tap();

    const begin = () => {
      traveling = true;
      stepTravel(targetIndex, btn);
    };

    if (doorsOpen) {
      closeDoors(begin);
    } else {
      begin();
    }
  }

  els.btnOpen.addEventListener('pointerdown', () => {
    KidsApp.Sound.tap();
    if (traveling && !doorsOpen) return;
    clearTimeout(closeTimer);
    if (!doorsOpen) {
      openDoors(currentIndex);
    } else {
      // already open - just push the auto-close back out
      closeTimer = setTimeout(() => {
        closeDoors(() => {
          traveling = false;
          if (activeBtn) activeBtn.classList.remove('lit');
          activeBtn = null;
        });
      }, 2200);
    }
  });

  els.btnClose.addEventListener('pointerdown', () => {
    KidsApp.Sound.tap();
    if (!doorsOpen) return;
    clearTimeout(closeTimer);
    closeDoors(() => {
      traveling = false;
      if (activeBtn) activeBtn.classList.remove('lit');
      activeBtn = null;
    });
  });
})();
