/* Nate's Birthday Park — single-track audio engine */
(function () {
  const cfg = window.PARK_AUDIO_CONFIG || { tracks: {}, defaultVolume: 0.55, crossfadeMs: 600 };
  const STORAGE = cfg.storageKey || "nates-birthday-park-audio-v1";

  const state = {
    unlocked: false,
    muted: false,
    volume: cfg.defaultVolume ?? 0.55,
    room: "intro",
    night: false,
    playing: false,
    trackKey: null,
    trackTitle: "Waiting for music…",
    usingFile: false,
    skipToken: 0
  };

  let ctx = null;
  let master = null;
  let musicGain = null;
  let ambienceGain = null;
  let sfxGain = null;
  let fallbackBus = null;
  let fallbackTimer = 0;
  let fallbackNodes = [];
  let ambienceNodes = [];
  let ambienceTimer = 0;
  let mediaGuard = null;
  let gestureBound = false;

  // ONE music element only — never dual-layer / overlapping beds
  const musicEl = new Audio();
  musicEl.loop = true;
  musicEl.preload = "auto";
  musicEl.volume = 0;
  musicEl.muted = true;

  const fileProbe = new Map();

  const MOODS = {
    sweet: {
      scale: [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5],
      pattern: [0, 2, 4, 2, 5, 4, 2, 0, 1, 2, 4, 2],
      tempo: 520,
      gain: 0.03
    },
    playful: {
      scale: [392.0, 440.0, 493.88, 587.33, 659.25, 783.99],
      pattern: [0, 2, 4, 5, 4, 2, 3, 4, 2, 0, 2, 4, 1, 2, 0, 0],
      tempo: 380,
      gain: 0.028
    },
    night: {
      scale: [329.63, 392.0, 440.0, 523.25, 587.33],
      pattern: [0, 2, 1, 3, 2, 4, 3, 1, 0, 2, 4, 2],
      tempo: 720,
      gain: 0.022
    },
    gentle: {
      scale: [349.23, 392.0, 440.0, 523.25, 587.33],
      pattern: [0, 1, 2, 4, 3, 2, 1, 0, 2, 3, 4, 2],
      tempo: 640,
      gain: 0.026
    },
    musicbox: {
      scale: [523.25, 587.33, 659.25, 698.46, 783.99, 880.0],
      pattern: [5, 4, 2, 0, 2, 4, 5, 4, 3, 2, 1, 0, 2, 4, 5, 5],
      tempo: 480,
      gain: 0.024
    },
    piano: {
      scale: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25],
      pattern: [0, 2, 4, 5, 4, 2, 3, 4, 2, 0, 1, 2, 4, 2, 0, 0],
      tempo: 700,
      gain: 0.03
    },
    cafe: {
      scale: [440.0, 493.88, 554.37, 659.25, 739.99],
      pattern: [0, 1, 2, 1, 3, 2, 4, 3, 2, 1, 0, 2],
      tempo: 460,
      gain: 0.026
    },
    party: {
      scale: [392.0, 493.88, 587.33, 659.25, 783.99, 987.77],
      pattern: [0, 2, 4, 5, 4, 2, 5, 4, 3, 2, 0, 2, 4, 5, 4, 0],
      tempo: 340,
      gain: 0.03
    },
    arcade: {
      scale: [523.25, 659.25, 783.99, 987.77, 1046.5],
      pattern: [0, 2, 4, 3, 4, 2, 1, 0, 2, 4, 3, 4],
      tempo: 340,
      gain: 0.022
    },
    dreamy: {
      scale: [349.23, 415.3, 466.16, 523.25, 622.25],
      pattern: [0, 2, 4, 3, 4, 2, 1, 0, 3, 4, 2, 0],
      tempo: 780,
      gain: 0.024
    },
    ending: {
      scale: [293.66, 349.23, 392.0, 440.0, 523.25, 587.33],
      pattern: [0, 2, 4, 5, 4, 3, 2, 0, 1, 2, 4, 5, 4, 2, 0, 0],
      tempo: 680,
      gain: 0.028
    }
  };

  function isAudible() {
    return state.unlocked && state.playing && !state.muted;
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.volume === "number") state.volume = Math.min(1, Math.max(0, data.volume));
      if (typeof data.muted === "boolean") state.muted = data.muted;
    } catch (error) {
      /* ignore */
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ volume: state.volume, muted: state.muted }));
    } catch (error) {
      /* ignore */
    }
  }

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    musicGain = ctx.createGain();
    ambienceGain = ctx.createGain();
    sfxGain = ctx.createGain();
    fallbackBus = ctx.createGain();
    musicGain.connect(master);
    ambienceGain.connect(master);
    sfxGain.connect(master);
    fallbackBus.connect(musicGain);
    master.connect(ctx.destination);
    applyGains();
    return ctx;
  }

  function resetFallbackBus() {
    if (!ctx || !musicGain) return;
    if (fallbackBus) {
      try {
        fallbackBus.gain.cancelScheduledValues(ctx.currentTime);
        fallbackBus.gain.setValueAtTime(0, ctx.currentTime);
        fallbackBus.disconnect();
      } catch (error) {
        /* ignore */
      }
    }
    fallbackBus = ctx.createGain();
    fallbackBus.gain.value = 1;
    fallbackBus.connect(musicGain);
  }

  function applyGains() {
    if (!master || !ctx) return;
    const now = ctx.currentTime;
    const nightMul = state.night ? 0.82 : 1;
    const audible = isAudible();
    const vol = audible ? Math.max(0.0001, state.volume * nightMul) : 0;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(vol, now);
    if (musicGain) {
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(audible ? 1 : 0, now);
    }
    if (ambienceGain) ambienceGain.gain.setValueAtTime(0, now); // ambience beds disabled
    if (sfxGain) {
      sfxGain.gain.cancelScheduledValues(now);
      sfxGain.gain.setValueAtTime(audible ? Math.max(0.0001, state.volume * 0.9) : 0, now);
    }
  }

  function syncPageMedia() {
    // Videos must never add a second soundtrack beside park music
    document.querySelectorAll("video").forEach((video) => {
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      try {
        video.setAttribute("muted", "");
      } catch (error) {
        /* ignore */
      }
    });
    // Any stray <audio> tags on the page (not our singleton)
    document.querySelectorAll("audio").forEach((el) => {
      if (el === musicEl) return;
      el.pause();
      el.muted = true;
      el.volume = 0;
      try {
        el.removeAttribute("src");
        el.load();
      } catch (error) {
        /* ignore */
      }
    });
  }

  function guardPageMedia() {
    if (mediaGuard || typeof MutationObserver !== "function") return;
    let scheduled = 0;
    mediaGuard = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = window.setTimeout(() => {
        scheduled = 0;
        syncPageMedia();
      }, 50);
    });
    const root = document.documentElement || document.body;
    if (root) mediaGuard.observe(root, { childList: true, subtree: true });
    document.addEventListener(
      "play",
      (event) => {
        const el = event.target;
        if (!el || el === musicEl) return;
        if (el.tagName === "VIDEO") {
          el.muted = true;
          el.volume = 0;
          return;
        }
        if (el.tagName === "AUDIO") {
          el.pause();
          el.muted = true;
          el.volume = 0;
        }
      },
      true
    );
  }

  function emit() {
    window.dispatchEvent(new CustomEvent("park:audio", { detail: { ...state } }));
    syncUi();
  }

  function syncUi() {
    const title = document.querySelector("#audio-track-title");
    const playBtn = document.querySelector("#audio-play");
    const muteBtn = document.querySelector("#audio-mute");
    const vol = document.querySelector("#audio-volume");
    const navMusic = document.querySelector("#music");
    const introMute = document.querySelector("#intro-mute");
    const on = isAudible();
    if (title) title.textContent = state.trackTitle + (state.usingFile || !on ? "" : " · soft park theme");
    if (playBtn) {
      playBtn.setAttribute("aria-pressed", on ? "true" : "false");
      playBtn.textContent = on ? "❚❚" : "▶";
      playBtn.title = on ? "Pause" : "Play";
    }
    if (muteBtn) {
      muteBtn.setAttribute("aria-pressed", state.muted || !state.playing ? "true" : "false");
      muteBtn.textContent = state.muted || !state.playing ? "🔇" : "🔊";
    }
    if (vol && Math.abs(Number(vol.value) - state.volume) > 0.01) vol.value = String(state.volume);
    if (navMusic) {
      navMusic.setAttribute("aria-pressed", on ? "true" : "false");
      navMusic.textContent = on ? "Music on" : "Music";
    }
    if (introMute) {
      introMute.setAttribute("aria-pressed", on ? "false" : "true");
      introMute.title = on ? "Mute music" : "Unmute music";
      introMute.textContent = on ? "♪̸" : "♪";
    }
  }

  function killAudioNodes(nodes) {
    nodes.forEach((node) => {
      try {
        node.onended = null;
      } catch (error) {
        /* ignore */
      }
      try {
        node.disconnect();
      } catch (error) {
        /* ignore */
      }
      try {
        // stop() with no args; if start is still in the future this still cancels output once disconnected
        node.stop();
      } catch (error) {
        /* ignore */
      }
    });
  }

  function stopFallback() {
    window.clearTimeout(fallbackTimer);
    fallbackTimer = 0;
    killAudioNodes(fallbackNodes);
    fallbackNodes = [];
    resetFallbackBus();
  }

  function stopAmbience() {
    window.clearTimeout(ambienceTimer);
    ambienceTimer = 0;
    killAudioNodes(ambienceNodes);
    ambienceNodes = [];
  }

  function stopMusicElement() {
    try {
      musicEl.pause();
      musicEl.volume = 0;
      musicEl.muted = true;
      musicEl.removeAttribute("src");
      musicEl.load();
    } catch (error) {
      /* ignore */
    }
  }

  /** Hard stop: every music/ambience/sfx bed + page media */
  function silenceAll() {
    state.skipToken += 1;
    stopFallback();
    stopAmbience();
    stopMusicElement();
    state.usingFile = false;
    applyGains();
    syncPageMedia();
    if (ctx && ctx.state === "running") {
      ctx.suspend().catch(() => {});
    }
  }

  function playFallback(moodKey) {
    if (!isAudible() || !ensureCtx()) return;
    stopFallback();
    stopMusicElement();
    if (!fallbackBus) resetFallbackBus();
    state.usingFile = false;
    const mood = { ...(MOODS[moodKey] || MOODS.playful) };
    if (state.night) {
      mood.tempo = Math.round((mood.tempo || 500) * 1.28);
      mood.gain = (mood.gain || 0.028) * 0.78;
    }
    const start = ctx.currentTime + 0.05;
    const beat = (mood.tempo || 500) / 1000;
    const noteLen = beat * 1.35;
    const bus = fallbackBus;

    mood.pattern.forEach((step, i) => {
      const freq = mood.scale[step % mood.scale.length];
      const when = start + i * beat;
      [{ mul: 1, amp: 1 }, { mul: 2, amp: 0.28 }, { mul: 3, amp: 0.1 }].forEach((p) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc.type = "sine";
        osc.frequency.value = freq * p.mul;
        filter.type = "lowpass";
        filter.frequency.value = 2200;
        const level = mood.gain * p.amp * (p.mul === 1 ? 1 : Math.exp(-0.8 * (p.mul - 1)));
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(level, when + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + noteLen);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(bus);
        osc.start(when);
        osc.stop(when + noteLen + 0.02);
        fallbackNodes.push(osc, gain, filter);
      });
    });

    const pad = ctx.createOscillator();
    const padGain = ctx.createGain();
    pad.type = "sine";
    pad.frequency.value = mood.scale[0] / 2;
    padGain.gain.setValueAtTime(0.0001, start);
    padGain.gain.exponentialRampToValueAtTime(mood.gain * 0.22, start + 0.5);
    padGain.gain.exponentialRampToValueAtTime(0.0001, start + mood.pattern.length * beat);
    pad.connect(padGain);
    padGain.connect(bus);
    pad.start(start);
    pad.stop(start + mood.pattern.length * beat + 0.1);
    fallbackNodes.push(pad, padGain);

    const loopMs = mood.pattern.length * mood.tempo + 120;
    const loopToken = state.skipToken;
    fallbackTimer = window.setTimeout(() => {
      if (loopToken !== state.skipToken) return;
      if (isAudible() && !state.usingFile) playFallback(moodKey);
    }, loopMs);
  }

  function probeFile(url) {
    if (!url) return Promise.resolve(false);
    if (fileProbe.has(url)) return fileProbe.get(url);
    const p = new Promise((resolve) => {
      const test = new Audio();
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      test.preload = "metadata";
      test.addEventListener("loadeddata", () => done(true));
      test.addEventListener("canplaythrough", () => done(true));
      test.addEventListener("error", () => done(false));
      window.setTimeout(() => done(test.readyState >= 1), 1600);
      test.src = url;
    });
    fileProbe.set(url, p);
    return p;
  }

  function softenMood(mood) {
    if (mood === "party" || mood === "arcade" || mood === "playful" || mood === "cafe") return "night";
    if (mood === "sweet") return "gentle";
    return mood || "night";
  }

  function trackForRoom(room, night) {
    const tracks = cfg.tracks || {};
    const nightKey = room === "top" ? "topNight" : room + "Night";
    if (night && tracks[nightKey]) return { key: nightKey, ...tracks[nightKey] };
    if (tracks[room]) {
      const base = { key: room, ...tracks[room] };
      if (night) {
        return {
          ...base,
          key: room + ":night",
          title: (base.title || room) + " · night",
          mood: softenMood(base.mood)
        };
      }
      return base;
    }
    if (tracks.top) return { key: "top", ...tracks.top };
    return { key: "top", title: "Nate's Birthday Park", mood: "playful", file: "" };
  }

  async function playFile(url) {
    // Stop EVERYTHING first so only one source can run
    stopFallback();
    stopAmbience();
    stopMusicElement();
    if (!isAudible()) return false;
    musicEl.muted = false;
    musicEl.src = url;
    musicEl.volume = state.volume;
    try {
      await musicEl.play();
    } catch (error) {
      stopMusicElement();
      return false;
    }
    // Another play/stop may have won while we awaited
    if (!isAudible()) {
      stopMusicElement();
      return false;
    }
    state.usingFile = true;
    return true;
  }

  async function setTrack(room, options = {}) {
    state.room = room || state.room;
    const track = trackForRoom(state.room, state.night);
    if (!options.force && track.key === state.trackKey && isAudible() && state.usingFile && !musicEl.paused) {
      emit();
      return;
    }
    state.trackKey = track.key;
    state.trackTitle = track.title || track.key;
    const token = ++state.skipToken;

    if (!isAudible()) {
      silenceAll();
      emit();
      return;
    }

    // Kill any prior bed before starting the next (room switch / night flip)
    stopFallback();
    stopAmbience();
    stopMusicElement();
    state.usingFile = false;

    ensureCtx();
    if (ctx?.state === "suspended") await ctx.resume();
    if (token !== state.skipToken || !isAudible()) {
      silenceAll();
      return;
    }

    const hasFile = await probeFile(track.file);
    if (token !== state.skipToken || !isAudible()) {
      silenceAll();
      return;
    }

    if (hasFile) {
      const ok = await playFile(track.file);
      if (token !== state.skipToken || !isAudible()) {
        silenceAll();
        return;
      }
      if (!ok) {
        if (token === state.skipToken && isAudible()) playFallback(track.mood || "playful");
      }
    } else {
      stopMusicElement();
      playFallback(track.mood || "playful");
    }

    if (token !== state.skipToken || !isAudible()) {
      silenceAll();
      return;
    }
    applyGains();
    emit();
  }

  function tone(freq, dur, type, level) {
    if (!isAudible() || !ensureCtx()) return;
    const when = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(level || 0.04, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  function sfx(name) {
    if (!isAudible()) return;
    ensureCtx();
    if (ctx?.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    if (name === "gift") {
      [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.28, "sine", 0.035 - i * 0.004));
    } else if (name === "letter") {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      src.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.value = 1200;
      gain.gain.value = 0.05;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain);
      src.start(now);
    } else if (name === "stamp") {
      tone(220, 0.12, "triangle", 0.05);
      window.setTimeout(() => {
        if (isAudible()) tone(880, 0.2, "sine", 0.03);
      }, 80);
    } else if (name === "claw") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        window.setTimeout(() => {
          if (isAudible()) tone(f, 0.22, "triangle", 0.03);
        }, i * 70);
      });
    } else if (name === "candle") {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      src.buffer = buffer;
      filter.type = "lowpass";
      filter.frequency.value = 600;
      gain.gain.value = 0.06;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain);
      src.start(now);
    } else if (name === "note") {
      tone(784, 0.35, "triangle", 0.03);
      tone(988, 0.4, "sine", 0.02);
    } else if (name === "ui") {
      tone(660, 0.12, "sine", 0.02);
    }
  }

  async function unlock() {
    if (state.unlocked) return;
    state.unlocked = true;
    ensureCtx();
    if (ctx && isAudible()) await ctx.resume();
    syncPageMedia();
    emit();
  }

  async function play() {
    state.playing = true;
    state.muted = false;
    await unlock();
    // Always clear previous sources before starting the one track
    silenceAll();
    state.playing = true;
    state.muted = false;
    const token = state.skipToken;
    if (ctx?.state === "suspended") await ctx.resume();
    if (token !== state.skipToken || !isAudible()) return;
    savePrefs();
    applyGains();
    await setTrack(state.room, { force: true });
    emit();
  }

  function stopMusic() {
    state.muted = true;
    state.playing = false;
    silenceAll();
    savePrefs();
    emit();
  }

  function pause() {
    stopMusic();
  }

  function toggle() {
    if (isAudible()) stopMusic();
    else play();
  }

  function setMuted(muted) {
    if (muted) stopMusic();
    else play();
  }

  function setVolume(v) {
    state.volume = Math.min(1, Math.max(0, Number(v) || 0));
    if (state.usingFile && isAudible()) musicEl.volume = state.volume;
    applyGains();
    savePrefs();
    emit();
  }

  function skip() {
    if (!isAudible()) return;
    setTrack(state.room, { force: true });
  }

  function onRoom(room) {
    const key = room === "intro" ? "intro" : room || "top";
    if (!isAudible()) {
      state.room = key;
      return;
    }
    setTrack(key);
  }

  function onNight(night) {
    state.night = Boolean(night);
    if (!isAudible()) return;
    setTrack(state.room, { force: true });
  }

  function bindUi() {
    const panel = document.querySelector("#audio-player");
    document.querySelector("#audio-play")?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggle();
    });
    document.querySelector("#audio-mute")?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggle();
    });
    document.querySelector("#audio-skip")?.addEventListener("click", (event) => {
      event.stopPropagation();
      skip();
    });
    document.querySelector("#audio-volume")?.addEventListener("input", (event) => {
      setVolume(event.target.value);
    });
    document.querySelector("#audio-player-toggle")?.addEventListener("click", (event) => {
      event.stopPropagation();
      panel?.classList.toggle("is-open");
    });
    document.querySelector("#music")?.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (isAudible()) {
        stopMusic();
        panel?.classList.remove("is-open");
      } else {
        panel?.classList.add("is-open");
        play();
      }
    });
    document.querySelector("#intro-mute")?.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (isAudible()) {
        stopMusic();
      } else {
        state.room = document.documentElement.classList.contains("intro-on") ? "intro" : state.room;
        await play();
      }
    });

    const gestureTypes = ["pointerdown", "keydown", "touchstart"];
    const startOnce = (event) => {
      if (gestureBound) return;
      const target = event.target;
      if (target && typeof target.closest === "function") {
        if (target.closest("#music, #intro-mute, #audio-play, #audio-mute, #audio-player-toggle, #audio-skip, #audio-volume")) {
          unlock();
          return;
        }
      }
      gestureBound = true;
      gestureTypes.forEach((type) => {
        document.removeEventListener(type, startOnce, true);
      });
      if (state.muted) {
        unlock();
        return;
      }
      state.room = document.documentElement.classList.contains("intro-on") ? "intro" : state.room;
      play();
    };
    gestureTypes.forEach((type) => {
      document.addEventListener(type, startOnce, { capture: true });
    });
  }

  window.addEventListener("park:room", (event) => {
    onRoom(event.detail || "top");
  });

  const nightObserver = new MutationObserver(() => {
    onNight(document.body.classList.contains("is-night"));
  });
  nightObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

  const introObserver = new MutationObserver(() => {
    if (document.documentElement.classList.contains("intro-on")) {
      state.room = "intro";
      if (isAudible()) setTrack("intro");
    } else if (state.room === "intro") {
      onRoom("top");
    }
  });
  introObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  // Keep videos silent so they never stack with BGM
  syncPageMedia();
  guardPageMedia();
  document.addEventListener("DOMContentLoaded", () => {
    syncPageMedia();
    guardPageMedia();
  });

  loadPrefs();
  if (state.muted) {
    state.playing = false;
    silenceAll();
  }
  bindUi();
  syncUi();

  window.ParkAudio = {
    play,
    pause,
    stopMusic,
    toggle,
    setMuted,
    setVolume,
    skip,
    sfx,
    unlock,
    onRoom,
    onNight,
    getState: () => ({ ...state, musicPaused: musicEl.paused })
  };
})();
