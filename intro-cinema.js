/* Cinematic birthday opening — 4 scenes */
(function () {
  const intro = document.querySelector("#intro");
  if (!intro || !intro.classList.contains("cinema")) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stage = document.querySelector("#cinema-stage");
  const scenes = [...document.querySelectorAll(".cin-scene")];
  const dots = [...document.querySelectorAll("#cinema-dots span")];
  const ticket = document.querySelector("#entrance-ticket");
  const confettiHost = document.querySelector("#cin-confetti");
  const polaroidVideo = document.querySelector("#cin-memory-video");

  let sceneIndex = 0;
  let token = 0;
  let finished = false;
  const timers = [];
  const partyLineIndex = { chiikawa: 0, hachi: 0, usagi: 0 };
  const PARTY_LINES = {
    chiikawa: ["happy birthday…", "ehehe", "for you, Nathan", "♡"],
    hachi: ["you got this", "twenty looks good", "nice party", "snack?"],
    usagi: ["YA-HA!", "NATHAN!!", "WOO!", "CAKE TIME!!"]
  };

  // Scene holds: meadow → party → scrapbook → gate
  const HOLD_MS = reduceMotion ? [0, 500, 500, 500] : [5500, 5200, 6000, Infinity];

  function clearTimers() {
    while (timers.length) window.clearTimeout(timers.pop());
  }

  function later(id, fn, ms) {
    if (ms === Infinity) return;
    const handle = window.setTimeout(() => {
      if (id === token) fn();
    }, ms);
    timers.push(handle);
  }

  function reveal(el, delay) {
    if (!el) return;
    later(token, () => el.classList.add("is-in"), delay);
  }

  function setScene(index) {
    sceneIndex = Math.max(0, Math.min(scenes.length - 1, index));
    scenes.forEach((scene, i) => {
      const on = i === sceneIndex;
      scene.classList.toggle("is-active", on);
      scene.setAttribute("aria-hidden", on ? "false" : "true");
      scene.style.removeProperty("opacity");
      scene.style.removeProperty("visibility");
    });
    dots.forEach((dot, i) => dot.classList.toggle("is-on", i === sceneIndex));

    scenes.forEach((scene) => {
      scene.querySelectorAll(".cin-line, .cin-title, .entrance-ticket").forEach((el) => {
        el.classList.remove("is-in");
      });
    });

    const active = scenes[sceneIndex];
    if (!active) return;

    // Restart Chiikawa walk when returning to meadow
    if (sceneIndex === 0) {
      const walker = active.querySelector(".chiikawa-walk");
      if (walker && !reduceMotion) {
        walker.style.animation = "none";
        void walker.offsetWidth;
        walker.style.animation = "";
      }
      reveal(active.querySelector("#line-1"), reduceMotion ? 0 : 1800);
    }
    if (sceneIndex === 1) {
      hidePartySays();
      active.querySelectorAll(".arrive").forEach((el) => {
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
      });
      later(token, () => {
        active.querySelector("#line-2")?.classList.add("is-in");
        burstConfetti();
      }, reduceMotion ? 0 : 700);
    } else {
      hidePartySays();
    }
    if (sceneIndex === 2) {
      reveal(active.querySelector("#line-3"), reduceMotion ? 0 : 900);
      if (polaroidVideo) {
        polaroidVideo.muted = true;
        polaroidVideo.volume = 0;
        const play = polaroidVideo.play();
        if (play && typeof play.catch === "function") play.catch(() => {});
      }
    } else if (polaroidVideo) {
      polaroidVideo.pause();
    }
    if (sceneIndex === 3) {
      reveal(active.querySelector("#line-4"), reduceMotion ? 0 : 300);
      reveal(ticket, reduceMotion ? 0 : 700);
    }
  }

  function burstConfetti() {
    if (!confettiHost || reduceMotion) return;
    confettiHost.replaceChildren();
    const colors = ["#f7b7c3", "#ffe56b", "#b7d4ea", "#fff", "#c5e6a0", "#e9899c"];
    for (let i = 0; i < 36; i += 1) {
      const piece = document.createElement("i");
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      piece.style.animationDuration = `${2.2 + Math.random() * 1.4}s`;
      confettiHost.append(piece);
    }
  }

  function goTo(index) {
    if (finished) return;
    clearTimers();
    token += 1;
    setScene(index);
  }

  function advanceFrom(index, id) {
    const hold = HOLD_MS[index];
    if (hold === Infinity) return;
    later(id, () => {
      if (index + 1 < scenes.length) {
        setScene(index + 1);
        advanceFrom(index + 1, id);
      }
    }, hold);
  }

  function startCinema() {
    finished = false;
    clearTimers();
    token += 1;
    const id = token;
    intro.classList.remove("is-gone", "leave");
    intro.removeAttribute("aria-hidden");
    ticket?.classList.remove("is-in");
    setScene(0);
    advanceFrom(0, id);
  }

  function finishCinema() {
    if (finished) return;
    finished = true;
    clearTimers();
    token += 1;
    if (polaroidVideo) polaroidVideo.pause();
    if (typeof window.openSite === "function") window.openSite();
  }

  ticket?.addEventListener("click", (event) => {
    event.stopPropagation();
    finishCinema();
  });

  function hidePartySays() {
    document.querySelectorAll(".party-say").forEach((el) => {
      el.classList.remove("is-on");
      el.textContent = "";
    });
  }

  function talkPartyFriend(friend) {
    const name = friend?.dataset?.friend;
    const bubble = friend?.querySelector(".party-say");
    const lines = PARTY_LINES[name];
    if (!bubble || !lines?.length) return;
    document.querySelectorAll(".party-say").forEach((el) => {
      if (el !== bubble) {
        el.classList.remove("is-on");
        el.textContent = "";
      }
    });
    const idx = partyLineIndex[name] % lines.length;
    partyLineIndex[name] = idx + 1;
    bubble.textContent = lines[idx];
    bubble.classList.add("is-on");
    window.clearTimeout(bubble._hideTimer);
    bubble._hideTimer = window.setTimeout(() => {
      bubble.classList.remove("is-on");
      bubble.textContent = "";
    }, 2200);
  }

  document.querySelectorAll(".arrive[data-friend]").forEach((friend) => {
    friend.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const scene = friend.closest(".cin-scene");
      if (!scene?.classList.contains("is-active")) return;
      talkPartyFriend(friend);
    });
  });

  stage?.addEventListener("pointermove", (event) => {
    if (reduceMotion || sceneIndex !== 0) return;
    const scene = scenes[0];
    if (!scene?.classList.contains("is-active")) return;
    const rect = scene.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    scene.querySelectorAll("[data-depth]").forEach((layer) => {
      const d = Number(layer.dataset.depth) || 0.2;
      layer.style.transform = `translate(${x * -24 * d}px, ${y * -16 * d}px)`;
    });
  });

  /* Mute button is owned by audio.js (ParkAudio). */

  window.__cinema = {
    start: startCinema,
    finish: finishCinema,
    goTo,
    isFinished: () => finished
  };
})();
