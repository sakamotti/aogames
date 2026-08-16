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

  // On touchscreen Chrome (notably ChromeOS tablets, which treat a long
  // press as a right-click), a long hold fires a native `contextmenu` event
  // independently of any pointerdown/touchstart preventDefault() - it has
  // to be stopped separately, or every long-press interaction (the hold-to-
  // exit home button, dragging in shape-sorter, sustained petting, ...)
  // pops the browser's menu open instead. There is nothing in this app
  // that ever needs a context menu, so block it everywhere, always.
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------------------------------------------------------------------
  // Sound: everything is synthesized with WebAudio so there are zero audio
  // asset files to buy, license, or download.
  // ---------------------------------------------------------------------
  let ctx = null;
  let audioUnlocked = false;
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

  // Small, local-only learning profile. Games begin at a moderate level and
  // unlock harder rounds after repeated success. No names, scores, or personal
  // information are stored, and nothing leaves the device.
  const LEARNING_KEY = 'kidsapp_learning_v2';
  function readLearning() {
    try {
      return JSON.parse(localStorage.getItem(LEARNING_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }
  function writeLearning(data) {
    try {
      localStorage.setItem(LEARNING_KEY, JSON.stringify(data));
    } catch (_) {}
  }
  function createAdaptive(id, levelCount, opts = {}) {
    const promoteAfter = opts.promoteAfter ?? 2;
    const easeAfter = opts.easeAfter ?? 3;
    const startLevel = opts.startLevel ?? Math.min(1, levelCount - 1);
    const saved = readLearning()[id] || {};
    const savedLevel = Number(saved.level);
    let level = Math.max(0, Math.min(levelCount - 1, Number.isFinite(savedLevel) ? savedLevel : startLevel));
    let successes = Number(saved.successes) || 0;
    let struggles = Number(saved.struggles) || 0;

    function save() {
      const all = readLearning();
      all[id] = { level, successes, struggles };
      writeLearning(all);
    }
    function record(ok) {
      if (ok) {
        successes++;
        struggles = 0;
        if (successes >= promoteAfter && level < levelCount - 1) {
          level++;
          successes = 0;
        }
      } else {
        struggles++;
        successes = 0;
        if (struggles >= easeAfter && level > 0) {
          level--;
          struggles = 0;
        }
      }
      save();
      return level;
    }
    return {
      get level() { return level; },
      record,
    };
  }

  function playTone({ freq = 440, duration = 0.25, type = 'sine', gain = 0.2, glideTo = null, delay = 0 } = {}) {
    if (isMuted() || !audioUnlocked) return;
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
    if (isMuted() || !audioUnlocked) return;
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

  // A richer "creature vocalization" synth: unison-detuned oscillators for
  // buzzy thickness, run through a filter whose cutoff can sweep over time
  // (a crude formant/"mouth opening" effect), optionally blended with
  // filtered noise for breath/rasp texture, optional pitch vibrato, and a
  // small random pitch jitter each call so repeated taps don't sound like
  // an identical looping robot. Still WebAudio synthesis, not a recording -
  // there's a hard ceiling on realism without real audio - but this reads
  // as far more organic than a single clean oscillator tone.
  function playCreature({
    pitch,
    duration = pitch[pitch.length - 1].t,
    type = 'sawtooth',
    unisonDetune = 0,
    filterType = 'lowpass',
    filterFreq = 4000,
    filterQ = 1,
    vibratoRate = 0,
    vibratoDepth = 0,
    noiseMix = 0,
    noiseFilterFreq = 1200,
    tremoloRate = 0,
    tremoloDepth = 0,
    gain = 0.22,
    jitter = 0.04,
    delay = 0,
  }) {
    if (isMuted() || !audioUnlocked) return;
    const audio = getCtx();
    if (!audio) return;
    const t0 = audio.currentTime + delay;
    const jitterMul = 1 + (Math.random() * 2 - 1) * jitter;

    const filter = audio.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = filterQ;
    if (Array.isArray(filterFreq)) {
      filter.frequency.setValueAtTime(filterFreq[0].f, t0);
      for (let i = 1; i < filterFreq.length; i++) filter.frequency.linearRampToValueAtTime(filterFreq[i].f, t0 + filterFreq[i].t);
    } else {
      filter.frequency.value = filterFreq;
    }

    const master = audio.createGain();
    master.gain.setValueAtTime(0, t0);
    master.gain.linearRampToValueAtTime(gain, t0 + Math.min(0.025, duration / 5));
    master.gain.setValueAtTime(gain, t0 + Math.max(0, duration - 0.09));
    master.gain.linearRampToValueAtTime(0.0001, t0 + duration);

    let outNode = master;
    if (tremoloRate > 0) {
      const tremGain = audio.createGain();
      const lfo = audio.createOscillator();
      const lfoGain = audio.createGain();
      lfo.frequency.value = tremoloRate;
      lfoGain.gain.value = tremoloDepth;
      lfo.connect(lfoGain).connect(tremGain.gain);
      tremGain.gain.value = 1 - tremoloDepth;
      lfo.start(t0);
      lfo.stop(t0 + duration + 0.05);
      master.connect(tremGain);
      outNode = tremGain;
    }
    outNode.connect(audio.destination);
    filter.connect(master);

    let pitchLfo = null;
    if (vibratoRate > 0) {
      pitchLfo = audio.createOscillator();
      const pitchLfoGain = audio.createGain();
      pitchLfo.frequency.value = vibratoRate;
      pitchLfoGain.gain.value = vibratoDepth;
      pitchLfo.connect(pitchLfoGain);
      pitchLfo.start(t0);
      pitchLfo.stop(t0 + duration + 0.05);
      pitchLfo._gainNode = pitchLfoGain;
    }

    function makeOsc(detuneCents) {
      const osc = audio.createOscillator();
      osc.type = type;
      osc.detune.value = detuneCents;
      osc.frequency.setValueAtTime(pitch[0].f * jitterMul, t0);
      for (let i = 1; i < pitch.length; i++) osc.frequency.linearRampToValueAtTime(pitch[i].f * jitterMul, t0 + pitch[i].t);
      if (pitchLfo) pitchLfo._gainNode.connect(osc.detune);
      osc.connect(filter);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    }
    makeOsc(0);
    if (unisonDetune) {
      makeOsc(unisonDetune);
      makeOsc(-unisonDetune);
    }

    if (noiseMix > 0) {
      const bufferSize = Math.max(1, Math.floor(audio.sampleRate * duration));
      const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const src = audio.createBufferSource();
      src.buffer = buffer;
      const nf = audio.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = noiseFilterFreq;
      nf.Q.value = 1.1;
      const ng = audio.createGain();
      ng.gain.value = noiseMix;
      src.connect(nf).connect(ng).connect(master);
      src.start(t0);
    }
  }

  // Synthesized animal cries (WebAudio, not TTS reading the onomatopoeia
  // text out loud) - kept as the offline-safe fallback for playAnimalClip()
  // below, used if a real recording ever fails to load/play.
  const AnimalSoundsSynth = {
    dog() {
      [0, 200].forEach((delay) =>
        playCreature({
          pitch: [{ f: 260, t: 0 }, { f: 420, t: 0.03 }, { f: 180, t: 0.15 }],
          type: 'sawtooth',
          unisonDetune: 18,
          filterType: 'lowpass',
          filterFreq: [{ f: 600, t: 0 }, { f: 2400, t: 0.04 }, { f: 500, t: 0.16 }],
          filterQ: 2,
          noiseMix: 0.18,
          noiseFilterFreq: 1800,
          gain: 0.26,
          delay: delay / 1000,
        })
      );
    },
    cat() {
      playCreature({
        pitch: [{ f: 380, t: 0 }, { f: 720, t: 0.16 }, { f: 340, t: 0.55 }],
        type: 'sawtooth',
        unisonDetune: 10,
        filterType: 'bandpass',
        filterFreq: 1900,
        filterQ: 3,
        vibratoRate: 12,
        vibratoDepth: 18,
        noiseMix: 0.1,
        noiseFilterFreq: 2400,
        gain: 0.22,
        duration: 0.55,
      });
    },
    cow() {
      playCreature({
        pitch: [{ f: 150, t: 0 }, { f: 130, t: 0.5 }, { f: 85, t: 0.9 }],
        type: 'sawtooth',
        unisonDetune: 14,
        filterType: 'lowpass',
        filterFreq: [{ f: 500, t: 0 }, { f: 900, t: 0.25 }, { f: 400, t: 0.9 }],
        filterQ: 1.5,
        vibratoRate: 6,
        vibratoDepth: 5,
        noiseMix: 0.12,
        noiseFilterFreq: 500,
        gain: 0.24,
        duration: 0.9,
      });
    },
    frog() {
      [0, 260].forEach((delay) =>
        playCreature({
          pitch: [{ f: 190, t: 0 }, { f: 110, t: 0.05 }, { f: 160, t: 0.1 }],
          type: 'square',
          filterType: 'lowpass',
          filterFreq: 900,
          filterQ: 3,
          noiseMix: 0.25,
          noiseFilterFreq: 700,
          gain: 0.18,
          duration: 0.11,
          delay: delay / 1000,
        })
      );
    },
    pig() {
      [0, 190].forEach((delay) =>
        playCreature({
          pitch: [{ f: 220, t: 0 }, { f: 300, t: 0.04 }, { f: 140, t: 0.15 }],
          type: 'sawtooth',
          unisonDetune: 22,
          filterType: 'lowpass',
          filterFreq: [{ f: 500, t: 0 }, { f: 1400, t: 0.05 }, { f: 400, t: 0.16 }],
          filterQ: 1.8,
          noiseMix: 0.22,
          noiseFilterFreq: 1000,
          gain: 0.22,
          delay: delay / 1000,
        })
      );
    },
    chicken() {
      [523, 587, 659, 523, 392].forEach((f, i) =>
        playCreature({
          pitch: [{ f, t: 0 }, { f: f * 0.97, t: 0.13 }],
          type: 'sawtooth',
          unisonDetune: 8,
          filterType: 'bandpass',
          filterFreq: f * 1.4,
          filterQ: 2.5,
          noiseMix: 0.08,
          noiseFilterFreq: f * 2,
          gain: 0.17,
          duration: 0.14,
          delay: i * 0.11,
        })
      );
    },
    lion() {
      playCreature({
        pitch: [{ f: 95, t: 0 }, { f: 130, t: 0.15 }, { f: 70, t: 0.75 }],
        type: 'sawtooth',
        unisonDetune: 20,
        filterType: 'lowpass',
        filterFreq: [{ f: 350, t: 0 }, { f: 700, t: 0.2 }, { f: 300, t: 0.75 }],
        filterQ: 1.2,
        tremoloRate: 26,
        tremoloDepth: 0.4,
        noiseMix: 0.3,
        noiseFilterFreq: 350,
        gain: 0.24,
        duration: 0.75,
      });
    },
    elephant() {
      playCreature({
        pitch: [{ f: 260, t: 0 }, { f: 780, t: 0.14 }, { f: 520, t: 0.4 }, { f: 640, t: 0.55 }, { f: 420, t: 0.8 }],
        type: 'sawtooth',
        unisonDetune: 16,
        filterType: 'bandpass',
        filterFreq: 1200,
        filterQ: 2,
        noiseMix: 0.15,
        noiseFilterFreq: 1600,
        gain: 0.2,
        duration: 0.8,
      });
    },
    sheep() {
      playCreature({
        pitch: [{ f: 300, t: 0 }, { f: 370, t: 0.22 }, { f: 280, t: 0.5 }],
        type: 'sawtooth',
        unisonDetune: 12,
        filterType: 'bandpass',
        filterFreq: 1400,
        filterQ: 2.2,
        vibratoRate: 15,
        vibratoDepth: 22,
        noiseMix: 0.15,
        noiseFilterFreq: 1800,
        gain: 0.22,
        duration: 0.5,
      });
    },
  };

  // Real recorded animal cries (small licensed/user-supplied mp3 clips in
  // shared/sounds/) - these are what actually play. The synthesized
  // versions above are only a fallback for the rare case a clip fails to
  // load or play (e.g. a corrupt cache entry), so a tap never goes silent.
  const ANIMAL_CLIP_FILES = {
    dog: 'dog.mp3',
    cat: 'cat.mp3',
    cow: 'cow.mp3',
    frog: 'frog.mp3',
    pig: 'pig.mp3',
    chicken: 'chicken.mp3',
    lion: 'lion.mp3',
    elephant: 'elephant.mp3',
    sheep: 'sheep.mp3',
  };
  const animalClipCache = {};
  function getAnimalClip(key) {
    if (!animalClipCache[key]) {
      const el = new Audio(BASE + 'shared/sounds/' + ANIMAL_CLIP_FILES[key]);
      el.preload = 'auto';
      el.load();
      animalClipCache[key] = el;
    }
    return animalClipCache[key];
  }
  function playAnimalClip(key) {
    if (isMuted() || !audioUnlocked) return;
    try {
      const el = getAnimalClip(key);
      el.pause();
      el.currentTime = 0;
      let started = false;
      const fallback = () => {
        if (started) return;
        started = true;
        el.pause();
        if (AnimalSoundsSynth[key]) AnimalSoundsSynth[key]();
      };
      const fallbackTimer = setTimeout(fallback, 180);
      el.addEventListener('playing', () => {
        started = true;
        clearTimeout(fallbackTimer);
      }, { once: true });
      const p = el.play();
      if (p && p.catch) p.catch(fallback);
    } catch (e) {
      if (AnimalSoundsSynth[key]) AnimalSoundsSynth[key]();
    }
  }
  const AnimalSounds = {};
  Object.keys(ANIMAL_CLIP_FILES).forEach((key) => {
    getAnimalClip(key);
    AnimalSounds[key] = () => playAnimalClip(key);
  });

  const notes = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.0, A: 440.0, B: 493.88, C2: 523.25, D2: 587.33, E2: 659.25 };

  const Sound = {
    unlock() {
      audioUnlocked = true;
      getCtx();
      if (global.speechSynthesis) global.speechSynthesis.resume();
    },
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
    const jaVoices = global.speechSynthesis.getVoices().filter((v) => v.lang && v.lang.startsWith('ja'));
    // Where more than one Japanese voice is available, prefer a named
    // network/premium voice (e.g. Chrome's "Google 日本語") over a generic
    // compact/local one - it tends to sound noticeably less robotic.
    const preferred = jaVoices.find((v) => /google|natural|neural|premium|enhanced/i.test(v.name));
    jaVoice = preferred || jaVoices[0] || null;
  }
  if (global.speechSynthesis) {
    pickVoice();
    global.speechSynthesis.onvoiceschanged = pickVoice;
  }
  let speechTimer = null;
  let speechSequence = 0;
  function cancelSpeech() {
    speechSequence++;
    if (speechTimer) clearTimeout(speechTimer);
    speechTimer = null;
    if (global.speechSynthesis) global.speechSynthesis.cancel();
  }
  function speak(text, delay = 0) {
    if (isMuted() || !audioUnlocked || !global.speechSynthesis) return;
    const sequence = ++speechSequence;
    if (speechTimer) clearTimeout(speechTimer);
    speechTimer = null;
    if (global.speechSynthesis.speaking || global.speechSynthesis.pending) {
      global.speechSynthesis.cancel();
    }
    const start = () => {
      speechTimer = null;
      if (sequence !== speechSequence || isMuted()) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      if (jaVoice) u.voice = jaVoice;
      u.rate = 0.85;
      u.pitch = 1.15;
      global.speechSynthesis.resume();
      global.speechSynthesis.speak(u);
    };
    if (delay > 0) speechTimer = setTimeout(start, delay);
    else start();
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
  // Back-navigation trap: the whole point of the hold-to-exit home button
  // is that leaving a game is a deliberate, grown-up-speed action - but a
  // stray edge-swipe (Chrome's back gesture) or a hardware/software back
  // button bypasses it entirely via browser history, instantly bouncing
  // back to the launcher mid-play. touch-action:none on body discourages
  // the swipe gesture from engaging in the first place, but that alone
  // isn't watertight across every browser/device, so this is the backup:
  // push a dummy history entry and immediately re-push it on every
  // `popstate`, so a back-navigation never actually leaves the page.
  // ---------------------------------------------------------------------
  function trapBackNavigation() {
    history.pushState({ kidsAppTrap: true }, '', location.href);
    global.addEventListener('popstate', () => {
      history.pushState({ kidsAppTrap: true }, '', location.href);
    });
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
      if (isMuted()) {
        cancelSpeech();
        Object.values(animalClipCache).forEach((el) => el.pause());
      } else {
        Sound.unlock();
        Sound.tap();
      }
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
    let registration = null;
    global.addEventListener('load', () => {
      navigator.serviceWorker
        .register(BASE + 'sw.js')
        .then((reg) => {
          registration = reg;
          // Don't just rely on the browser's own (often lazy/throttled)
          // update check - ask explicitly right away too, so a fresh
          // install picks up a newer version as soon as possible instead
          // of waiting on implicit timing.
          reg.update().catch(() => {});
        })
        .catch(() => {});
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

    // An installed/standalone PWA is usually *resumed* from the background
    // (tapping the home-screen icon while it's already running there)
    // rather than freshly navigated to - and browsers only implicitly
    // check for a newer service worker on navigation, and even then only
    // occasionally. Left alone, that means reopening the app can silently
    // skip the update check for a long time. Forcing an explicit check
    // whenever the app comes back to the foreground makes updates land on
    // the very next time it's used, instead of waiting on the browser's
    // own lazy schedule.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && registration) {
        registration.update().catch(() => {});
      }
    });
  }

  // Asks the service worker that's actually controlling this page which
  // cache version it's running - the truthful answer to "did my update
  // really take effect", as opposed to a version string baked into the
  // page itself (which could be served fresh over a network request even
  // while the SW's cached assets underneath it are still stale).
  function getServiceWorkerVersion() {
    return new Promise((resolve) => {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        resolve(null);
        return;
      }
      const channel = new MessageChannel();
      const timeout = setTimeout(() => resolve(null), 1500);
      channel.port1.onmessage = (e) => {
        clearTimeout(timeout);
        resolve((e.data && e.data.version) || null);
      };
      navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
    });
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ---------------------------------------------------------------------
  // Power saving: canvas games used to redraw at the display refresh rate
  // forever, even when nobody was touching the screen. Cap active rendering
  // at 30fps and stop animation/audio completely after a minute of inactivity
  // or while the page is in the background. The next tap wakes everything
  // before the game's own pointer handler runs.
  // ---------------------------------------------------------------------
  const POWER_SAVE_AFTER_MS = 60 * 1000;
  const animationLoops = new Set();
  let powerSaveTimer = null;
  let powerSaving = document.visibilityState === 'hidden';

  function notifyPowerChange() {
    document.documentElement.classList.toggle('kidsapp-power-save', powerSaving);
    document.dispatchEvent(new CustomEvent('kidsapp:powerchange', {
      detail: { saving: powerSaving },
    }));
  }

  function setPowerSaving(next) {
    if (powerSaving === next) return;
    powerSaving = next;
    if (powerSaving) {
      audioUnlocked = false;
      cancelSpeech();
      Object.values(animalClipCache).forEach((el) => el.pause());
      if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
      animationLoops.forEach((loop) => loop.pause());
    } else {
      animationLoops.forEach((loop) => loop.wake());
    }
    notifyPowerChange();
  }

  function schedulePowerSave() {
    if (powerSaveTimer) clearTimeout(powerSaveTimer);
    powerSaveTimer = setTimeout(() => setPowerSaving(true), POWER_SAVE_AFTER_MS);
  }

  function markActivity() {
    setPowerSaving(false);
    schedulePowerSave();
  }

  function startAnimationLoop(render, opts = {}) {
    const fps = Math.max(1, Math.min(60, Number(opts.fps) || 30));
    const interval = 1000 / fps;
    let timeoutId = null;
    let rafId = null;
    let stopped = false;

    function clearScheduled() {
      if (timeoutId !== null) global.clearTimeout(timeoutId);
      if (rafId !== null) global.cancelAnimationFrame(rafId);
      timeoutId = null;
      rafId = null;
    }

    function frame(now) {
      rafId = null;
      if (stopped || powerSaving || document.hidden) return;
      render(now);
      timeoutId = global.setTimeout(() => {
        timeoutId = null;
        rafId = global.requestAnimationFrame(frame);
      }, Math.max(0, interval - 8));
    }

    const loop = {
      pause() {
        clearScheduled();
      },
      wake() {
        clearScheduled();
        if (!stopped && !powerSaving && !document.hidden) {
          rafId = global.requestAnimationFrame(frame);
        }
      },
    };
    animationLoops.add(loop);
    loop.wake();

    return function stop() {
      stopped = true;
      loop.pause();
      animationLoops.delete(loop);
    };
  }

  function isPowerSaving() {
    return powerSaving;
  }

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

  // A gentle pause after a long continuous play session. It is deliberately
  // dismissible: this is a cue for a parent and child, never a punishment.
  function initBreakReminder() {
    const SESSION_KEY = 'kidsapp_session_started';
    const REMIND_MS = 15 * 60 * 1000;
    let started = Number(sessionStorage.getItem(SESSION_KEY));
    if (!started || Date.now() - started > 2 * 60 * 60 * 1000) {
      started = Date.now();
      sessionStorage.setItem(SESSION_KEY, String(started));
    }
    const remaining = Math.max(1000, REMIND_MS - (Date.now() - started));
    setTimeout(() => {
      if (document.querySelector('.break-reminder')) return;
      const overlay = document.createElement('div');
      overlay.className = 'break-reminder';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', '休憩のお知らせ');
      overlay.innerHTML =
        '<div class="break-reminder__panel">' +
          '<div class="break-reminder__mascot">🌿</div>' +
          '<div class="break-reminder__text">すこし めを やすめよう</div>' +
          '<button class="break-reminder__continue" type="button">もうすこし あそぶ</button>' +
        '</div>';
      document.body.appendChild(overlay);
      KidsApp.speak('すこし めを やすめよう');
      overlay.querySelector('button').addEventListener('click', () => {
        sessionStorage.setItem(SESSION_KEY, String(Date.now()));
        overlay.remove();
      });
    }, remaining);
  }

  function initCommon(opts = {}) {
    document.addEventListener(
      'pointerdown',
      () => {
        markActivity();
        Sound.unlock();
      },
      { passive: true, capture: true }
    );
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        setPowerSaving(true);
      } else {
        markActivity();
      }
    });
    global.addEventListener('pagehide', () => setPowerSaving(true));
    notifyPowerChange();
    schedulePowerSave();
    if (opts.home !== false) {
      initHomeButton();
      trapBackNavigation();
    }
    initMuteButton();
    registerServiceWorker();
    initBreakReminder();
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
    startAnimationLoop,
    isPowerSaving,
    CHARACTERS,
    mascotBubble,
    createAdaptive,
    BOTTOM_GAP: BOTTOM_GAP_PX,
    AnimalSounds,
    getServiceWorkerVersion,
  };
})(window);
