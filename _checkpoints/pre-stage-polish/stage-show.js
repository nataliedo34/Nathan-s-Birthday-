/* Birthday Stage — interactive Chiikawa performance (scoped to #wishes) */
(function () {
  "use strict";

  const ROOT_ID = "stage-show";
  const ROOM_ID = "wishes";
  const TICKET_KEY = "nates-birthday-stage-ticket-v1";
  const PASSPORT_KEY = "nates-birthday-park-passport-v1";

  const MESSAGES = [
    {
      id: "chiikawa",
      name: "Chiikawa",
      jp: "ちいかわ",
      text: "I practiced saying it. Happy birthday, Nathan. I hope your day is quiet in the nice way, and sweet at the edges.",
      reaction: "shy"
    },
    {
      id: "hachiware",
      name: "Hachiware",
      jp: "ハチワレ",
      text: "Twenty. You made it look easy. For this year: good meals, good friends, and a soft place to put your worries down.",
      reaction: "proud"
    },
    {
      id: "usagi",
      name: "Usagi",
      jp: "うさぎ",
      text: "NATHAN!! Twenty!! I brought the noise!! I hope your year is loud with happy things, and full of snacks you do not have to share!!",
      reaction: "chaos"
    }
  ];

  const CONCERT_MS = 9000;
  const TYPE_MS = 28;
  const WALK_MS = 1000;

  /** @type {ReturnType<typeof createController> | null} */
  let controller = null;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function sfx(name) {
    try {
      if (typeof window.ParkAudio?.sfx === "function") window.ParkAudio.sfx(name);
    } catch (_) { /* ignore */ }
  }

  function isAudioOff() {
    try {
      const st = window.ParkAudio?.getState?.();
      if (!st) return false;
      return Boolean(st.muted) || st.playing === false;
    } catch (_) {
      return false;
    }
  }

  function loadTicket() {
    try {
      return JSON.parse(localStorage.getItem(TICKET_KEY) || "null");
    } catch (_) {
      return null;
    }
  }

  function saveTicket(data) {
    try {
      localStorage.setItem(TICKET_KEY, JSON.stringify(data));
    } catch (_) { /* ignore */ }
  }

  /** Award stage passport stamp per existing rules (no duplicate / no complete side-effects). */
  function ensureStageStamp() {
    try {
      const raw = localStorage.getItem(PASSPORT_KEY);
      const data = raw ? JSON.parse(raw) : { stamps: {} };
      if (!data.stamps) data.stamps = {};
      if (data.stamps.wishes) return false;
      data.stamps.wishes = Date.now();
      localStorage.setItem(PASSPORT_KEY, JSON.stringify(data));
      sfx("stamp");
      return true;
    } catch (_) {
      return false;
    }
  }

  function createController(root) {
    const room = document.getElementById(ROOM_ID);
    const dialog = $(".stage-dialog", root);
    const dialogName = $(".stage-dialog-name", root);
    const dialogText = $(".stage-dialog-text", root);
    const dialogHint = $(".stage-dialog-hint", root);
    const audience = $(".stage-audience", root);
    const ticketLayer = $(".stage-ticket-layer", root);
    const fx = $(".stage-fx", root);
    const actors = {
      chiikawa: $('.stage-actor[data-char="chiikawa"]', root),
      hachiware: $('.stage-actor[data-char="hachiware"]', root),
      usagi: $('.stage-actor[data-char="usagi"]', root)
    };

    const timers = new Set();
    let act = "intro";
    let runId = 0;
    let wishIndex = 0;
    let typing = false;
    let typedFull = "";
    let typedShown = "";
    let typeTimer = 0;
    let awaitingAdvance = false;
    let advanceResolver = null;
    let concertTimer = 0;
    let noteTimer = 0;
    let stampedThisRun = false;
    let destroyed = false;

    function active(id) {
      return !destroyed && id === runId;
    }

    function wait(ms) {
      return new Promise((resolve) => {
        const id = window.setTimeout(() => {
          timers.delete(id);
          resolve();
        }, ms);
        timers.add(id);
      });
    }

    function clearTimers() {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
      if (typeTimer) {
        window.clearInterval(typeTimer);
        typeTimer = 0;
      }
      if (concertTimer) {
        window.clearTimeout(concertTimer);
        concertTimer = 0;
      }
      if (noteTimer) {
        window.clearInterval(noteTimer);
        noteTimer = 0;
      }
    }

    function setAct(next) {
      act = next;
      root.dataset.act = next;
      root.classList.toggle("is-playing", next !== "intro" && next !== "done");
    }

    function setSpot(who) {
      if (who) {
        root.dataset.spot = who;
        root.classList.add("is-spot-on");
      } else {
        delete root.dataset.spot;
        root.classList.remove("is-spot-on");
      }
    }

    function clearReactions(el) {
      if (!el) return;
      el.classList.remove(
        "is-talking", "is-shy", "is-proud", "is-chaos",
        "is-happy", "is-dance", "is-bow", "is-wave"
      );
    }

    function react(id, cls, ms) {
      const el = actors[id];
      if (!el) return;
      clearReactions(el);
      el.classList.add(cls);
      if (ms) {
        const tid = window.setTimeout(() => {
          el.classList.remove(cls);
          timers.delete(tid);
        }, ms);
        timers.add(tid);
      }
    }

    function showActor(id, on) {
      const el = actors[id];
      if (!el) return;
      el.classList.toggle("is-on", on);
      if (on) el.classList.remove("is-off-right");
    }

    function hideAllActors() {
      Object.keys(actors).forEach((id) => {
        showActor(id, false);
        clearReactions(actors[id]);
      });
    }

    function openDialog(open) {
      dialog?.classList.toggle("is-open", open);
      if (!open && dialogText) dialogText.textContent = "";
    }

    function stopTypewriter() {
      if (typeTimer) {
        window.clearInterval(typeTimer);
        typeTimer = 0;
      }
      typing = false;
    }

    function typewrite(text) {
      stopTypewriter();
      typedFull = text;
      typedShown = "";
      typing = true;
      if (dialogText) dialogText.textContent = "";
      return new Promise((resolve) => {
        typeTimer = window.setInterval(() => {
          if (destroyed) {
            stopTypewriter();
            resolve();
            return;
          }
          typedShown = typedFull.slice(0, typedShown.length + 1);
          if (dialogText) dialogText.textContent = typedShown;
          if (typedShown.length >= typedFull.length) {
            stopTypewriter();
            resolve();
          }
        }, TYPE_MS);
      });
    }

    function finishTypeNow() {
      if (!typing) return false;
      stopTypewriter();
      typedShown = typedFull;
      if (dialogText) dialogText.textContent = typedFull;
      return true;
    }

    function waitForAdvance() {
      awaitingAdvance = true;
      if (dialogHint) dialogHint.hidden = false;
      return new Promise((resolve) => {
        advanceResolver = () => {
          awaitingAdvance = false;
          advanceResolver = null;
          if (dialogHint) dialogHint.hidden = true;
          resolve();
        };
      });
    }

    function onAdvance() {
      if (typing) {
        finishTypeNow();
        return;
      }
      if (awaitingAdvance && advanceResolver) advanceResolver();
    }

    function spawnConfetti(count) {
      if (!fx) return;
      const colors = ["#ff6b8a", "#ffd36b", "#7ec8ff", "#b6f08a", "#ff9ce0", "#fff"];
      for (let i = 0; i < count; i += 1) {
        const bit = document.createElement("span");
        bit.className = "stage-confetti-bit";
        bit.style.left = `${Math.random() * 100}%`;
        bit.style.background = colors[i % colors.length];
        bit.style.animationDuration = `${2.2 + Math.random() * 2.2}s`;
        bit.style.animationDelay = `${Math.random() * 0.6}s`;
        bit.style.width = `${6 + Math.random() * 6}px`;
        bit.style.height = `${8 + Math.random() * 8}px`;
        fx.appendChild(bit);
        const tid = window.setTimeout(() => {
          bit.remove();
          timers.delete(tid);
        }, 5000);
        timers.add(tid);
      }
    }

    function spawnBalloons(count) {
      if (!fx) return;
      const colors = ["#ff8fb0", "#8ed4ff", "#ffe08a", "#c8f08a", "#d8b0ff"];
      for (let i = 0; i < count; i += 1) {
        const b = document.createElement("span");
        b.className = "stage-balloon";
        b.style.left = `${8 + Math.random() * 84}%`;
        b.style.background = colors[i % colors.length];
        b.style.animationDuration = `${4.5 + Math.random() * 3}s`;
        b.style.animationDelay = `${Math.random() * 0.8}s`;
        fx.appendChild(b);
        const tid = window.setTimeout(() => {
          b.remove();
          timers.delete(tid);
        }, 8500);
        timers.add(tid);
      }
    }

    function spawnNotes() {
      if (!fx) return;
      const notes = ["♪", "♫", "♩", "♬"];
      const n = document.createElement("span");
      n.className = "stage-note";
      n.textContent = notes[Math.floor(Math.random() * notes.length)];
      n.style.left = `${15 + Math.random() * 70}%`;
      fx.appendChild(n);
      if (!isAudioOff()) sfx("note");
      const tid = window.setTimeout(() => {
        n.remove();
        timers.delete(tid);
      }, 2400);
      timers.add(tid);
    }

    function throwFlowers() {
      if (!fx) return;
      const blooms = ["🌸", "🌼", "🌺", "💮", "🌷"];
      for (let i = 0; i < 5; i += 1) {
        const f = document.createElement("span");
        f.className = "stage-flower";
        f.textContent = blooms[i % blooms.length];
        f.style.left = `${12 + Math.random() * 76}%`;
        f.style.setProperty("--fx", `${(Math.random() - 0.5) * 60}px`);
        f.style.animationDelay = `${i * 0.06}s`;
        fx.appendChild(f);
        const tid = window.setTimeout(() => {
          f.remove();
          timers.delete(tid);
        }, 1400);
        timers.add(tid);
      }
      sfx("gift");
      Object.keys(actors).forEach((id) => {
        if (actors[id]?.classList.contains("is-on")) react(id, "is-happy", 1200);
      });
    }

    function applause() {
      sfx("gift");
      Object.keys(actors).forEach((id) => {
        if (actors[id]?.classList.contains("is-on")) react(id, "is-happy", 1400);
      });
      spawnConfetti(12);
    }

    function showTicket(force) {
      const existing = loadTicket();
      const data = existing || {
        issuedAt: Date.now(),
        guest: "Nathan",
        show: "Three Small Wishes",
        seat: "Front row · Heart"
      };
      if (!existing) saveTicket(data);
      const title = $(".stage-ticket-title", root);
      const meta = $(".stage-ticket-meta", root);
      if (title) title.textContent = "Happy 20th Birthday Concert";
      if (meta) {
        const when = new Date(data.issuedAt);
        meta.innerHTML = `Guest of honor: <strong>${data.guest}</strong><br>Show: ${data.show}<br>Seat: ${data.seat}<br>Issued: ${when.toLocaleDateString()}`;
      }
      if (ticketLayer) {
        ticketLayer.hidden = false;
        ticketLayer.classList.add("is-open");
      }
      if (force) sfx("ui");
    }

    function hideTicket() {
      if (ticketLayer) {
        ticketLayer.classList.remove("is-open");
        ticketLayer.hidden = true;
      }
    }

    function setAudience(live) {
      audience?.classList.toggle("is-live", live);
    }

    function resetVisuals() {
      root.classList.remove(
        "is-open", "is-lit", "is-concert", "is-finale", "is-spot-on", "is-playing"
      );
      delete root.dataset.spot;
      hideAllActors();
      openDialog(false);
      stopTypewriter();
      setAudience(false);
      hideTicket();
      if (fx) fx.innerHTML = "";
      stampedThisRun = false;
    }

    async function actIntroOpen() {
      setAct("opening");
      sfx("ui");
      root.classList.add("is-open");
      await wait(700);
      root.classList.add("is-lit");
      await wait(900);
    }

    async function runWish(entry) {
      setAct("wishes");
      setSpot(entry.id);
      showActor(entry.id, true);
      await wait(WALK_MS);
      react(entry.id, "is-talking", 0);
      if (dialogName) {
        dialogName.innerHTML = `${entry.name} <span class="jp" lang="ja">${entry.jp}</span>`;
      }
      openDialog(true);
      await typewrite(entry.text);
      await waitForAdvance();
      clearReactions(actors[entry.id]);
      react(entry.id, `is-${entry.reaction}`, 1400);
      await wait(900);
      openDialog(false);
      showActor(entry.id, false);
      await wait(500);
    }

    async function actWishes() {
      const id = runId;
      wishIndex = 0;
      for (let i = 0; i < MESSAGES.length; i += 1) {
        if (!active(id) || act === "done") return;
        wishIndex = i;
        await runWish(MESSAGES[i]);
      }
    }

    async function actConcert() {
      const id = runId;
      setAct("concert");
      setSpot("all");
      openDialog(false);
      Object.keys(actors).forEach((char) => {
        showActor(char, true);
        clearReactions(actors[char]);
        actors[char]?.classList.add("is-dance");
      });
      root.classList.add("is-concert");
      // Room BGM (stage.wav) already managed by ParkAudio on room enter — do not start a second bed.
      if (!isAudioOff()) sfx("note");

      noteTimer = window.setInterval(() => {
        if (!active(id) || act !== "concert") return;
        spawnNotes();
      }, 700);

      await new Promise((resolve) => {
        concertTimer = window.setTimeout(() => {
          concertTimer = 0;
          resolve();
        }, CONCERT_MS);
      });

      if (noteTimer) {
        window.clearInterval(noteTimer);
        noteTimer = 0;
      }
      if (!active(id)) return;
      root.classList.remove("is-concert");
      Object.keys(actors).forEach((char) => actors[char]?.classList.remove("is-dance"));
    }

    async function actFinale() {
      setAct("finale");
      setSpot("all");
      Object.keys(actors).forEach((id) => showActor(id, true));
      root.classList.add("is-finale");
      spawnConfetti(48);
      spawnBalloons(10);
      sfx("gift");
      await wait(600);
      Object.keys(actors).forEach((id) => react(id, "is-bow", 1600));
      await wait(1600);
      Object.keys(actors).forEach((id) => react(id, "is-wave", 2000));

      if (!stampedThisRun) {
        ensureStageStamp();
        stampedThisRun = true;
      }

      setAudience(true);
      setAct("done");
      await wait(500);
      showTicket(true);
    }

    async function runShow({ skipToFinale } = {}) {
      if (destroyed) return;
      const id = ++runId;
      if (advanceResolver) advanceResolver();
      clearTimers();
      resetVisuals();
      setAct("intro");

      if (skipToFinale) {
        root.classList.add("is-open", "is-lit");
        Object.keys(actors).forEach((char) => showActor(char, true));
        if (active(id)) await actFinale();
        return;
      }

      await actIntroOpen();
      if (!active(id)) return;
      await actWishes();
      if (!active(id) || act === "done") return;
      await actConcert();
      if (!active(id) || act === "done") return;
      await actFinale();
    }

    async function skipShow() {
      if (act === "intro" || act === "done") return;
      const id = ++runId;
      if (advanceResolver) advanceResolver();
      stopTypewriter();
      clearTimers();
      openDialog(false);
      root.classList.remove("is-concert");
      root.classList.add("is-open", "is-lit");
      Object.keys(actors).forEach((char) => {
        showActor(char, true);
        clearReactions(actors[char]);
      });
      if (active(id)) await actFinale();
    }

    function encore() {
      hideTicket();
      runShow();
    }

    function onKey(e) {
      if (room?.hasAttribute("hidden")) return;
      if (e.key === "Enter" || e.key === " ") {
        if (dialog?.classList.contains("is-open")) {
          e.preventDefault();
          onAdvance();
        }
      }
    }

    function bind() {
      $(".stage-btn-start", root)?.addEventListener("click", () => runShow());
      $(".stage-btn-skip-intro", root)?.addEventListener("click", () => runShow({ skipToFinale: true }));
      $(".stage-skip-float .stage-aud-btn", root)?.addEventListener("click", () => skipShow());
      dialog?.addEventListener("click", onAdvance);
      $(".stage-btn-applause", root)?.addEventListener("click", () => applause());
      $(".stage-btn-flowers", root)?.addEventListener("click", () => throwFlowers());
      $(".stage-btn-encore", root)?.addEventListener("click", () => encore());
      $(".stage-ticket-close", root)?.addEventListener("click", () => hideTicket());
      document.addEventListener("keydown", onKey);
    }

    function destroy() {
      destroyed = true;
      if (advanceResolver) advanceResolver();
      clearTimers();
      resetVisuals();
      setAct("intro");
      document.removeEventListener("keydown", onKey);
    }

    function pauseLeave() {
      runId += 1;
      if (advanceResolver) advanceResolver();
      clearTimers();
      stopTypewriter();
      openDialog(false);
      root.classList.remove("is-concert");
      if (noteTimer) {
        window.clearInterval(noteTimer);
        noteTimer = 0;
      }
      // Soft reset so returning starts clean at intro
      resetVisuals();
      setAct("intro");
    }

    bind();
    setAct("intro");

    return { runShow, skipShow, encore, destroy, pauseLeave, applause, throwFlowers };
  }

  function mount() {
    const root = document.getElementById(ROOT_ID);
    if (!root || controller) return;
    controller = createController(root);
  }

  function watchRoom() {
    const room = document.getElementById(ROOM_ID);
    if (!room || typeof MutationObserver !== "function") return;
    const obs = new MutationObserver(() => {
      if (room.hasAttribute("hidden")) {
        controller?.pauseLeave();
      } else {
        mount();
      }
    });
    obs.observe(room, { attributes: true, attributeFilter: ["hidden"] });
    if (!room.hasAttribute("hidden")) mount();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watchRoom);
  } else {
    watchRoom();
  }
})();
