/* —— Nate's Birthday Café · Phase 1 ——
   Isolated cooking game. Storage key separate from park/passport/arcade. */
(function () {
  const CAFE_KEY = "nates-birthday-cafe-v1";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function sfx(name) {
    if (typeof window.ParkAudio?.sfx === "function") window.ParkAudio.sfx(name);
  }

  function loadCafe() {
    try {
      const raw = localStorage.getItem(CAFE_KEY);
      if (!raw) return { version: 1, coins: 0, stars: 0, served: 0, highStars: 0 };
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return { version: 1, coins: 0, stars: 0, served: 0, highStars: 0 };
      return {
        version: 1,
        coins: data.coins || 0,
        stars: data.stars || 0,
        served: data.served || 0,
        highStars: data.highStars || 0
      };
    } catch {
      return { version: 1, coins: 0, stars: 0, served: 0, highStars: 0 };
    }
  }

  function saveCafe(data) {
    try {
      localStorage.setItem(CAFE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  const RECIPES = {
    pudding: {
      id: "pudding",
      name: "Caramel pudding",
      jp: "プリン",
      icon: "chars/snack-pudding.svg",
      steps: ["crack", "ingredients", "mix", "pour", "flip", "decorate"]
    },
    onigiri: {
      id: "onigiri",
      name: "Onigiri",
      jp: "おにぎり",
      icon: "chars/snack-onigiri.svg",
      steps: ["filling", "rice", "shape", "nori", "plate"]
    },
    cake: {
      id: "cake",
      name: "Strawberry cake",
      jp: "ケーキ",
      icon: "chars/snack-cake.svg",
      steps: ["stack", "frost", "berries", "toppings"]
    }
  };

  const CUSTOMERS = [
    {
      id: "chiikawa",
      name: "Chiikawa",
      img: "chars/chiikawa.png",
      likes: ["pudding", "cake"],
      orderLines: {
        pudding: ["quietly… pudding?", "um… caramel pudding…", "ehehe… pudding please…"],
        cake: ["um… strawberry cake…?", "ehehe… cake please…", "quietly… strawberry cake?"],
        onigiri: ["um… onigiri…?", "ehehe… rice ball please…"]
      },
      happy: ["ehehe… delicious…", "warm… thank you…", "♡ so good…"],
      sad: ["ah… almost…", "it's okay… try again…", "um… different next time…"]
    },
    {
      id: "hachi",
      name: "Hachiware",
      img: "chars/hachiware.png",
      likes: ["onigiri", "pudding", "cake"],
      orderLines: {
        pudding: ["One caramel pudding, please!", "Pudding sounds perfect today.", "Chef Nathan! Pudding for me."],
        onigiri: ["One onigiri, please!", "I'd love a cozy onigiri.", "Chef Nathan! Onigiri, kindly."],
        cake: ["One strawberry cake, please!", "Cake sounds perfect today.", "Chef Nathan! Strawberry cake for me."]
      },
      happy: ["Perfect! You nailed it.", "That tastes like a happy day.", "I'd order this again tomorrow."],
      sad: ["Close! A little tweak next time.", "Still charming — just not quite the order.", "We'll get it next round."]
    },
    {
      id: "usagi",
      name: "Usagi",
      img: "chars/usagi.png",
      likes: ["cake", "onigiri"],
      orderLines: {
        cake: ["YA-HA!! STRAWBERRY CAKE!!", "Gimme cake!! NOW!!", "NATHAN!! CAKE TIME!!"],
        onigiri: ["YA-HA!! ONIGIRI!!", "Gimme onigiri!! NOW!!", "NATHAN!! RICE BALL!!"],
        pudding: ["YA-HA!! PUDDING!!", "Gimme pudding!! NOW!!", "NATHAN!! PUDDING!!"]
      },
      happy: ["YAAAAY!! BEST!!", "MORE MORE— wait, perfect!!", "USAGI APPROVES!!"],
      sad: ["HMMM… not it!!", "Almost!! Again!!", "Taste is weird!! Try again!!"]
    }
  ];

  const root = document.querySelector("#cafe-game");
  if (!root) return;

  const els = {
    coins: root.querySelector("#cafe-coins"),
    stars: root.querySelector("#cafe-stars"),
    served: root.querySelector("#cafe-served"),
    sessionBtn: root.querySelector("#cafe-session-btn"),
    customer: root.querySelector("#cafe-customer"),
    customerImg: root.querySelector("#cafe-customer-img"),
    hearts: root.querySelector("#cafe-hearts"),
    bubble: root.querySelector("#cafe-bubble"),
    bubbleText: root.querySelector("#cafe-bubble-text"),
    orderPreview: root.querySelector("#cafe-order-preview"),
    dish: root.querySelector("#cafe-dish"),
    idle: root.querySelector("#cafe-idle"),
    cook: root.querySelector("#cafe-cook"),
    stepLabel: root.querySelector("#cafe-step-label"),
    stepDots: root.querySelector("#cafe-step-dots"),
    board: root.querySelector("#cafe-board"),
    tools: root.querySelector("#cafe-tools"),
    hint: root.querySelector("#cafe-hint"),
    status: root.querySelector("#cafe-status"),
    accept: root.querySelector("#cafe-accept"),
    serve: root.querySelector("#cafe-serve"),
    next: root.querySelector("#cafe-next"),
    restart: root.querySelector("#cafe-restart")
  };

  const state = {
    open: false,
    phase: "idle", // idle | order | cooking | result
    customer: null,
    recipe: null,
    stepIndex: 0,
    quality: 1,
    mistakes: 0,
    dishReady: false,
    progress: {},
    awarding: false
  };

  let persist = loadCafe();

  function rand(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function orderLine(customer, recipe) {
    const lines = customer?.orderLines?.[recipe?.id];
    if (lines && lines.length) return rand(lines);
    if (recipe?.name) return `One ${recipe.name.toLowerCase()}, please!`;
    return "One snack, please!";
  }

  function setRestartVisible(on) {
    show(els.restart, on);
  }

  function renderHud() {
    if (els.coins) els.coins.textContent = String(persist.coins);
    if (els.stars) els.stars.textContent = String(persist.stars);
    if (els.served) els.served.textContent = String(persist.served);
  }

  function setStatus(text) {
    if (els.status) els.status.textContent = text;
  }

  function setHint(text) {
    if (els.hint) els.hint.textContent = text;
  }

  function show(el, on) {
    if (!el) return;
    el.hidden = !on;
  }

  function clearDish() {
    if (els.dish) {
      els.dish.innerHTML = "";
      els.dish.classList.remove("is-ready");
    }
  }

  function setDishIcon(recipe) {
    if (!els.dish || !recipe) return;
    els.dish.innerHTML = `<img src="${recipe.icon}" alt="${recipe.name}">`;
    els.dish.classList.add("is-ready");
  }

  function resetCustomerVisual() {
    els.customer?.classList.remove("is-waiting", "is-happy", "is-sad");
    els.customer?.classList.add("is-empty");
    show(els.bubble, false);
    if (els.hearts) els.hearts.textContent = "";
  }

  function arriveCustomer() {
    const customer = rand(CUSTOMERS);
    const recipeId = rand(customer.likes);
    const recipe = RECIPES[recipeId];
    state.customer = customer;
    state.recipe = recipe;
    state.stepIndex = 0;
    state.quality = 1;
    state.mistakes = 0;
    state.dishReady = false;
    state.progress = {};
    state.phase = "order";
    clearDish();

    els.customer?.classList.remove("is-empty", "is-happy", "is-sad");
    els.customer?.classList.add("is-waiting");
    if (els.customerImg) {
      els.customerImg.src = customer.img;
      els.customerImg.alt = customer.name;
    }
    if (els.bubbleText) els.bubbleText.textContent = orderLine(customer, recipe);
    if (els.orderPreview) {
      els.orderPreview.innerHTML = `<img src="${recipe.icon}" alt=""><span>${recipe.name}</span>`;
    }
    show(els.bubble, true);
    show(els.accept, true);
    show(els.serve, false);
    show(els.next, false);
    setRestartVisible(false);
    show(els.idle, false);
    show(els.cook, false);
    setStatus(`${customer.name} is waiting for ${recipe.name}.`);
    sfx("claw");
  }

  function startCooking() {
    state.phase = "cooking";
    state.stepIndex = 0;
    state.quality = 1;
    state.mistakes = 0;
    state.progress = {};
    show(els.accept, false);
    show(els.idle, false);
    show(els.cook, true);
    setRestartVisible(true);
    renderStep();
  }

  function restartRecipe() {
    if (state.phase !== "cooking" || !state.recipe) return;
    state.stepIndex = 0;
    state.quality = 1;
    state.mistakes = 0;
    state.progress = {};
    state.dishReady = false;
    clearDish();
    setRestartVisible(true);
    setStatus(`Restarting ${state.recipe.name} — café progress kept.`);
    renderStep();
    sfx("claw");
  }

  function renderStepDots() {
    if (!els.stepDots || !state.recipe) return;
    const steps = state.recipe.steps;
    els.stepDots.innerHTML = steps
      .map((_, i) => {
        const cls = i < state.stepIndex ? "is-done" : i === state.stepIndex ? "is-on" : "";
        return `<span class="${cls}"></span>`;
      })
      .join("");
  }

  function advanceStep(qualityDelta) {
    if (qualityDelta) state.quality = clamp(state.quality + qualityDelta, 0.35, 1.2);
    state.stepIndex += 1;
    if (state.stepIndex >= state.recipe.steps.length) {
      finishCooking();
      return;
    }
    renderStep();
  }

  function finishCooking() {
    state.phase = "ready";
    state.dishReady = true;
    setDishIcon(state.recipe);
    show(els.cook, false);
    setRestartVisible(false);
    show(els.serve, true);
    setStatus(`${state.recipe.name} is ready — serve ${state.customer.name}!`);
    setHint("");
    sfx("claw");
  }

  function scoreStars() {
    let stars = 1;
    if (state.quality >= 0.72 && state.mistakes <= 2) stars = 2;
    if (state.quality >= 0.92 && state.mistakes === 0) stars = 3;
    return stars;
  }

  function serveDish() {
    if (!state.dishReady || state.awarding) return;
    state.awarding = true;
    const stars = scoreStars();
    const happy = stars >= 2;
    const customer = state.customer;
    els.customer?.classList.remove("is-waiting");
    els.customer?.classList.add(happy ? "is-happy" : "is-sad");
    if (els.hearts) els.hearts.textContent = happy ? "♡ ♡ ♡" : "…";
    if (els.bubbleText) els.bubbleText.textContent = rand(happy ? customer.happy : customer.sad);
    show(els.bubble, true);

    const coins = stars * 12 + Math.round(state.quality * 8);
    persist.coins += coins;
    persist.stars += stars;
    persist.served += 1;
    persist.highStars = Math.max(persist.highStars, stars);
    saveCafe(persist);
    renderHud();

    setStatus(`${"★".repeat(stars)}${"☆".repeat(3 - stars)}  +${coins} coins`);
    show(els.serve, false);
    setRestartVisible(false);
    show(els.next, true);
    state.phase = "result";
    state.awarding = false;
    sfx("claw");
  }

  /* ========== STEP RENDERERS ========== */
  function renderStep() {
    const step = state.recipe.steps[state.stepIndex];
    renderStepDots();
    els.board.innerHTML = "";
    els.tools.innerHTML = "";
    els.board.onpointerdown = null;
    els.board.onpointermove = null;
    els.board.onpointerup = null;

    const labelNames = {
      crack: "Crack the eggs",
      ingredients: "Choose ingredients",
      mix: "Mix the batter",
      pour: "Pour the caramel",
      flip: "Flip the pudding",
      decorate: "Add a topping",
      filling: "Pick a filling",
      rice: "Add the rice",
      shape: "Shape the onigiri",
      nori: "Wrap with nori",
      plate: "Plate it",
      stack: "Stack cake layers",
      frost: "Spread frosting",
      berries: "Place strawberries",
      toppings: "Add sprinkles"
    };
    if (els.stepLabel) els.stepLabel.textContent = labelNames[step] || step;

    if (state.recipe.id === "pudding") renderPuddingStep(step);
    else if (state.recipe.id === "onigiri") renderOnigiriStep(step);
    else renderCakeStep(step);
  }

  function noteMistake() {
    state.mistakes += 1;
    state.quality = clamp(state.quality - 0.08, 0.35, 1.2);
  }

  /* —— Pudding —— */
  function renderPuddingStep(step) {
    if (step === "crack") {
      setHint("Tap the egg three times to crack it.");
      let taps = 0;
      let cracked = false;
      const egg = document.createElement("button");
      egg.type = "button";
      egg.className = "cafe-egg";
      egg.setAttribute("aria-label", "Crack egg");
      egg.addEventListener("click", () => {
        if (cracked) return;
        taps += 1;
        egg.classList.toggle("is-cracked", taps >= 1);
        egg.style.transform = `rotate(${(Math.random() * 10 - 5).toFixed(1)}deg) scale(1.04)`;
        sfx("claw");
        if (taps >= 3) {
          cracked = true;
          egg.classList.add("is-open");
          setHint("Eggs cracked!");
          window.setTimeout(() => advanceStep(0.05), reduceMotion ? 0 : 280);
        } else {
          setHint(`${3 - taps} more tap${3 - taps === 1 ? "" : "s"}…`);
        }
      });
      els.board.appendChild(egg);
      return;
    }

    if (step === "ingredients") {
      setHint("Select milk, sugar, and vanilla. Avoid the silly extras.");
      const needed = new Set(["milk", "sugar", "vanilla"]);
      const picked = new Set();
      const options = [
        { id: "milk", label: "Milk" },
        { id: "sugar", label: "Sugar" },
        { id: "vanilla", label: "Vanilla" },
        { id: "ketchup", label: "Ketchup" },
        { id: "pickles", label: "Pickles" }
      ];
      options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cafe-tool";
        btn.textContent = opt.label;
        btn.addEventListener("click", () => {
          if (picked.has(opt.id)) return;
          if (!needed.has(opt.id)) {
            btn.classList.add("is-wrong");
            noteMistake();
            setHint("Not for pudding! Try another.");
            sfx("claw");
            return;
          }
          picked.add(opt.id);
          btn.classList.add("is-selected");
          sfx("claw");
          if (picked.size === needed.size) {
            setHint("Batter base ready!");
            window.setTimeout(() => advanceStep(0.08), reduceMotion ? 0 : 320);
          } else {
            setHint(`Nice — ${needed.size - picked.size} more ingredient${needed.size - picked.size === 1 ? "" : "s"}.`);
          }
        });
        els.tools.appendChild(btn);
      });
      const bowl = document.createElement("div");
      bowl.className = "cafe-bowl";
      bowl.innerHTML = `<span class="cafe-bowl-mix"></span>`;
      els.board.appendChild(bowl);
      return;
    }

    if (step === "mix") {
      setHint("Drag in circles around the bowl to mix.");
      const bowl = document.createElement("div");
      bowl.className = "cafe-bowl";
      const mix = document.createElement("span");
      mix.className = "cafe-bowl-mix";
      bowl.appendChild(mix);
      els.board.appendChild(bowl);

      let mixing = false;
      let lastAngle = null;
      let spun = 0;
      const center = () => {
        const r = bowl.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height * 0.55 };
      };
      const onDown = (e) => {
        mixing = true;
        bowl.setPointerCapture?.(e.pointerId);
        lastAngle = null;
      };
      const onMove = (e) => {
        if (!mixing) return;
        const c = center();
        const ang = Math.atan2(e.clientY - c.y, e.clientX - c.x);
        if (lastAngle != null) {
          let d = ang - lastAngle;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          spun += Math.abs(d);
          const t = Math.min(1, spun / (Math.PI * 4));
          mix.style.transform = `rotate(${spun * 40}deg) translateX(${10 + t * 18}px)`;
          if (t >= 1 && !bowl.classList.contains("is-mixed")) {
            bowl.classList.add("is-mixed");
            setHint("Smooth and creamy!");
            mixing = false;
            window.setTimeout(() => advanceStep(0.1), reduceMotion ? 0 : 350);
          } else if (t < 1) {
            setHint(`Mixing… ${Math.round(t * 100)}%`);
          }
        }
        lastAngle = ang;
      };
      const onUp = () => {
        mixing = false;
        lastAngle = null;
      };
      bowl.addEventListener("pointerdown", onDown);
      bowl.addEventListener("pointermove", onMove);
      bowl.addEventListener("pointerup", onUp);
      bowl.addEventListener("pointercancel", onUp);
      return;
    }

    if (step === "pour") {
      setHint("Hold / drag downward on the mold to pour caramel.");
      const mold = document.createElement("div");
      mold.className = "cafe-mold";
      const fill = document.createElement("div");
      fill.className = "cafe-caramel-fill";
      mold.appendChild(fill);
      els.board.appendChild(mold);
      let pouring = false;
      let amount = 0;
      let lastY = 0;
      mold.addEventListener("pointerdown", (e) => {
        pouring = true;
        lastY = e.clientY;
        mold.setPointerCapture?.(e.pointerId);
      });
      let poured = false;
      mold.addEventListener("pointermove", (e) => {
        if (!pouring || poured) return;
        const dy = e.clientY - lastY;
        lastY = e.clientY;
        if (dy > 0) amount = clamp(amount + dy * 0.35, 0, 100);
        fill.style.height = `${amount}%`;
        setHint(`Caramel fill ${Math.round(amount)}%`);
        if (amount >= 92) {
          poured = true;
          pouring = false;
          const bonus = amount <= 100 ? 0.08 : 0.02;
          window.setTimeout(() => advanceStep(bonus), reduceMotion ? 0 : 250);
        }
      });
      mold.addEventListener("pointerup", () => {
        pouring = false;
      });
      return;
    }

    if (step === "flip") {
      setHint("When it sparkles ready, swipe up or click to flip!");
      const stage = document.createElement("div");
      stage.className = "cafe-flip-stage";
      const cake = document.createElement("button");
      cake.type = "button";
      cake.className = "cafe-pudding-cake";
      cake.setAttribute("aria-label", "Flip pudding");
      stage.appendChild(cake);
      els.board.appendChild(stage);

      let ready = false;
      let done = false;
      const readyTimer = window.setTimeout(() => {
        ready = true;
        cake.style.boxShadow = "0 0 16px rgba(255, 200, 80, 0.7)";
        setHint("Now! Flip!");
      }, reduceMotion ? 200 : 1100);

      let startY = null;
      const tryFlip = (early) => {
        if (done) return;
        done = true;
        window.clearTimeout(readyTimer);
        cake.classList.add("is-flipped");
        if (early || !ready) {
          noteMistake();
          setHint("A little early — still tasty.");
          window.setTimeout(() => advanceStep(-0.05), reduceMotion ? 0 : 450);
        } else {
          setHint("Perfect flip!");
          window.setTimeout(() => advanceStep(0.12), reduceMotion ? 0 : 450);
        }
        sfx("claw");
      };
      cake.addEventListener("pointerdown", (e) => {
        startY = e.clientY;
        cake.setPointerCapture?.(e.pointerId);
      });
      cake.addEventListener("pointerup", (e) => {
        if (startY != null && startY - e.clientY > 28) tryFlip(false);
        else if (ready) tryFlip(false);
        else tryFlip(true);
        startY = null;
      });
      return;
    }

    if (step === "decorate") {
      setHint("Optional: add whipped cream or a berry — or skip.");
      ["Whipped cream", "Berry", "Skip"].forEach((label) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cafe-tool";
        btn.textContent = label;
        btn.addEventListener("click", () => {
          sfx("claw");
          advanceStep(label === "Skip" ? 0 : 0.06);
        });
        els.tools.appendChild(btn);
      });
      const cake = document.createElement("div");
      cake.className = "cafe-pudding-cake is-flipped";
      els.board.appendChild(cake);
    }
  }

  /* —— Onigiri —— */
  function renderOnigiriStep(step) {
    const wrap = document.createElement("div");
    wrap.className = "cafe-rice-ball";
    const rice = document.createElement("div");
    rice.className = "cafe-rice";
    const filling = document.createElement("div");
    filling.className = "cafe-filling-chip";
    const nori = document.createElement("div");
    nori.className = "cafe-nori";
    wrap.append(rice, filling, nori);
    els.board.appendChild(wrap);

    if (step === "filling") {
      setHint("Choose umeboshi, tuna mayo, or salmon.");
      [
        { id: "umeboshi", label: "Umeboshi" },
        { id: "tuna", label: "Tuna mayo" },
        { id: "salmon", label: "Salmon" }
      ].forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cafe-tool";
        btn.textContent = opt.label;
        btn.addEventListener("click", () => {
          state.progress.filling = opt.id;
          filling.dataset.fill = opt.id;
          filling.classList.add("is-on");
          sfx("claw");
          window.setTimeout(() => advanceStep(0.08), reduceMotion ? 0 : 280);
        });
        els.tools.appendChild(btn);
      });
      return;
    }

    if (state.progress.filling) {
      filling.dataset.fill = state.progress.filling;
      filling.classList.add("is-on");
    }

    if (step === "rice") {
      setHint("Tap Add rice until the ball is full.");
      let scoops = state.progress.rice || 0;
      let riceDone = scoops >= 3;
      rice.style.transform = `scale(${0.45 + scoops * 0.18})`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cafe-tool cafe-btn-primary";
      btn.textContent = "Add rice";
      btn.addEventListener("click", () => {
        if (riceDone) return;
        scoops += 1;
        state.progress.rice = scoops;
        rice.style.transform = `scale(${Math.min(1, 0.45 + scoops * 0.18)})`;
        sfx("claw");
        if (scoops >= 3) {
          riceDone = true;
          rice.classList.add("is-full");
          window.setTimeout(() => advanceStep(0.08), reduceMotion ? 0 : 250);
        } else setHint(`${3 - scoops} more scoop${3 - scoops === 1 ? "" : "s"}`);
      });
      els.tools.appendChild(btn);
      return;
    }

    rice.classList.add("is-full");

    if (step === "shape") {
      setHint("Press and hold, then drag a triangle path around the rice.");
      let shaping = false;
      let corners = 0;
      let lastCorner = null;
      const zones = [
        { name: "top", test: (x, y) => y < 0.35 && x > 0.3 && x < 0.7 },
        { name: "br", test: (x, y) => y > 0.65 && x > 0.55 },
        { name: "bl", test: (x, y) => y > 0.65 && x < 0.45 }
      ];
      const hit = new Set();
      let shaped = false;
      wrap.style.cursor = "pointer";
      wrap.addEventListener("pointerdown", (e) => {
        if (shaped) return;
        shaping = true;
        wrap.setPointerCapture?.(e.pointerId);
      });
      wrap.addEventListener("pointermove", (e) => {
        if (!shaping || shaped) return;
        const r = wrap.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        zones.forEach((z) => {
          if (z.test(x, y) && !hit.has(z.name)) {
            hit.add(z.name);
            corners += 1;
            setHint(`Shaping… ${corners}/3 corners`);
          }
        });
        rice.style.transform = `scale(1) rotate(${(hit.size - 1) * 2}deg)`;
        if (hit.size >= 3) {
          shaped = true;
          shaping = false;
          window.setTimeout(() => advanceStep(0.1), reduceMotion ? 0 : 280);
        }
      });
      wrap.addEventListener("pointerup", () => {
        shaping = false;
      });
      return;
    }

    if (step === "nori") {
      setHint("Drag the seaweed onto the bottom of the rice.");
      const strip = document.createElement("button");
      strip.type = "button";
      strip.className = "cafe-tool";
      strip.textContent = "Nori sheet";
      strip.draggable = true;
      let placed = false;
      const place = () => {
        if (placed) return;
        placed = true;
        nori.classList.add("is-on");
        sfx("claw");
        window.setTimeout(() => advanceStep(0.08), reduceMotion ? 0 : 300);
      };
      strip.addEventListener("click", place);
      wrap.addEventListener("dragover", (e) => e.preventDefault());
      wrap.addEventListener("drop", (e) => {
        e.preventDefault();
        place();
      });
      strip.addEventListener("pointerdown", () => {
        /* touch-friendly: second path via click */
      });
      els.tools.appendChild(strip);
      // also allow tapping the rice ball
      wrap.addEventListener("click", place);
      return;
    }

    nori.classList.add("is-on");

    if (step === "plate") {
      setHint("Tap the plate to set your onigiri down.");
      const plate = document.createElement("button");
      plate.type = "button";
      plate.className = "cafe-tool cafe-btn-primary";
      plate.textContent = "Set on plate";
      plate.addEventListener("click", () => {
        sfx("claw");
        advanceStep(0.08);
      });
      els.tools.appendChild(plate);
    }
  }

  /* —— Cake —— */
  function renderCakeStep(step) {
    const stack = document.createElement("div");
    stack.className = "cafe-cake-stack";
    els.board.appendChild(stack);

    if (step === "stack") {
      setHint("Tap Add layer — build 3 soft sponges.");
      let layers = 0;
      let stacked = false;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cafe-tool cafe-btn-primary";
      btn.textContent = "Add layer";
      btn.addEventListener("click", () => {
        if (stacked) return;
        layers += 1;
        const layer = document.createElement("div");
        layer.className = "cafe-cake-layer";
        layer.style.width = `${100 + layers * 6}px`;
        stack.appendChild(layer);
        sfx("claw");
        if (layers >= 3) {
          stacked = true;
          window.setTimeout(() => advanceStep(0.08), reduceMotion ? 0 : 280);
        } else setHint(`${3 - layers} layer${3 - layers === 1 ? "" : "s"} to go`);
      });
      els.tools.appendChild(btn);
      return;
    }

    // restore 3 layers visually
    for (let i = 0; i < 3; i += 1) {
      const layer = document.createElement("div");
      layer.className = "cafe-cake-layer";
      layer.style.width = `${106 + i * 6}px`;
      stack.appendChild(layer);
    }

    if (step === "frost") {
      setHint("Drag across the cake to spread frosting.");
      const frost = document.createElement("div");
      frost.className = "cafe-frost-layer";
      const cover = document.createElement("div");
      cover.className = "cafe-frost-cover";
      frost.appendChild(cover);
      stack.appendChild(frost);
      let painting = false;
      let coverage = 0;
      let frosted = false;
      frost.addEventListener("pointerdown", (e) => {
        if (frosted) return;
        painting = true;
        frost.setPointerCapture?.(e.pointerId);
      });
      frost.addEventListener("pointermove", (e) => {
        if (!painting || frosted) return;
        coverage = clamp(coverage + 1.8, 0, 100);
        cover.style.opacity = String(coverage / 100);
        setHint(`Frosting ${Math.round(coverage)}%`);
        if (coverage >= 92) {
          frosted = true;
          painting = false;
          window.setTimeout(() => advanceStep(0.1), reduceMotion ? 0 : 280);
        }
      });
      frost.addEventListener("pointerup", () => {
        painting = false;
      });
      return;
    }

    const frost = document.createElement("div");
    frost.className = "cafe-frost-layer";
    const cover = document.createElement("div");
    cover.className = "cafe-frost-cover";
    cover.style.opacity = "1";
    frost.appendChild(cover);
    stack.appendChild(frost);

    if (step === "berries") {
      const NEEDED = 3;
      const SLOTS = [
        [34, 26],
        [68, 20],
        [100, 28]
      ];
      let placed = 0;
      let advanced = false;

      const tray = document.createElement("div");
      tray.className = "cafe-berry-tray";
      tray.setAttribute("aria-label", `${NEEDED} strawberries to place`);

      const syncBerryHint = () => {
        const left = NEEDED - placed;
        const remaining = tray.querySelectorAll(".cafe-berry:not(.is-placed)").length;
        // Counter always reflects interactive berries still available
        const shown = Math.max(left, remaining);
        if (left <= 0) setHint("Strawberries placed!");
        else if (shown === 1) setHint("1 strawberry left");
        else setHint(`${shown} strawberries left`);
      };

      const placeBerry = (berry, clientX, clientY) => {
        if (berry.dataset.placed === "1" || advanced) return false;
        berry.dataset.placed = "1";
        berry.classList.add("is-placed");
        berry.classList.remove("is-dragging");
        berry.style.pointerEvents = "none";
        berry.setAttribute("aria-disabled", "true");
        berry.disabled = true;

        const sr = stack.getBoundingClientRect();
        let x;
        let y;
        if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
          x = clientX - sr.left - 11;
          y = clientY - sr.top - 11;
        } else {
          const slot = SLOTS[placed] || [68, 28];
          x = slot[0];
          y = slot[1];
        }
        x = clamp(x, 6, Math.max(6, sr.width - 28));
        y = clamp(y, 6, Math.max(6, sr.height - 28));
        berry.style.position = "absolute";
        berry.style.left = `${x}px`;
        berry.style.top = `${y}px`;
        berry.style.right = "auto";
        berry.style.bottom = "auto";
        berry.style.zIndex = "4";
        stack.appendChild(berry);

        placed += 1;
        syncBerryHint();
        sfx("claw");
        if (placed >= NEEDED && !advanced) {
          advanced = true;
          window.setTimeout(() => advanceStep(0.1), reduceMotion ? 0 : 280);
        }
        return true;
      };

      const returnToTray = (berry) => {
        berry.classList.remove("is-dragging");
        berry.style.position = "";
        berry.style.left = "";
        berry.style.top = "";
        berry.style.zIndex = "";
        tray.appendChild(berry);
        syncBerryHint();
      };

      for (let i = 0; i < NEEDED; i += 1) {
        const berry = document.createElement("button");
        berry.type = "button";
        berry.className = "cafe-berry";
        berry.dataset.placed = "0";
        berry.setAttribute("aria-label", `Strawberry ${i + 1} of ${NEEDED}`);

        let dragging = false;
        let moved = false;
        let startX = 0;
        let startY = 0;

        berry.addEventListener("pointerdown", (e) => {
          if (berry.dataset.placed === "1" || advanced) return;
          e.preventDefault();
          dragging = true;
          moved = false;
          startX = e.clientX;
          startY = e.clientY;
          berry.classList.add("is-dragging");
          berry.setPointerCapture?.(e.pointerId);
          // Lift onto the board so absolute coords match the drag math
          const br = els.board.getBoundingClientRect();
          const r = berry.getBoundingClientRect();
          berry.style.position = "absolute";
          berry.style.left = `${r.left - br.left}px`;
          berry.style.top = `${r.top - br.top}px`;
          berry.style.zIndex = "8";
          els.board.appendChild(berry);
        });

        berry.addEventListener("pointermove", (e) => {
          if (!dragging || berry.dataset.placed === "1") return;
          if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 8) moved = true;
          const br = els.board.getBoundingClientRect();
          berry.style.left = `${e.clientX - br.left - 11}px`;
          berry.style.top = `${e.clientY - br.top - 11}px`;
        });

        const endPointer = (e) => {
          if (!dragging) return;
          dragging = false;
          if (berry.dataset.placed === "1") return;

          const target = frost.getBoundingClientRect();
          const overCake =
            e.clientX >= target.left &&
            e.clientX <= target.right &&
            e.clientY >= target.top &&
            e.clientY <= target.bottom;

          if (moved) {
            if (overCake) placeBerry(berry, e.clientX, e.clientY);
            else returnToTray(berry);
            return;
          }
          // Tap / click-to-place (no meaningful drag)
          placeBerry(berry, null, null);
        };

        berry.addEventListener("pointerup", endPointer);
        berry.addEventListener("pointercancel", (e) => {
          if (!dragging) return;
          dragging = false;
          if (berry.dataset.placed !== "1") returnToTray(berry);
        });

        tray.appendChild(berry);
      }

      els.tools.appendChild(tray);
      syncBerryHint();
      return;
    }

    if (step === "toppings") {
      setHint("Tap the cake to sprinkle, or finish.");
      let dots = 0;
      stack.addEventListener("click", (e) => {
        const r = stack.getBoundingClientRect();
        const dot = document.createElement("span");
        dot.className = "cafe-topping-dot";
        dot.style.left = `${e.clientX - r.left}px`;
        dot.style.top = `${e.clientY - r.top}px`;
        dot.style.background = rand(["#f5b8c6", "#ffe56b", "#a8d8f0", "#fff"]);
        stack.appendChild(dot);
        dots += 1;
        if (dots >= 8) setHint("Looking festive! Tap Finish when ready.");
      });
      const done = document.createElement("button");
      done.type = "button";
      done.className = "cafe-tool cafe-btn-primary";
      done.textContent = "Finish cake";
      done.addEventListener("click", () => {
        advanceStep(dots >= 5 ? 0.1 : 0.04);
      });
      els.tools.appendChild(done);
    }
  }

  /* ========== SESSION ========== */
  function openCafe() {
    state.open = true;
    els.sessionBtn.textContent = "Close café";
    arriveCustomer();
  }

  function closeCafe() {
    state.open = false;
    state.phase = "idle";
    state.customer = null;
    state.recipe = null;
    state.dishReady = false;
    resetCustomerVisual();
    clearDish();
    show(els.idle, true);
    show(els.cook, false);
    show(els.accept, false);
    show(els.serve, false);
    show(els.next, false);
    setRestartVisible(false);
    els.sessionBtn.textContent = "Open café";
    setStatus("Café closed. Come back anytime, chef.");
  }

  els.sessionBtn?.addEventListener("click", () => {
    if (state.open) closeCafe();
    else openCafe();
  });

  els.accept?.addEventListener("click", () => {
    if (state.phase !== "order") return;
    startCooking();
  });

  els.serve?.addEventListener("click", () => serveDish());

  els.next?.addEventListener("click", () => {
    if (!state.open) return;
    arriveCustomer();
  });

  els.restart?.addEventListener("click", () => restartRecipe());

  renderHud();
  resetCustomerVisual();
  setRestartVisible(false);
  window.CafePhase1 = { ready: true };
})();
