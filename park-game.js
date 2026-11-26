/* —— Nate's Birthday Park exploration game —— */
(function () {
  const WORLD_W = 1600;
  const WORLD_H = 1000;
  const PLAYER_SPEED = 165;
  const NPC_SPEED = 38;
  const ENTER_RADIUS = 78;
  const GIFTS_KEY = "nates-birthday-park-gifts-v1";
  const OUTFIT_KEY = "nates-birthday-park-outfit-v1";

  const viewport = document.querySelector("#park-viewport");
  const world = document.querySelector("#park-world");
  if (!viewport || !world) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const playerEl = document.querySelector("#player");
  const promptEl = document.querySelector("#enter-prompt");
  const promptName = document.querySelector("#enter-prompt-name");
  const giftCountEl = document.querySelector("#gift-count");
  const fireworksEl = document.querySelector("#fireworks");
  const outfitBtn = document.querySelector("#outfit-btn");

  const ATTRACTIONS = [
    { room: "reasons", label: "Chiikawa's Jar Tent", x: 335, y: 400 },
    { room: "album", label: "Memory Carousel", x: 780, y: 390 },
    { room: "snacks", label: "Birthday Café", x: 1230, y: 400 },
    { room: "letter", label: "Hachiware's Post", x: 200, y: 580 },
    { room: "play", label: "Usagi's Midway", x: 1285, y: 600 },
    { room: "wishes", label: "Birthday Stage", x: 350, y: 780 },
    { room: "garden", label: "Wishing Garden", x: 800, y: 790 },
    { room: "ending", label: "Exit Gate", x: 1295, y: 800 }
  ];

  const GIFTS = [
    { id: "g1", x: 520, y: 480, msg: "A soft note: proud of you, always." },
    { id: "g2", x: 980, y: 520, msg: "Snack coupon: one pudding on Nathan." },
    { id: "g3", x: 430, y: 700, msg: "Secret: you make ordinary days special." },
    { id: "g4", x: 1100, y: 760, msg: "Wish slip: more good laughs this year." },
    { id: "g5", x: 150, y: 820, msg: "From Nat: endless sister support." },
    { id: "g6", x: 1450, y: 520, msg: "Ferris ticket: best view is beside you." }
  ];

  const OUTFITS = [
    { id: "party-pink", accent: "#f5a0b8", shirt: "#fff5f8", src: "chars/nathan-party-pink.png?v=2" },
    { id: "party-butter", accent: "#ffe56b", shirt: "#fffaf0", src: "chars/nathan-party-butter.png?v=2" },
    { id: "party-sky", accent: "#a8d8f0", shirt: "#f0f8fc", src: "chars/nathan-party-sky.png?v=2" },
    { id: "party-mint", accent: "#9fd4b0", shirt: "#f0faf2", src: "chars/nathan-party-mint.png?v=2" }
  ];

  let collected = loadGifts();
  let outfitIndex = Math.max(0, OUTFITS.findIndex((o) => o.id === localStorage.getItem(OUTFIT_KEY)));
  if (outfitIndex < 0) outfitIndex = 0;

  const player = {
    x: 800,
    y: 420,
    vx: 0,
    vy: 0,
    facing: 1,
    moving: false,
    target: null
  };

  const keys = new Set();
  let nearest = null;
  let fireworksDone = false;
  let lastTs = 0;
  let gameActive = true;

  const npcs = [
    { id: "chiikawa", el: null, x: 740, y: 250, tx: 740, ty: 250, wait: 0, lines: ["hello…", "ehehe", "happy birthday", "♡", "walk with me?"] },
    { id: "hachi", el: null, x: 700, y: 255, tx: 700, ty: 255, wait: 1.2, lines: ["you got this", "nice", "twenty suits you", "snack break?"] },
    { id: "usagi", el: null, x: 780, y: 248, tx: 780, ty: 248, wait: 0.6, lines: ["YA-HA!", "NATHAN!", "WOO!", "let's go!!", "RACE??"] }
  ];

  function loadGifts() {
    try {
      const raw = JSON.parse(localStorage.getItem(GIFTS_KEY) || "[]");
      return new Set(Array.isArray(raw) ? raw : []);
    } catch {
      return new Set();
    }
  }

  function saveGifts() {
    localStorage.setItem(GIFTS_KEY, JSON.stringify([...collected]));
  }

  function clamp(v, a, b) {
    return Math.min(b, Math.max(a, v));
  }

  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function coverScale() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    return Math.max(vw / WORLD_W, vh / WORLD_H);
  }

  function applyCamera(animate) {
    if (typeof window.__parkSetCamera !== "function") return;
    window.__parkSetCamera(player.x, player.y, coverScale(), animate);
  }

  function placePlayer() {
    if (!playerEl) return;
    playerEl.style.transform = `translate(${player.x}px, ${player.y}px)`;
    playerEl.classList.toggle("face-left", player.facing < 0);
    playerEl.classList.toggle("is-walking", player.moving);
    playerEl.style.zIndex = String(20 + Math.floor(player.y / 50));
  }

  function applyOutfit() {
    const o = OUTFITS[outfitIndex];
    localStorage.setItem(OUTFIT_KEY, o.id);
    if (!playerEl) return;
    playerEl.style.setProperty("--accent", o.accent);
    playerEl.style.setProperty("--shirt", o.shirt);
    document.body.dataset.outfit = o.id;
    const sprite = playerEl.querySelector("#player-sprite") || playerEl.querySelector(".player-sprite");
    if (sprite && o.src) sprite.src = o.src;
  }

  function updateGiftHud() {
    if (giftCountEl) giftCountEl.textContent = String(collected.size);
    document.querySelectorAll(".park-gift").forEach((g) => {
      g.hidden = collected.has(g.dataset.gift);
      g.classList.toggle("is-taken", collected.has(g.dataset.gift));
    });
  }

  function talkNpc(npc) {
    const bubble = npc.el?.querySelector(".say");
    if (!bubble) return;
    bubble.textContent = npc.lines[Math.floor(Math.random() * npc.lines.length)];
    npc.el.classList.add("is-talking");
    window.setTimeout(() => npc.el.classList.remove("is-talking"), 1800);
    if (npc.id === "usagi" && typeof window.runUsagi === "function") window.runUsagi();
  }

  function pickNpcTarget(npc) {
    npc.tx = clamp(npc.x + (Math.random() - 0.5) * 220, 120, WORLD_W - 120);
    npc.ty = clamp(npc.y + (Math.random() - 0.5) * 160, 220, WORLD_H - 100);
    npc.wait = 1.5 + Math.random() * 3.5;
  }

  function updateNpcs(dt) {
    npcs.forEach((npc) => {
      if (!npc.el) return;
      const d = dist(npc.x, npc.y, npc.tx, npc.ty);
      if (d < 6) {
        npc.wait -= dt;
        if (npc.wait <= 0) pickNpcTarget(npc);
      } else {
        const ang = Math.atan2(npc.ty - npc.y, npc.tx - npc.x);
        npc.x += Math.cos(ang) * NPC_SPEED * dt;
        npc.y += Math.sin(ang) * NPC_SPEED * dt;
      }
      const faceLeft = npc.tx < npc.x;
      npc.el.style.transform = `translate(${npc.x}px, ${npc.y}px)`;
      npc.el.classList.toggle("face-left", faceLeft);
      npc.el.style.zIndex = String(20 + Math.floor(npc.y / 50));
      npc.el.classList.toggle("is-walking", d >= 6);
    });
  }

  function updatePrompt() {
    let best = null;
    let bestD = ENTER_RADIUS;
    ATTRACTIONS.forEach((a) => {
      const d = dist(player.x, player.y, a.x, a.y);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    });
    nearest = best;
    if (!promptEl) return;
    if (best) {
      promptEl.hidden = false;
      promptEl.classList.add("is-on");
      if (promptName) promptName.textContent = best.label;
      document.querySelectorAll(".hotspot").forEach((h) => {
        h.classList.toggle("is-near", h.dataset.room === best.room);
      });
    } else {
      promptEl.hidden = true;
      promptEl.classList.remove("is-on");
      document.querySelectorAll(".hotspot.is-near").forEach((h) => h.classList.remove("is-near"));
    }
  }

  function tryEnter() {
    if (!nearest || typeof window.visitParkRoom !== "function") return;
    const spot = document.querySelector(`.hotspot[data-room="${nearest.room}"]`);
    window.visitParkRoom(nearest.room, spot);
  }

  function tryCollectNearby() {
    document.querySelectorAll(".park-gift:not(.is-taken)").forEach((g) => {
      const x = Number(g.dataset.x);
      const y = Number(g.dataset.y);
      if (dist(player.x, player.y, x, y) < 42) {
        collected.add(g.dataset.gift);
        saveGifts();
        g.classList.add("is-pop");
        window.setTimeout(() => {
          g.hidden = true;
          g.classList.add("is-taken");
        }, 280);
        updateGiftHud();
        if (typeof window.ParkAudio?.sfx === "function") window.ParkAudio.sfx("gift");
        if (typeof window.showToast === "function") {
          showToast(g.dataset.msg || "Birthday gift collected!");
        }
      }
    });
  }

  function movePlayer(dt) {
    let mx = 0;
    let my = 0;
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) mx -= 1;
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) mx += 1;
    if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) my -= 1;
    if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) my += 1;

    if (mx || my) {
      player.target = null;
      const len = Math.hypot(mx, my) || 1;
      player.x += (mx / len) * PLAYER_SPEED * dt;
      player.y += (my / len) * PLAYER_SPEED * dt;
      player.facing = mx < 0 ? -1 : mx > 0 ? 1 : player.facing;
      player.moving = true;
    } else if (player.target) {
      const d = dist(player.x, player.y, player.target.x, player.target.y);
      if (d < 5) {
        player.target = null;
        player.moving = false;
      } else {
        const ang = Math.atan2(player.target.y - player.y, player.target.x - player.x);
        player.x += Math.cos(ang) * PLAYER_SPEED * dt;
        player.y += Math.sin(ang) * PLAYER_SPEED * dt;
        player.facing = Math.cos(ang) < 0 ? -1 : 1;
        player.moving = true;
      }
    } else {
      player.moving = false;
    }

    player.x = clamp(player.x, 70, WORLD_W - 70);
    player.y = clamp(player.y, 200, WORLD_H - 70);
  }

  function tick(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    if (gameActive && document.querySelector('.room.park-mode.is-active') && !document.querySelector("dialog[open]")) {
      movePlayer(dt);
      if (!reduceMotion) updateNpcs(dt);
      placePlayer();
      updatePrompt();
      tryCollectNearby();
      applyCamera(false);
    }
    requestAnimationFrame(tick);
  }

  function worldPointFromEvent(event) {
    const rect = viewport.getBoundingClientRect();
    const scale = coverScale();
    const pan = window.__parkGetPan?.() || { x: 0, y: 0, scale };
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return {
      x: (clientX - rect.left - pan.x) / pan.scale,
      y: (clientY - rect.top - pan.y) / pan.scale
    };
  }

  function onViewportClick(event) {
    if (!gameActive) return;
    if (event.target.closest("button, a, .park-gift, .wanderer, .host, .player")) return;
    if (event.target.closest(".hotspot")) return;
    const pt = worldPointFromEvent(event);
    player.target = { x: clamp(pt.x, 70, WORLD_W - 70), y: clamp(pt.y, 200, WORLD_H - 70) };
  }

  function bindNpcs() {
    npcs.forEach((npc) => {
      npc.el = document.querySelector(`.wanderer[data-friend="${npc.id}"]`);
      if (!npc.el) return;
      npc.el.style.transform = `translate(${npc.x}px, ${npc.y}px)`;
      npc.el.addEventListener("click", (e) => {
        e.stopPropagation();
        talkNpc(npc);
      });
      pickNpcTarget(npc);
    });
  }

  function buildGifts() {
    const layer = document.querySelector("#gift-layer");
    if (!layer) return;
    layer.innerHTML = GIFTS.map((g) => {
      const taken = collected.has(g.id) ? " is-taken" : "";
      const hidden = collected.has(g.id) ? " hidden" : "";
      return `<button type="button" class="park-gift${taken}"${hidden} data-gift="${g.id}" data-x="${g.x}" data-y="${g.y}" data-msg="${g.msg}" style="left:${g.x}px;top:${g.y}px" aria-label="Birthday gift"></button>`;
    }).join("");
    layer.querySelectorAll(".park-gift").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (collected.has(btn.dataset.gift)) return;
        collected.add(btn.dataset.gift);
        saveGifts();
        btn.classList.add("is-pop");
        window.setTimeout(() => {
          btn.hidden = true;
          btn.classList.add("is-taken");
        }, 280);
        updateGiftHud();
        if (typeof window.ParkAudio?.sfx === "function") window.ParkAudio.sfx("gift");
        if (typeof window.showToast === "function") showToast(btn.dataset.msg || "Gift!");
      });
    });
    updateGiftHud();
  }

  function launchFireworks() {
    if (!fireworksEl || fireworksDone) return;
    fireworksDone = true;
    fireworksEl.hidden = false;
    fireworksEl.innerHTML = "";
    document.body.classList.add("is-fireworks");
    if (typeof window.setNightMode === "function") window.setNightMode(true);
    for (let i = 0; i < 28; i += 1) {
      const burst = document.createElement("span");
      burst.className = "fw-burst";
      burst.style.left = `${10 + Math.random() * 80}%`;
      burst.style.top = `${8 + Math.random() * 45}%`;
      burst.style.animationDelay = `${Math.random() * 2.8}s`;
      burst.style.setProperty("--c", ["#ffe56b", "#f5b8c6", "#a8d8f0", "#fff", "#c5e8c8"][i % 5]);
      fireworksEl.appendChild(burst);
    }
    if (typeof window.showToast === "function") {
      showToast("Passport complete — fireworks for Nathan!");
    }
    window.setTimeout(() => {
      document.body.classList.remove("is-fireworks");
    }, 12000);
  }

  window.addEventListener("keydown", (event) => {
    if (!document.querySelector(".room.park-mode.is-active")) return;
    if (document.querySelector("dialog[open]")) return;
    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
      event.preventDefault();
    }
    keys.add(event.key);

    if (event.key === "e" || event.key === "E" || event.key === "Enter") {
      tryEnter();
    }
    if (event.key === "c" || event.key === "C") {
      outfitIndex = (outfitIndex + 1) % OUTFITS.length;
      applyOutfit();
      if (typeof window.showToast === "function") showToast("New look unlocked.");
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key);
  });

  viewport.addEventListener("click", onViewportClick);
  promptEl?.querySelector("button")?.addEventListener("click", (e) => {
    e.stopPropagation();
    tryEnter();
  });
  outfitBtn?.addEventListener("click", () => {
    outfitIndex = (outfitIndex + 1) % OUTFITS.length;
    applyOutfit();
  });

  window.addEventListener("park:room", (event) => {
    gameActive = event.detail === "top";
    if (gameActive) {
      window.setTimeout(() => applyCamera(true), 50);
    }
  });

  window.addEventListener("park:passport-complete", () => {
    launchFireworks();
  });

  // Init
  bindNpcs();
  buildGifts();
  applyOutfit();
  placePlayer();
  applyCamera(false);
  requestAnimationFrame(tick);

  window.__parkGame = {
    launchFireworks,
    setActive(v) { gameActive = v; },
    getPlayer() { return player; }
  };
})();
