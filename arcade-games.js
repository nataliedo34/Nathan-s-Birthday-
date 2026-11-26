/* —— Usagi's Midway · Phase 1 (claw + gachapon) ——
   Independent of park / intro / passport. Uses its own localStorage key. */
(function () {
  const ARCADE_KEY = "nates-birthday-arcade-v1";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function sfx(name) {
    if (typeof window.ParkAudio?.sfx === "function") window.ParkAudio.sfx(name);
  }

  function loadArcade() {
    try {
      const raw = localStorage.getItem(ARCADE_KEY);
      if (!raw) {
        return { version: 1, gacha: { collected: {}, pulls: 0 }, claw: { caught: {}, plays: 0 } };
      }
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) {
        return { version: 1, gacha: { collected: {}, pulls: 0 }, claw: { caught: {}, plays: 0 } };
      }
      data.gacha = data.gacha || { collected: {}, pulls: 0 };
      data.gacha.collected = data.gacha.collected || {};
      data.claw = data.claw || { caught: {}, plays: 0 };
      data.claw.caught = data.claw.caught || {};
      return data;
    } catch {
      return { version: 1, gacha: { collected: {}, pulls: 0 }, claw: { caught: {}, plays: 0 } };
    }
  }

  function saveArcade(data) {
    try {
      localStorage.setItem(ARCADE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota */
    }
  }

  function rarityLabel(r) {
    return ({ common: "Common", uncommon: "Uncommon", rare: "Rare", legendary: "Legendary" })[r] || r;
  }

  function midwayActive() {
    return Boolean(document.querySelector("#play.is-active"));
  }

  /* ========== GACHAPON ========== */
  const GACHA_PRIZES = [
    { id: "note-pudding", name: "Strawberry pudding luck", rarity: "common", color: "pink", msg: "Today's lucky snack is strawberry pudding." },
    { id: "note-cozy", name: "Cozy feeling", rarity: "common", color: "mint", msg: "Lucky number: 20. Lucky feeling: cozy." },
    { id: "note-soft", name: "Soft strength", rarity: "common", color: "blue", msg: "This year, your softness is a strength." },
    { id: "note-nap", name: "Nap coupon", rarity: "common", color: "yellow", msg: "Nap first. Adventure second. Or the other way around." },
    { id: "charm-chiikawa", name: "Chiikawa charm", rarity: "uncommon", color: "pink", msg: "Chiikawa believes in you. Quietly. A lot.", img: "chars/chiikawa.png" },
    { id: "charm-hachi", name: "Hachiware snack pack", rarity: "uncommon", color: "blue", msg: "Hachiware packed you an extra snack.", img: "chars/hachiware.png" },
    { id: "charm-usagi", name: "Usagi cheer", rarity: "uncommon", color: "yellow", msg: "Usagi is cheering at a volume that is not allowed indoors.", img: "chars/usagi.png" },
    { id: "plush-mini", name: "Mini meadow friend", rarity: "rare", color: "mint", msg: "A rare meadow friend tumbled out!", img: "chars/chiikawa.png" },
    { id: "plush-hug", name: "Secret hug token", rarity: "rare", color: "pink", msg: "Secret hug from your big sister.", img: "chars/hachiware.png" },
    { id: "golden-20", name: "Golden birthday capsule", rarity: "legendary", color: "gold", msg: "✦ Golden birthday capsule! Twenty looks bright on you. ✦", img: "chars/usagi.png" }
  ];

  const GACHA_WEIGHTS = { common: 52, uncommon: 30, rare: 14, legendary: 4 };

  function pickGachaPrize() {
    const bag = [];
    GACHA_PRIZES.forEach((p) => {
      const w = GACHA_WEIGHTS[p.rarity] || 1;
      for (let i = 0; i < w; i += 1) bag.push(p);
    });
    return bag[Math.floor(Math.random() * bag.length)];
  }

  function initGacha() {
    const machine = document.querySelector("#machine");
    const lever = document.querySelector("#lever");
    const capsule = document.querySelector("#capsule");
    const fortune = document.querySelector("#fortune");
    const album = document.querySelector("#gacha-album");
    if (!machine || !lever || !capsule) return;

    let busy = false;
    let pending = null;
    let knobAngle = 0;
    let drag = null;

    function renderAlbum() {
      if (!album) return;
      const data = loadArcade();
      const items = Object.values(data.gacha.collected).sort((a, b) => (b.at || 0) - (a.at || 0));
      if (!items.length) {
        album.innerHTML = `<p class="arcade-album-empty">No capsules opened yet.</p>`;
        return;
      }
      album.innerHTML = items
        .map(
          (item) => `<div class="arcade-chip rarity-${item.rarity}" title="${item.msg || ""}">
            ${item.img ? `<img src="${item.img}" alt="">` : `<span class="arcade-chip-dot" data-color="${item.color || "pink"}"></span>`}
            <span class="arcade-chip-meta"><strong>${item.name}</strong><em>${rarityLabel(item.rarity)} · ×${item.count}</em></span>
          </div>`
        )
        .join("");
    }

    function setCapsuleState(state, prize) {
      capsule.classList.remove("is-empty", "is-ready", "is-open", "is-dropping");
      if (state === "empty") {
        capsule.classList.add("is-empty");
        capsule.disabled = true;
        capsule.removeAttribute("data-rarity");
        capsule.innerHTML = "";
        return;
      }
      if (state === "dropping") {
        capsule.classList.add("is-dropping");
        capsule.dataset.color = prize.color;
        capsule.disabled = true;
        capsule.innerHTML = "";
        return;
      }
      if (state === "ready") {
        capsule.classList.add("is-ready");
        capsule.dataset.color = prize.color;
        capsule.dataset.rarity = prize.rarity;
        capsule.disabled = false;
        capsule.innerHTML = "";
        capsule.setAttribute("aria-label", "Tap to open capsule");
        return;
      }
      if (state === "open") {
        capsule.classList.add("is-open");
        capsule.dataset.color = prize.color;
        capsule.dataset.rarity = prize.rarity;
        capsule.disabled = true;
        capsule.innerHTML = prize.img
          ? `<img src="${prize.img}" alt="">`
          : `<span class="capsule-sparkle">✦</span>`;
      }
    }

    function dispense() {
      if (busy) return;
      if (pending) {
        if (fortune) fortune.textContent = "Open the capsule in the tray first!";
        return;
      }
      busy = true;
      lever.disabled = true;
      const prize = pickGachaPrize();
      pending = prize;
      knobAngle += 360;
      lever.style.setProperty("--knob-rot", `${knobAngle}deg`);
      machine.classList.add("is-spinning");
      setCapsuleState("empty");
      if (fortune) fortune.textContent = "A capsule is tumbling down…";
      sfx("claw");

      window.setTimeout(() => {
        machine.classList.remove("is-spinning");
        setCapsuleState("dropping", prize);
        window.setTimeout(() => {
          setCapsuleState("ready", prize);
          if (fortune) fortune.textContent = "Capsule ready — tap it to open!";
          busy = false;
          lever.disabled = false;
        }, reduceMotion ? 0 : 720);
      }, reduceMotion ? 0 : 480);
    }

    function openCapsule() {
      if (!pending || busy) return;
      if (!capsule.classList.contains("is-ready")) return;
      busy = true;
      const prize = pending;
      setCapsuleState("open", prize);

      const data = loadArcade();
      data.gacha.pulls = (data.gacha.pulls || 0) + 1;
      const prev = data.gacha.collected[prize.id];
      data.gacha.collected[prize.id] = {
        id: prize.id,
        name: prize.name,
        rarity: prize.rarity,
        color: prize.color,
        img: prize.img || "",
        msg: prize.msg,
        count: (prev?.count || 0) + 1,
        at: Date.now()
      };
      saveArcade(data);
      renderAlbum();

      if (fortune) {
        fortune.textContent =
          prize.rarity === "legendary"
            ? prize.msg
            : `${rarityLabel(prize.rarity)} · ${prize.msg}`;
      }
      sfx("claw");
      pending = null;
      busy = false;

      window.setTimeout(() => {
        if (!pending) setCapsuleState("empty");
      }, reduceMotion ? 900 : 2200);
    }

    lever.addEventListener("click", (e) => {
      e.preventDefault();
      dispense();
    });

    capsule.addEventListener("click", () => openCapsule());

    /* Drag / rotate knob */
    const onPointerDown = (e) => {
      if (busy) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
      lever.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      knobAngle += dx * 0.8 - dy * 0.4;
      lever.style.setProperty("--knob-rot", `${knobAngle}deg`);
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const onPointerUp = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const spun = drag.moved > 40;
      drag = null;
      if (spun) dispense();
    };
    lever.addEventListener("pointerdown", onPointerDown);
    lever.addEventListener("pointermove", onPointerMove);
    lever.addEventListener("pointerup", onPointerUp);
    lever.addEventListener("pointercancel", () => {
      drag = null;
    });

    setCapsuleState("empty");
    renderAlbum();
  }

  /* ========== CLAW MACHINE ========== */
  const CLAW_PLUSSES = [
    { id: "claw-chiikawa", name: "Chiikawa plush", rarity: "common", img: "chars/chiikawa.png", msg: "A soft reminder: you are easy to love.", catch: 0.92, size: 48 },
    { id: "claw-hachi", name: "Hachiware plush", rarity: "uncommon", img: "chars/hachiware.png", msg: "Extra snack coupon unlocked in spirit.", catch: 0.72, size: 46 },
    { id: "claw-usagi", name: "Usagi plush", rarity: "rare", img: "chars/usagi.png", msg: "YA-HA!! Birthday energy acquired.", catch: 0.48, size: 44 },
    { id: "claw-chiikawa2", name: "Shy Chiikawa", rarity: "common", img: "chars/chiikawa.png", msg: "Secret hug from your big sister.", catch: 0.88, size: 42 },
    { id: "claw-golden", name: "Golden birthday plush", rarity: "legendary", img: "chars/usagi.png", msg: "✦ Legendary catch! Golden birthday plush! ✦", catch: 0.28, size: 40, golden: true }
  ];

  function shuffledLayout() {
    const spots = [
      { x: 16, y: 62 },
      { x: 38, y: 48 },
      { x: 58, y: 66 },
      { x: 76, y: 52 },
      { x: 48, y: 78 }
    ];
    for (let i = spots.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    return CLAW_PLUSSES.map((p, i) => ({
      ...p,
      x: spots[i].x + (Math.random() * 4 - 2),
      y: spots[i].y + (Math.random() * 4 - 2),
      caught: false
    }));
  }

  function initClaw() {
    const machine = document.querySelector("#claw-machine");
    const claw = document.querySelector("#claw");
    const pit = document.querySelector("#claw-pit");
    const held = document.querySelector("#claw-held");
    const chutePrize = document.querySelector("#chute-prize");
    const winEl = document.querySelector("#claw-win");
    const result = document.querySelector("#claw-result");
    const album = document.querySelector("#claw-album");
    if (!machine || !claw || !pit) return;

    const MAX_DEPTH = 118;
    const state = {
      x: 42,
      depth: 0,
      busy: false,
      keys: new Set(),
      holds: new Set(),
      plushies: [],
      raf: 0
    };

    function renderAlbum() {
      if (!album) return;
      const data = loadArcade();
      const items = Object.values(data.claw.caught).sort((a, b) => (b.at || 0) - (a.at || 0));
      if (!items.length) {
        album.innerHTML = `<p class="arcade-album-empty">No plushies caught yet.</p>`;
        return;
      }
      album.innerHTML = items
        .map(
          (item) => `<div class="arcade-chip rarity-${item.rarity}">
            <img src="${item.img}" alt="">
            <span class="arcade-chip-meta"><strong>${item.name}</strong><em>${rarityLabel(item.rarity)} · ×${item.count}</em></span>
          </div>`
        )
        .join("");
    }

    function applyClawTransform() {
      claw.style.left = `${state.x}%`;
      claw.style.setProperty("--claw-depth", `${state.depth}px`);
    }

    function spawnPlushies() {
      state.plushies = shuffledLayout();
      pit.replaceChildren();
      state.plushies.forEach((p, idx) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = `plush rarity-${p.rarity}${p.golden ? " is-golden" : ""}`;
        el.dataset.idx = String(idx);
        el.style.left = `${p.x}%`;
        el.style.bottom = `${100 - p.y}%`;
        el.style.width = `${p.size}px`;
        el.tabIndex = -1;
        el.setAttribute("aria-hidden", "true");
        el.innerHTML = `<img src="${p.img}" alt="">`;
        pit.appendChild(el);
        p.el = el;
      });
      if (held) {
        held.hidden = true;
        held.innerHTML = "";
      }
      if (chutePrize) {
        chutePrize.classList.remove("is-show");
        chutePrize.innerHTML = "";
      }
      if (winEl) {
        winEl.hidden = true;
        winEl.textContent = "";
      }
      claw.classList.remove("is-closed", "is-dropping", "is-lifting", "has-prize");
      state.x = 42;
      state.depth = 0;
      applyClawTransform();
      if (result) result.textContent = "Aim carefully. Hold arrows to slide smoothly.";
    }

    function recordCatch(prize) {
      const data = loadArcade();
      data.claw.plays = (data.claw.plays || 0) + 1;
      const prev = data.claw.caught[prize.id];
      data.claw.caught[prize.id] = {
        id: prize.id,
        name: prize.name,
        rarity: prize.rarity,
        img: prize.img,
        msg: prize.msg,
        count: (prev?.count || 0) + 1,
        at: Date.now()
      };
      saveArcade(data);
      renderAlbum();
    }

    function wait(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 0 : ms));
    }

    async function deliverToChute(prize) {
      claw.classList.add("has-prize", "is-closed");
      if (held) {
        held.hidden = false;
        held.innerHTML = `<img src="${prize.img}" alt="">`;
      }
      /* Lift */
      claw.classList.add("is-lifting");
      while (state.depth > 0) {
        state.depth = Math.max(0, state.depth - 6);
        applyClawTransform();
        await wait(16);
      }
      claw.classList.remove("is-lifting");
      /* Slide to chute (~88%) */
      const targetX = 88;
      while (Math.abs(state.x - targetX) > 0.8) {
        state.x += state.x < targetX ? 1.6 : -1.6;
        applyClawTransform();
        await wait(16);
      }
      state.x = targetX;
      applyClawTransform();
      await wait(120);
      /* Release into chute */
      claw.classList.remove("is-closed", "has-prize");
      if (held) {
        held.hidden = true;
        held.innerHTML = "";
      }
      if (chutePrize) {
        chutePrize.innerHTML = `<img src="${prize.img}" alt=""><span>${prize.name}</span>`;
        chutePrize.classList.remove("is-show");
        void chutePrize.offsetWidth;
        chutePrize.classList.add("is-show");
      }
      if (winEl) {
        winEl.hidden = false;
        winEl.textContent = `${rarityLabel(prize.rarity)} catch!`;
        winEl.classList.remove("is-pop");
        void winEl.offsetWidth;
        winEl.classList.add("is-pop");
      }
      if (result) result.textContent = prize.msg;
      sfx("claw");
      recordCatch(prize);
      await wait(900);
      /* Return home */
      while (Math.abs(state.x - 42) > 0.8) {
        state.x += state.x < 42 ? 1.8 : -1.8;
        applyClawTransform();
        await wait(16);
      }
      state.x = 42;
      applyClawTransform();
    }

    async function dropSequence() {
      if (state.busy) return;
      state.busy = true;
      claw.classList.add("is-dropping");
      if (result) result.textContent = "Dropping…";

      const startDepth = state.depth;
      const target = MAX_DEPTH;
      while (state.depth < target) {
        state.depth = Math.min(target, state.depth + (reduceMotion ? target : 5));
        applyClawTransform();
        await wait(16);
      }

      /* Close claws */
      claw.classList.add("is-closed");
      await wait(220);

      const clawCenter = state.x + 1.2;
      let best = null;
      let bestDist = 999;
      state.plushies.forEach((p) => {
        if (p.caught) return;
        const distX = Math.abs(p.x - clawCenter);
        const depthMatch = Math.abs(p.y - 55 - state.depth * 0.15);
        /* Horizontal must be close; depth helps skill */
        if (distX < 9 && distX < bestDist) {
          bestDist = distX;
          best = p;
        }
      });

      let success = false;
      if (best) {
        const alignBonus = 1 - bestDist / 9;
        const chance = Math.min(0.97, best.catch * (0.55 + alignBonus * 0.55));
        success = Math.random() < chance;
      }

      if (success && best) {
        best.caught = true;
        best.el?.classList.add("is-caught");
        await deliverToChute(best);
      } else {
        if (result) {
          result.textContent = best ? "Slippery! The plush wriggled free." : "Almost! Nudge closer and try again.";
        }
        await wait(280);
        claw.classList.remove("is-closed");
        while (state.depth > startDepth) {
          state.depth = Math.max(startDepth, state.depth - 6);
          applyClawTransform();
          await wait(16);
        }
        while (state.depth > 0 && startDepth === 0) {
          state.depth = Math.max(0, state.depth - 6);
          applyClawTransform();
          await wait(16);
        }
        if (startDepth === 0) state.depth = 0;
        applyClawTransform();
      }

      claw.classList.remove("is-dropping", "is-closed", "is-lifting", "has-prize");
      state.busy = false;

      if (state.plushies.every((p) => p.caught)) {
        if (result) result.textContent = "You cleared the machine! Press Play again for a new round.";
      }
    }

    function nudge(dx, dy) {
      if (state.busy) return;
      state.x = Math.max(8, Math.min(86, state.x + dx));
      state.depth = Math.max(0, Math.min(MAX_DEPTH * 0.45, state.depth + dy));
      applyClawTransform();
    }

    function tick() {
      if (!state.busy && midwayActive()) {
        let dx = 0;
        let dy = 0;
        if (state.keys.has("ArrowLeft") || state.holds.has("left")) dx -= 0.9;
        if (state.keys.has("ArrowRight") || state.holds.has("right")) dx += 0.9;
        if (state.keys.has("ArrowUp") || state.holds.has("up")) dy -= 1.4;
        if (state.keys.has("ArrowDown") || state.holds.has("down")) dy += 1.4;
        if (dx || dy) nudge(dx, dy);
      }
      state.raf = requestAnimationFrame(tick);
    }

    function bindHold(btn, dir) {
      if (!btn) return;
      const start = (e) => {
        e.preventDefault();
        state.holds.add(dir);
      };
      const end = () => state.holds.delete(dir);
      btn.addEventListener("pointerdown", start);
      btn.addEventListener("pointerup", end);
      btn.addEventListener("pointerleave", end);
      btn.addEventListener("pointercancel", end);
    }

    bindHold(document.querySelector("#claw-left"), "left");
    bindHold(document.querySelector("#claw-right"), "right");
    bindHold(document.querySelector("#claw-up"), "up");
    bindHold(document.querySelector("#claw-down"), "down");

    document.querySelector("#claw-drop")?.addEventListener("click", () => {
      dropSequence();
    });
    document.querySelector("#claw-replay")?.addEventListener("click", () => {
      if (state.busy) return;
      spawnPlushies();
    });

    window.addEventListener("keydown", (e) => {
      if (!midwayActive() || state.busy) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        state.keys.add(e.key);
      }
      if (e.key === " " || e.key === "Enter") {
        if (e.target && ["INPUT", "TEXTAREA", "BUTTON"].includes(e.target.tagName) && e.target.id !== "claw-drop") {
          return;
        }
        e.preventDefault();
        dropSequence();
      }
    });
    window.addEventListener("keyup", (e) => {
      state.keys.delete(e.key);
    });

    spawnPlushies();
    renderAlbum();
    state.raf = requestAnimationFrame(tick);
  }

  function boot() {
    initGacha();
    initClaw();
    window.ArcadePhase1 = { ready: true };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
