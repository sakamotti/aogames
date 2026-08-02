/*
  Shared runtime for every screen: sound effects (synthesized, no audio files
  to keep the app tiny/offline-friendly), Japanese speech, confetti, the
  hold-to-exit home button, mute button, and PWA/service-worker bootstrap.
*/
(function (global) {
  'use strict';

  // ---- figure out the site root from this <script> tag's own src ----
  // works whether the page is at / (launcher) or /games/<name>/ (a game)
  const thisScript =
    document.currentScript ||
    Array.from(document.getElementsByTagName('script')).find((s) =>
      s.src && s.src.includes('shared/app.js')
    );
  const BASE = thisScript ? thisScript.src.replace(/shared\/app\.js.*$/, '') : './';

  // ---------------------------------------------------------------------
  // Sound: everything is synthesized with WebAudio so there are zero audio
  // asset files to buy, license, or download.
  // ---------------------------------------------------------------------
  let ctx = null;
  function getCtx() {
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const MUTE_KEY = 'kidsapp_muted';
  function isMuted() {
    return localStorage.getItem(MUTE_KEY) === '1';
  }
  function setMuted(v) {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  }

  function playTone({ freq = 440, duration = 0.25, type = 'sine', gain = 0.2, glideTo = null, delay = 0 } = {}) {
    if (isMuted()) return;
    const audio = getCtx();
    if (!audio) return;
    const t0 = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 1), t0 + duration);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function playNoise({ duration = 0.3, filterFreq = 1200, gain = 0.15, delay = 0 } = {}) {
    if (isMuted()) return;
    const audio = getCtx();
    if (!audio) return;
    const t0 = audio.currentTime + delay;
    const bufferSize = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const g = audio.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    src.connect(filter).connect(g).connect(audio.destination);
    src.start(t0);
  }

  const notes = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.0, A: 440.0, B: 493.88, C2: 523.25, D2: 587.33, E2: 659.25 };

  const Sound = {
    unlock() { getCtx(); },
    pop() { playTone({ freq: 500, glideTo: 900, duration: 0.18, type: 'sine', gain: 0.22 }); },
    tap() { playTone({ freq: 320, duration: 0.09, type: 'sine', gain: 0.12 }); },
    boing() { playTone({ freq: 300, glideTo: 90, duration: 0.35, type: 'triangle', gain: 0.2 }); },
    chime() {
      playTone({ freq: notes.C2, duration: 0.4, type: 'triangle', gain: 0.18 });
      playTone({ freq: notes.E2, duration: 0.4, type: 'triangle', gain: 0.14, delay: 0.06 });
    },
    success() {
      [notes.C, notes.E, notes.G, notes.C2].forEach((f, i) =>
        playTone({ freq: f, duration: 0.3, type: 'triangle', gain: 0.18, delay: i * 0.09 })
      );
    },
    splash() { playNoise({ duration: 0.35, filterFreq: 900, gain: 0.16 }); },
    whoosh() { playNoise({ duration: 0.5, filterFreq: 2200, gain: 0.12 }); },
    click() { playTone({ freq: 700, duration: 0.06, type: 'square', gain: 0.06 }); },
    purr() { playNoise({ duration: 0.22, filterFreq: 140, gain: 0.1 }); },
    pant() { playTone({ freq: 380, glideTo: 460, duration: 0.14, type: 'triangle', gain: 0.1 }); },
    munch() { playTone({ freq: 220, glideTo: 140, duration: 0.12, type: 'square', gain: 0.14 }); },
  };

  // ---------------------------------------------------------------------
  // Speech: gentle Japanese narration (animal names, colors, praise) using
  // the browser's built-in speech synthesis. Free, no audio files.
  // ---------------------------------------------------------------------
  let jaVoice = null;
  function pickVoice() {
    if (!global.speechSynthesis) return;
    const voices = global.speechSynthesis.getVoices();
    jaVoice = voices.find((v) => v.lang && v.lang.startsWith('ja')) || null;
  }
  if (global.speechSynthesis) {
    pickVoice();
    global.speechSynthesis.onvoiceschanged = pickVoice;
  }
  function speak(text) {
    if (isMuted() || !global.speechSynthesis) return;
    global.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = 0.85;
    u.pitch = 1.15;
    global.speechSynthesis.speak(u);
  }

  // ---------------------------------------------------------------------
  // Confetti / celebration particles
  // ---------------------------------------------------------------------
  const CONFETTI_COLORS = ['#ff6fa5', '#ffb84d', '#ffd23f', '#06d6a0', '#4ea8de', '#a78bfa'];
  let confettiStyleInjected = false;
  function ensureConfettiStyle() {
    if (confettiStyleInjected) return;
    const style = document.createElement('style');
    style.textContent = `
      .kidsapp-confetti { position:absolute; width:12px; height:12px; border-radius:3px;
        pointer-events:none; will-change: transform, opacity; }
      @keyframes kidsapp-confetti-fall {
        0% { transform: translate(0,0) rotate(0deg); opacity:1; }
        100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity:0; }
      }`;
    document.head.appendChild(style);
    confettiStyleInjected = true;
  }
  function confettiBurst(container, x, y, count = 18) {
    ensureConfettiStyle();
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'kidsapp-confetti';
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 90;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      el.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      el.style.setProperty('--dy', Math.sin(angle) * dist + 60 + 'px');
      el.style.setProperty('--rot', Math.random() * 360 + 'deg');
      el.style.animation = `kidsapp-confetti-fall ${800 + Math.random() * 400}ms ease-out forwards`;
      container.appendChild(el);
      setTimeout(() => el.remove(), 1300);
    }
  }

  function celebrateText(container, x, y, text) {
    const el = document.createElement('div');
    el.className = 'celebrate-pop';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.textContent = text;
    container.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  // ---------------------------------------------------------------------
  // Home button: requires a short *hold* so a toddler mashing the screen
  // can't accidentally back out of a game mid-play.
  // ---------------------------------------------------------------------
  function initHomeButton() {
    if (document.querySelector('.home-button')) return;
    const btn = document.createElement('div');
    btn.className = 'home-button';
    btn.innerHTML = '<div class="home-button__fill"></div><span class="home-button__icon">🏠</span>';
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', 'ホームにもどる');
    document.body.appendChild(btn);

    const fill = btn.querySelector('.home-button__fill');
    const HOLD_MS = 650;
    let start = null;
    let raf = null;

    function reset() {
      start = null;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      fill.style.setProperty('--p', 0);
    }
    function step(ts) {
      if (start === null) return;
      const p = Math.min(100, ((ts - start) / HOLD_MS) * 100);
      fill.style.setProperty('--p', p);
      if (p >= 100) {
        if (navigator.vibrate) navigator.vibrate(30);
        location.href = BASE + 'index.html';
        return;
      }
      raf = requestAnimationFrame(step);
    }
    function begin(e) {
      e.preventDefault();
      Sound.unlock();
      start = performance.now();
      raf = requestAnimationFrame(step);
    }
    btn.addEventListener('pointerdown', begin);
    btn.addEventListener('pointerup', reset);
    btn.addEventListener('pointerleave', reset);
    btn.addEventListener('pointercancel', reset);
  }

  // ---------------------------------------------------------------------
  // Mute button
  // ---------------------------------------------------------------------
  function initMuteButton() {
    if (document.querySelector('.mute-button')) return;
    const btn = document.createElement('button');
    btn.className = 'mute-button';
    btn.setAttribute('aria-label', 'おとの切り替え');
    function render() {
      btn.textContent = isMuted() ? '🔇' : '🔊';
    }
    render();
    btn.addEventListener('click', () => {
      setMuted(!isMuted());
      render();
      Sound.unlock();
      if (!isMuted()) Sound.tap();
    });
    document.body.appendChild(btn);
  }

  // ---------------------------------------------------------------------
  // Canvas helper: device-pixel-ratio aware, resize-safe
  // ---------------------------------------------------------------------
  // Extra dead zone kept clear above the physical bottom edge, on top of
  // whatever the OS safe-area-inset-bottom reports (which is often 0 for
  // Android's gesture bar). Tap targets living here get eaten by the
  // system back/home gesture instead of the game - keep it clear.
  const BOTTOM_GAP_PX = 56;

  function setupCanvas(canvas) {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const ctx2d = canvas.getContext('2d');
    function resize() {
      // canvas.parentElement is always the .stage div, which carries the
      // safe-area padding as real (already-env()-resolved) computed values -
      // reading it here rather than trusting inset:0 on the canvas itself,
      // since an absolutely positioned element's inset:0 is relative to the
      // parent's padding edge and so ignores the parent's own padding.
      const stage = canvas.parentElement;
      const stageRect = stage.getBoundingClientRect();
      const cs = global.getComputedStyle(stage);
      const padTop = parseFloat(cs.paddingTop) || 0;
      const padLeft = parseFloat(cs.paddingLeft) || 0;
      const padRight = parseFloat(cs.paddingRight) || 0;
      const padBottom = parseFloat(cs.paddingBottom) || 0;
      const width = Math.max(50, stageRect.width - padLeft - padRight);
      const height = Math.max(50, stageRect.height - padTop - padBottom - BOTTOM_GAP_PX);

      canvas.style.position = 'absolute';
      canvas.style.left = padLeft + 'px';
      canvas.style.top = padTop + 'px';
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    global.addEventListener('resize', resize);
    global.addEventListener('orientationchange', resize);
    return { ctx: ctx2d, resize, get width() { return canvas.clientWidth; }, get height() { return canvas.clientHeight; } };
  }

  // ---------------------------------------------------------------------
  // Service worker registration (offline play while out and about)
  // ---------------------------------------------------------------------
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    global.addEventListener('load', () => {
      navigator.serviceWorker.register(BASE + 'sw.js').catch(() => {});
    });
    // Auto-refresh once a newer cached version takes over, so an update we
    // ship doesn't silently sit uninstalled on a device that already has
    // the app open/cached. Skip the very first activation (a brand-new
    // visitor has nothing to refresh yet) - only reload when a controller
    // that was already active gets replaced by a newer one.
    let hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloaded) {
        reloaded = true;
        global.location.reload();
      }
      hadController = true;
    });
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ---------------------------------------------------------------------
  // Original mascot cast (NOT any existing licensed character) used as a
  // friendly "host" in quiz/counting style games.
  // ---------------------------------------------------------------------
  const CHARACTERS = [
    { id: 'kuma', name: 'くまた', img: BASE + 'icons/characters/kuma.png' },
    { id: 'neko', name: 'みけ', img: BASE + 'icons/characters/neko.png' },
    { id: 'usagi', name: 'ぴょん', img: BASE + 'icons/characters/usagi.png' },
  ];

  // A round speech bubble next to a mascot portrait, for game prompts.
  function mascotBubble(container, { img, name = '', text = '' } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'mascot-row';
    wrap.innerHTML =
      `<img class="mascot-avatar" src="${img}" alt="${name}">` +
      `<div class="mascot-speech"><span class="mascot-speech__text"></span></div>`;
    container.appendChild(wrap);
    const textEl = wrap.querySelector('.mascot-speech__text');
    function setText(t) {
      textEl.textContent = t;
    }
    setText(text);
    return { el: wrap, setText };
  }

  function initCommon(opts = {}) {
    document.addEventListener(
      'pointerdown',
      () => {
        Sound.unlock();
      },
      { once: true, passive: true }
    );
    if (opts.home !== false) initHomeButton();
    initMuteButton();
    registerServiceWorker();
  }

  global.KidsApp = {
    BASE,
    Sound,
    speak,
    isMuted,
    setMuted,
    confettiBurst,
    celebrateText,
    setupCanvas,
    registerServiceWorker,
    initHomeButton,
    initMuteButton,
    initCommon,
    rand,
    choice,
    CHARACTERS,
    mascotBubble,
    BOTTOM_GAP: BOTTOM_GAP_PX,
  };
})(window);
