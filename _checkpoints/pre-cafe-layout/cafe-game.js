/* —— Nate's Birthday Café · Restaurant sim (Cozy Mode) ——
   Isolated from park / passport / arcade. Cooking mini-games preserved. */
(function () {
  const CAFE_KEY = "nates-birthday-cafe-v1";
  const CAFE_SIM_KEY = "nates-birthday-cafe-sim-v1";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const WAIT_SLOTS = 3;
  const TABLE_COUNT = 4;
  const MAX_ACTIVE = WAIT_SLOTS + TABLE_COUNT;

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

  function loadSim() {
    try {
      const raw = localStorage.getItem(CAFE_SIM_KEY);
      if (!raw) return { version: 1, tips: 0, completedOrders: 0, satisfactionSum: 0, satisfactionCount: 0, streak: 0, bestStreak: 0 };
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) {
        return { version: 1, tips: 0, completedOrders: 0, satisfactionSum: 0, satisfactionCount: 0, streak: 0, bestStreak: 0 };
      }
      return {
        version: 1,
        tips: data.tips || 0,
        completedOrders: data.completedOrders || 0,
        satisfactionSum: data.satisfactionSum || 0,
        satisfactionCount: data.satisfactionCount || 0,
        streak: data.streak || 0,
        bestStreak: data.bestStreak || 0
      };
    } catch {
      return { version: 1, tips: 0, completedOrders: 0, satisfactionSum: 0, satisfactionCount: 0, streak: 0, bestStreak: 0 };
    }
  }

  function saveSim(data) {
    try {
      localStorage.setItem(CAFE_SIM_KEY, JSON.stringify(data));
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

  const POS = {
    enter: { x: 6, y: 82 },
    exit: { x: 6, y: 14 },
    wait: [
      { x: 22, y: 78 },
      { x: 30, y: 78 },
      { x: 38, y: 78 }
    ],
    tables: [
      { x: 58, y: 28, seat: { x: 52, y: 34 } },
      { x: 82, y: 28, seat: { x: 76, y: 34 } },
      { x: 58, y: 58, seat: { x: 52, y: 64 } },
      { x: 82, y: 58, seat: { x: 76, y: 64 } }
    ],
    aisle: { x: 46, y: 48 },
    servePick: { x: 88, y: 86 }
  };

  const TABLE_STATUS = {
    available: "Available",
    waitingOrder: "Waiting to Order",
    cooking: "Cooking",
    ready: "Ready to Serve",
    eating: "Eating",
    needsCleaning: "Needs Cleaning"
  };

  const root = document.querySelector("#cafe-game");
  if (!root) return;

  const els = {
    coins: root.querySelector("#cafe-coins"),
    tips: root.querySelector("#cafe-tips"),
    stars: root.querySelector("#cafe-stars"),
    served: root.querySelector("#cafe-served"),
    streak: root.querySelector("#cafe-streak"),
    sessionBtn: root.querySelector("#cafe-session-btn"),
    idle: root.querySelector("#cafe-idle"),
    playfield: root.querySelector("#cafe-playfield"),
    floor: root.querySelector("#cafe-floor"),
    dining: root.querySelector("#cafe-dining"),
    waitSlots: root.querySelector("#cafe-wait-slots"),
    actors: root.querySelector("#cafe-actors"),
    ticketRail: root.querySelector("#cafe-ticket-rail"),
    servingTray: root.querySelector("#cafe-serving-tray"),
    binPile: root.querySelector("#cafe-bin-pile"),
    kitchen: root.querySelector("#cafe-kitchen"),
    doorEnter: root.querySelector("#cafe-door-enter"),
    doorExit: root.querySelector("#cafe-door-exit"),
    cook: root.querySelector("#cafe-cook"),
    cookOrder: root.querySelector("#cafe-cook-order"),
    cookBack: root.querySelector("#cafe-cook-back"),
    stepLabel: root.querySelector("#cafe-step-label"),
    stepDots: root.querySelector("#cafe-step-dots"),
    board: root.querySelector("#cafe-board"),
    tools: root.querySelector("#cafe-tools"),
    hint: root.querySelector("#cafe-hint"),
    status: root.querySelector("#cafe-status"),
    restart: root.querySelector("#cafe-restart"),
    cancelSelect: root.querySelector("#cafe-cancel-select")
  };

  let persist = loadCafe();
  let sim = loadSim();
  let uidSeq = 1;
  let orderSeq = 1;
  const timers = new Set();
  const customers = new Map();
  const orders = new Map();
  const tables = [];
  const waitOccupancy = [null, null, null];

  const state = {
    open: false,
    view: "idle", // idle | floor | cooking
    selectedCustomerId: null,
    selectedOrderId: null,
    heldDishOrderId: null,
    activeOrderId: null,
    // cooking session fields (preserved mini-game API)
    phase: "idle",
    customer: null,
    recipe: null,
    stepIndex: 0,
    quality: 1,
    mistakes: 0,
    dishReady: false,
    progress: {},
    awarding: false,
    spawnArmed: false
  };

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

  function show(el, on) {
    if (!el) return;
    el.hidden = !on;
  }

  function setStatus(text) {
    if (els.status) els.status.textContent = text;
  }

  function setHint(text) {
    if (els.hint) els.hint.textContent = text;
  }

  function setRestartVisible(on) {
    show(els.restart, on);
  }

  function trackTimeout(fn, ms) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  }

  function clearAllTimers() {
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
  }

  function renderHud() {
    if (els.coins) els.coins.textContent = String(persist.coins);
    if (els.tips) els.tips.textContent = String(sim.tips);
    if (els.stars) els.stars.textContent = String(persist.stars);
    if (els.served) els.served.textContent = String(persist.served);
    if (els.streak) els.streak.textContent = String(sim.streak);
  }

  function cafeFull() {
    const waiting = [...customers.values()].filter((c) => c.state === "waiting" || c.state === "arriving").length;
    const seatedish = [...customers.values()].filter((c) =>
      ["seated", "ordering", "waitingFood", "eating", "paying"].includes(c.state)
    ).length;
    const freeWait = waitOccupancy.filter((v) => !v).length;
    const freeTables = tables.filter((t) => t.status === "available").length;
    if (freeWait === 0 && freeTables === 0) return true;
    if (waiting + seatedish >= MAX_ACTIVE) return true;
    return false;
  }

  function updateCancelBtn() {
    const on = !!(state.selectedCustomerId || state.selectedOrderId || state.heldDishOrderId);
    show(els.cancelSelect, state.open && state.view === "floor" && on);
  }

  function clearSelection() {
    state.selectedCustomerId = null;
    state.selectedOrderId = null;
    // keep held dish unless cancelled explicitly
    root.querySelectorAll(".is-selected").forEach((el) => el.classList.remove("is-selected"));
    updateCancelBtn();
  }

  function cancelAllSelection() {
    state.heldDishOrderId = null;
    clearSelection();
    renderServing();
    setStatus("Selection cleared.");
  }

  /* —— Floor furniture —— */
  function buildFloorFurniture() {
    tables.length = 0;
    if (els.dining) els.dining.innerHTML = "";
    if (els.waitSlots) els.waitSlots.innerHTML = "";
    if (!els.dining) return;

    for (let i = 0; i < TABLE_COUNT; i += 1) {
      const table = {
        id: i + 1,
        status: "available",
        customerId: null,
        orderId: null,
        dirty: false,
        el: null
      };
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cafe-table";
      btn.dataset.tableId = String(table.id);
      btn.dataset.status = "available";
      btn.style.left = `${POS.tables[i].x}%`;
      btn.style.top = `${POS.tables[i].y}%`;
      btn.innerHTML = `
        <span class="cafe-chair cafe-chair-l" aria-hidden="true"></span>
        <span class="cafe-chair cafe-chair-r" aria-hidden="true"></span>
        <span class="cafe-table-top" aria-hidden="true"></span>
        <span class="cafe-table-plate" hidden aria-hidden="true"></span>
        <span class="cafe-table-food" hidden aria-hidden="true"></span>
        <span class="cafe-table-alert" hidden></span>
        <span class="cafe-table-status">${TABLE_STATUS.available}</span>
      `;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        onTableClick(table.id);
      });
      table.el = btn;
      tables.push(table);
      els.dining.appendChild(btn);
    }

    if (els.waitSlots) {
      for (let i = 0; i < WAIT_SLOTS; i += 1) {
        const slot = document.createElement("div");
        slot.className = "cafe-wait-slot";
        slot.dataset.slot = String(i);
        slot.style.left = `${18 + i * 32}%`;
        slot.style.top = "68%";
        els.waitSlots.appendChild(slot);
      }
    }
  }

  function setTableStatus(table, status) {
    table.status = status;
    table.dirty = status === "needsCleaning";
    if (!table.el) return;
    table.el.dataset.status = status;
    const label = table.el.querySelector(".cafe-table-status");
    if (label) label.textContent = TABLE_STATUS[status] || status;
    const alert = table.el.querySelector(".cafe-table-alert");
    const needsAttention = ["waitingOrder", "ready", "needsCleaning"].includes(status);
    if (alert) {
      alert.hidden = !needsAttention;
      alert.textContent = status === "waitingOrder" ? "!" : status === "ready" ? "♪" : "✦";
    }
    const plate = table.el.querySelector(".cafe-table-plate");
    const food = table.el.querySelector(".cafe-table-food");
    if (plate) plate.hidden = !(status === "eating" || status === "needsCleaning" || status === "ready");
    if (food) {
      const order = table.orderId ? orders.get(table.orderId) : null;
      if (status === "eating" && order) {
        food.hidden = false;
        food.innerHTML = `<img src="${RECIPES[order.recipeId].icon}" alt="">`;
        food.style.opacity = "1";
      } else if (status === "needsCleaning") {
        food.hidden = true;
        if (plate) plate.hidden = false;
      } else if (status !== "ready") {
        food.hidden = true;
      }
    }
  }

  /* —— Actors / movement —— */
  function placeActor(cust, x, y, instant) {
    cust.x = x;
    cust.y = y;
    if (!cust.el) return;
    if (instant || reduceMotion) {
      cust.el.style.transition = "none";
    } else {
      cust.el.style.transition = "left 0.85s linear, top 0.85s linear";
    }
    cust.el.style.left = `${x}%`;
    cust.el.style.top = `${y}%`;
    // force reflow then restore transition for next move
    if (instant || reduceMotion) {
      void cust.el.offsetWidth;
      cust.el.style.transition = reduceMotion ? "none" : "left 0.85s linear, top 0.85s linear";
    }
  }

  function walkTo(cust, x, y) {
    return new Promise((resolve) => {
      if (!cust.el || !state.open) {
        placeActor(cust, x, y, true);
        resolve();
        return;
      }
      if (reduceMotion) {
        placeActor(cust, x, y, true);
        resolve();
        return;
      }
      const done = () => {
        cust.el.removeEventListener("transitionend", onEnd);
        resolve();
      };
      const onEnd = (e) => {
        if (e.propertyName === "left" || e.propertyName === "top") done();
      };
      cust.el.addEventListener("transitionend", onEnd);
      placeActor(cust, x, y, false);
      trackTimeout(done, 950);
    });
  }

  function setActorBubble(cust, text, showPreview, recipe) {
    if (!cust.el) return;
    const bubble = cust.el.querySelector(".cafe-actor-bubble");
    if (!bubble) return;
    if (!text) {
      bubble.hidden = true;
      bubble.innerHTML = "";
      return;
    }
    let html = `<p>${text}</p>`;
    if (showPreview && recipe) {
      html += `<div class="cafe-order-preview"><img src="${recipe.icon}" alt=""><span>${recipe.name}</span></div>`;
    }
    bubble.innerHTML = html;
    bubble.hidden = false;
  }

  function setActorMood(cust, mood) {
    if (!cust.el) return;
    cust.el.classList.remove("is-happy", "is-sad", "is-chewing", "is-selected", "is-walking");
    if (mood) cust.el.classList.add(mood);
  }

  function createCustomerActor(type, groupId) {
    const uid = `c${uidSeq++}`;
    const cust = {
      uid,
      typeId: type.id,
      name: type.name,
      img: type.img,
      likes: type.likes,
      orderLines: type.orderLines,
      happy: type.happy,
      sad: type.sad,
      state: "arriving",
      tableId: null,
      orderId: null,
      waitSlot: null,
      groupId: groupId || null,
      x: POS.enter.x,
      y: POS.enter.y,
      el: null,
      busy: false
    };
    const el = document.createElement("button");
    el.type = "button";
    el.className = "cafe-actor is-walking";
    el.dataset.uid = uid;
    el.setAttribute("aria-label", `${type.name}`);
    el.innerHTML = `
      <img src="${type.img}" alt="">
      <span class="cafe-actor-hearts" aria-hidden="true"></span>
      <span class="cafe-actor-bubble" hidden></span>
      <span class="cafe-actor-alert" hidden>!</span>
    `;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onCustomerClick(uid);
    });
    cust.el = el;
    els.actors.appendChild(el);
    placeActor(cust, POS.enter.x, POS.enter.y, true);
    customers.set(uid, cust);
    return cust;
  }

  function removeCustomer(uid) {
    const cust = customers.get(uid);
    if (!cust) return;
    if (cust.waitSlot != null) waitOccupancy[cust.waitSlot] = null;
    if (cust.el) cust.el.remove();
    customers.delete(uid);
  }

  async function seatPath(cust, table) {
    const tpos = POS.tables[table.id - 1];
    await walkTo(cust, POS.aisle.x, cust.y);
    await walkTo(cust, POS.aisle.x, tpos.seat.y);
    await walkTo(cust, tpos.seat.x, tpos.seat.y);
    cust.el?.classList.remove("is-walking");
    cust.el?.classList.add("is-seated");
  }

  async function exitPath(cust) {
    cust.el?.classList.add("is-walking");
    cust.el?.classList.remove("is-seated");
    await walkTo(cust, POS.aisle.x, cust.y);
    await walkTo(cust, POS.aisle.x, POS.exit.y);
    els.doorExit?.classList.add("is-open");
    await walkTo(cust, POS.exit.x, POS.exit.y);
    trackTimeout(() => els.doorExit?.classList.remove("is-open"), 400);
  }

  /* —— Spawning —— */
  function freeWaitSlot() {
    for (let i = 0; i < WAIT_SLOTS; i += 1) {
      if (!waitOccupancy[i]) return i;
    }
    return -1;
  }

  function scheduleSpawn() {
    if (!state.open || !state.spawnArmed) return;
    const delay = reduceMotion ? 1200 : 7000 + Math.random() * 9000;
    trackTimeout(() => {
      if (!state.open) return;
      trySpawn();
      scheduleSpawn();
    }, delay);
  }

  async function trySpawn() {
    if (!state.open || cafeFull()) {
      if (state.open && cafeFull()) setStatus("Café is full — seat guests or clear tables.");
      return;
    }
    const group = Math.random() < 0.28 ? 2 : 1;
    const groupId = `g${uidSeq++}`;
    for (let i = 0; i < group; i += 1) {
      if (cafeFull()) break;
      const slot = freeWaitSlot();
      if (slot < 0) break;
      const type = rand(CUSTOMERS);
      const cust = createCustomerActor(type, group > 1 ? groupId : null);
      waitOccupancy[slot] = cust.uid;
      cust.waitSlot = slot;
      els.doorEnter?.classList.add("is-open");
      trackTimeout(() => els.doorEnter?.classList.remove("is-open"), 500);
      sfx("claw");
      setStatus(`${cust.name} arrived!`);
      cust.busy = true;
      await walkTo(cust, POS.wait[slot].x, POS.wait[slot].y);
      if (!customers.has(cust.uid)) return;
      cust.state = "waiting";
      cust.busy = false;
      cust.el?.classList.remove("is-walking");
      cust.el?.querySelector(".cafe-actor-alert").removeAttribute("hidden");
      setActorBubble(cust, "…", false);
      // stagger group members
      if (i < group - 1) await new Promise((r) => trackTimeout(r, reduceMotion ? 100 : 500));
    }
    refreshHints();
  }

  function refreshHints() {
    root.querySelectorAll(".cafe-actor").forEach((el) => {
      el.classList.toggle("is-selected", el.dataset.uid === state.selectedCustomerId);
    });
    root.querySelectorAll(".cafe-ticket").forEach((el) => {
      el.classList.toggle("is-selected", el.dataset.orderId === state.selectedOrderId);
    });
    root.querySelectorAll(".cafe-ready-dish").forEach((el) => {
      el.classList.toggle("is-selected", el.dataset.orderId === state.heldDishOrderId);
    });
    updateCancelBtn();
  }

  /* —— Clicks —— */
  function onCustomerClick(uid) {
    if (!state.open || state.view !== "floor") return;
    const cust = customers.get(uid);
    if (!cust || cust.busy) return;

    if (state.heldDishOrderId) {
      // delivering?
      if (cust.tableId && cust.orderId === state.heldDishOrderId && cust.state === "waitingFood") {
        deliverToTable(cust.tableId);
        return;
      }
      setStatus("Deliver the dish to the matching table.");
      return;
    }

    if (cust.state === "waiting") {
      state.selectedCustomerId = uid;
      state.selectedOrderId = null;
      refreshHints();
      setStatus(`Seat ${cust.name} — tap an available table.`);
      return;
    }

    if (cust.state === "ordering") {
      takeOrder(cust);
      return;
    }

    if (cust.state === "waitingFood") {
      setStatus(`${cust.name} is waiting for their food.`);
      return;
    }

    if (cust.state === "eating") {
      setStatus(`${cust.name} is happily eating.`);
      return;
    }
  }

  async function onTableClick(tableId) {
    if (!state.open || state.view !== "floor") return;
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    if (state.heldDishOrderId) {
      deliverToTable(tableId);
      return;
    }

    if (state.selectedCustomerId) {
      const cust = customers.get(state.selectedCustomerId);
      if (!cust || cust.state !== "waiting") {
        clearSelection();
        return;
      }
      if (table.status !== "available") {
        setStatus("That table is not available.");
        return;
      }
      await seatCustomer(cust, table);
      return;
    }

    if (table.status === "needsCleaning") {
      cleanTable(table);
      return;
    }

    if (table.status === "waitingOrder" && table.customerId) {
      const cust = customers.get(table.customerId);
      if (cust && cust.state === "ordering") takeOrder(cust);
      return;
    }

    if (table.status === "ready" && table.orderId) {
      // shortcut: if dish is ready on counter, pick implied
      const order = orders.get(table.orderId);
      if (order && order.status === "ready") {
        if (!state.heldDishOrderId) state.heldDishOrderId = order.id;
        deliverToTable(tableId);
      }
      return;
    }

    setStatus(`Table ${tableId}: ${TABLE_STATUS[table.status]}`);
  }

  async function seatCustomer(cust, table) {
    if (cust.busy || table.status !== "available") return;
    cust.busy = true;
    if (cust.waitSlot != null) {
      waitOccupancy[cust.waitSlot] = null;
      cust.waitSlot = null;
    }
    clearSelection();
    cust.el?.querySelector(".cafe-actor-alert")?.setAttribute("hidden", "");
    setActorBubble(cust, "", false);
    cust.state = "seated";
    cust.tableId = table.id;
    table.customerId = cust.uid;
    setTableStatus(table, "waitingOrder");
    cust.el?.classList.add("is-walking");
    setStatus(`Seating ${cust.name} at table ${table.id}…`);
    await seatPath(cust, table);
    if (!customers.has(cust.uid)) return;
    cust.busy = false;
    // browse then ready to order
    setActorBubble(cust, "hmm…", false);
    trackTimeout(() => {
      if (!customers.has(cust.uid)) return;
      if (cust.state !== "seated") return;
      cust.state = "ordering";
      setActorBubble(cust, "Ready!", false);
      cust.el?.querySelector(".cafe-actor-alert")?.removeAttribute("hidden");
      setStatus(`${cust.name} at table ${table.id} is ready to order.`);
      sfx("claw");
    }, reduceMotion ? 400 : 2200 + Math.random() * 1600);
  }

  function takeOrder(cust) {
    if (cust.state !== "ordering" || !cust.tableId) return;
    const table = tables.find((t) => t.id === cust.tableId);
    if (!table) return;
    const recipeId = rand(cust.likes);
    const recipe = RECIPES[recipeId];
    const orderId = `o${orderSeq++}`;
    const order = {
      id: orderId,
      tableId: table.id,
      customerId: cust.uid,
      recipeId,
      status: "pending",
      quality: 1,
      mistakes: 0,
      stars: 0,
      rewarded: false
    };
    orders.set(orderId, order);
    cust.orderId = orderId;
    cust.state = "waitingFood";
    table.orderId = orderId;
    setTableStatus(table, "cooking");
    cust.el?.querySelector(".cafe-actor-alert")?.setAttribute("hidden", "");
    setActorBubble(cust, orderLine(cust, recipe), true, recipe);
    trackTimeout(() => setActorBubble(cust, "…♡", false), reduceMotion ? 800 : 3200);
    renderTickets();
    setStatus(`Order in! Table ${table.id} — ${recipe.name}. Tap the ticket to cook.`);
    sfx("claw");
  }

  function renderTickets() {
    if (!els.ticketRail) return;
    els.ticketRail.innerHTML = "";
    const list = [...orders.values()].filter((o) => ["pending", "preparing", "ready"].includes(o.status));
    list.forEach((order) => {
      const recipe = RECIPES[order.recipeId];
      const cust = customers.get(order.customerId);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `cafe-ticket is-${order.status}`;
      btn.dataset.orderId = order.id;
      btn.innerHTML = `
        <span class="cafe-ticket-table">T${order.tableId}</span>
        <span class="cafe-ticket-body">
          <strong>${cust?.name || "Guest"}</strong>
          <em>${recipe.name}</em>
          <small>${order.status}</small>
        </span>
        <img src="${recipe.icon}" alt="">
      `;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        onTicketClick(order.id);
      });
      if (order.id === state.selectedOrderId) btn.classList.add("is-selected");
      els.ticketRail.appendChild(btn);
    });
  }

  function onTicketClick(orderId) {
    if (!state.open) return;
    const order = orders.get(orderId);
    if (!order) return;
    if (order.status === "ready") {
      state.heldDishOrderId = orderId;
      state.selectedOrderId = orderId;
      refreshHints();
      renderServing();
      setStatus(`Holding ${RECIPES[order.recipeId].name} — deliver to table ${order.tableId}.`);
      return;
    }
    if (order.status === "pending" || order.status === "preparing") {
      startCookingForOrder(orderId);
    }
  }

  function renderServing() {
    if (!els.servingTray) return;
    els.servingTray.innerHTML = "";
    [...orders.values()]
      .filter((o) => o.status === "ready")
      .forEach((order) => {
        const recipe = RECIPES[order.recipeId];
        const dish = document.createElement("button");
        dish.type = "button";
        dish.className = "cafe-ready-dish";
        dish.dataset.orderId = order.id;
        dish.innerHTML = `<img src="${recipe.icon}" alt="${recipe.name}"><span>T${order.tableId}</span>`;
        if (order.id === state.heldDishOrderId) dish.classList.add("is-selected");
        dish.addEventListener("click", (e) => {
          e.stopPropagation();
          state.heldDishOrderId = order.id;
          refreshHints();
          renderServing();
          setStatus(`Holding ${recipe.name} — tap table ${order.tableId}.`);
        });
        els.servingTray.appendChild(dish);
      });
  }

  function deliverToTable(tableId) {
    const orderId = state.heldDishOrderId;
    if (!orderId) {
      setStatus("Pick up a finished dish first.");
      return;
    }
    const order = orders.get(orderId);
    const table = tables.find((t) => t.id === tableId);
    if (!order || !table) return;
    if (order.tableId !== tableId) {
      setStatus(`Wrong table — this is for table ${order.tableId}.`);
      sfx("claw");
      return;
    }
    if (order.status !== "ready") return;
    const cust = customers.get(order.customerId);
    if (!cust || cust.state !== "waitingFood") return;

    order.status = "served";
    state.heldDishOrderId = null;
    clearSelection();
    setTableStatus(table, "eating");
    cust.state = "eating";
    setActorMood(cust, "is-chewing");
    setActorBubble(cust, rand(cust.happy), false);
    const hearts = cust.el?.querySelector(".cafe-actor-hearts");
    if (hearts) hearts.textContent = "♡";
    renderTickets();
    renderServing();
    setStatus(`${cust.name} is eating — yum!`);
    sfx("claw");
    animateEating(cust, table, order);
  }

  function animateEating(cust, table, order) {
    const food = table.el?.querySelector(".cafe-table-food");
    const steps = reduceMotion ? 2 : 4;
    let step = 0;
    const tick = () => {
      if (!customers.has(cust.uid)) return;
      step += 1;
      if (food) food.style.opacity = String(Math.max(0.15, 1 - step / steps));
      if (step < steps) {
        trackTimeout(tick, reduceMotion ? 350 : 900);
        return;
      }
      finishMeal(cust, table, order);
    };
    trackTimeout(tick, reduceMotion ? 400 : 1100);
  }

  function finishMeal(cust, table, order) {
    if (order.rewarded) return;
    order.rewarded = true;
    order.status = "completed";
    cust.state = "paying";
    setActorMood(cust, "is-happy");
    const stars = order.stars || 1;
    const happy = stars >= 2;
    const tip = happy ? 4 + stars * 2 : 1;
    const coins = stars * 12 + Math.round((order.quality || 1) * 8) + tip;
    persist.coins += coins;
    persist.stars += stars;
    persist.served += 1;
    persist.highStars = Math.max(persist.highStars, stars);
    sim.tips += tip;
    sim.completedOrders += 1;
    sim.satisfactionSum += stars;
    sim.satisfactionCount += 1;
    if (happy) {
      sim.streak += 1;
      sim.bestStreak = Math.max(sim.bestStreak, sim.streak);
    } else {
      sim.streak = 0;
    }
    saveCafe(persist);
    saveSim(sim);
    renderHud();

    // coin pop
    spawnCoinPop(table.el, coins);
    setActorBubble(cust, happy ? rand(cust.happy) : rand(cust.sad), false);
    setStatus(`${cust.name} paid +${coins} (tip +${tip}) · ${"★".repeat(stars)}`);
    sfx("claw");

    trackTimeout(async () => {
      if (!customers.has(cust.uid)) return;
      cust.state = "leaving";
      table.customerId = null;
      table.orderId = null;
      setTableStatus(table, "needsCleaning");
      setActorBubble(cust, "bye!", false);
      cust.busy = true;
      await exitPath(cust);
      removeCustomer(cust.uid);
      orders.delete(order.id);
      renderTickets();
      setStatus(`Table ${table.id} needs cleaning.`);
    }, reduceMotion ? 400 : 1400);
  }

  function spawnCoinPop(anchor, amount) {
    if (!anchor || !els.floor) return;
    const pop = document.createElement("span");
    pop.className = "cafe-coin-pop";
    pop.textContent = `+${amount}`;
    const r = anchor.getBoundingClientRect();
    const fr = els.floor.getBoundingClientRect();
    pop.style.left = `${r.left - fr.left + r.width / 2}px`;
    pop.style.top = `${r.top - fr.top}px`;
    els.floor.appendChild(pop);
    trackTimeout(() => pop.remove(), 1200);
  }

  function cleanTable(table) {
    if (table.status !== "needsCleaning") return;
    table.el?.classList.add("is-cleaning");
    // sparkles
    const spark = document.createElement("span");
    spark.className = "cafe-sparkle";
    spark.textContent = "✦ ✦ ✦";
    table.el?.appendChild(spark);
    if (els.binPile) {
      const dish = document.createElement("span");
      dish.className = "cafe-bin-dish";
      els.binPile.appendChild(dish);
      trackTimeout(() => dish.remove(), 4000);
    }
    sfx("claw");
    trackTimeout(() => {
      spark.remove();
      table.el?.classList.remove("is-cleaning");
      table.customerId = null;
      table.orderId = null;
      setTableStatus(table, "available");
      setStatus(`Table ${table.id} is sparkling clean!`);
    }, reduceMotion ? 200 : 650);
  }

  /* —— Cooking integration —— */
  function startCookingForOrder(orderId) {
    const order = orders.get(orderId);
    if (!order || (order.status !== "pending" && order.status !== "preparing")) return;
    if (state.view === "cooking" && state.activeOrderId && state.activeOrderId !== orderId) {
      setStatus("Finish or leave the current recipe first.");
      return;
    }
    const recipe = RECIPES[order.recipeId];
    const cust = customers.get(order.customerId);
    order.status = "preparing";
    state.activeOrderId = orderId;
    state.view = "cooking";
    state.phase = "cooking";
    state.customer = cust;
    state.recipe = recipe;
    state.stepIndex = 0;
    state.quality = 1;
    state.mistakes = 0;
    state.progress = {};
    state.dishReady = false;
    show(els.playfield, false);
    show(els.floor, false);
    show(els.idle, false);
    show(els.cook, true);
    setRestartVisible(true);
    if (els.cookOrder) {
      els.cookOrder.textContent = `Table ${order.tableId} · ${cust?.name || "Guest"} · ${recipe.name}`;
    }
    renderTickets();
    setStatus(`Cooking ${recipe.name} for table ${order.tableId}…`);
    renderStep();
    sfx("claw");
  }

  function returnToFloor(message) {
    state.view = "floor";
    state.phase = "floor";
    state.activeOrderId = null;
    state.recipe = null;
    state.dishReady = false;
    state.progress = {};
    if (els.board) els.board.innerHTML = "";
    if (els.tools) els.tools.innerHTML = "";
    show(els.cook, false);
    setRestartVisible(false);
    show(els.playfield, true);
    show(els.floor, true);
    show(els.idle, false);
    renderTickets();
    renderServing();
    if (message) setStatus(message);
    updateCancelBtn();
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
    if (!state.recipe || state.stepIndex >= state.recipe.steps.length) {
      finishCooking();
      return;
    }
    renderStep();
  }

  function finishCooking() {
    const order = state.activeOrderId ? orders.get(state.activeOrderId) : null;
    if (!order) {
      returnToFloor("Order missing — back on the floor.");
      return;
    }
    // stars from prep quality; rewards granted later at payment
    let stars = 1;
    if (state.quality >= 0.72 && state.mistakes <= 2) stars = 2;
    if (state.quality >= 0.92 && state.mistakes === 0) stars = 3;
    order.quality = state.quality;
    order.mistakes = state.mistakes;
    order.stars = stars;
    order.status = "ready";
    const table = tables.find((t) => t.id === order.tableId);
    if (table) setTableStatus(table, "ready");
    const recipe = RECIPES[order.recipeId];
    returnToFloor(`${recipe.name} ready! Pick it up at Serving and deliver to table ${order.tableId}.`);
    sfx("claw");
  }

  function restartRecipe() {
    if (state.view !== "cooking" || !state.recipe || !state.activeOrderId) return;
    state.stepIndex = 0;
    state.quality = 1;
    state.mistakes = 0;
    state.progress = {};
    state.dishReady = false;
    setRestartVisible(true);
    setStatus(`Restarting ${state.recipe.name} — café progress kept.`);
    renderStep();
    sfx("claw");
  }

  function renderStep() {
    if (!state.recipe) return;
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



  /* —— Session —— */
  function openCafe() {
    buildFloorFurniture();
    state.open = true;
    state.view = "floor";
    state.spawnArmed = true;
    state.selectedCustomerId = null;
    state.selectedOrderId = null;
    state.heldDishOrderId = null;
    state.activeOrderId = null;
    els.sessionBtn.textContent = "Close café";
    show(els.idle, false);
    show(els.cook, false);
    show(els.playfield, true);
    show(els.floor, true);
    setRestartVisible(false);
    tables.forEach((t) => setTableStatus(t, "available"));
    renderTickets();
    renderServing();
    renderHud();
    setStatus("Café open! Guests will arrive — seat them at free tables.");
    scheduleSpawn();
    trackTimeout(() => trySpawn(), reduceMotion ? 200 : 900);
    sfx("claw");
  }

  function closeCafe() {
    state.open = false;
    state.spawnArmed = false;
    state.view = "idle";
    clearAllTimers();
    clearSelection();
    state.heldDishOrderId = null;
    state.activeOrderId = null;
    customers.forEach((c) => c.el?.remove());
    customers.clear();
    orders.clear();
    waitOccupancy.fill(null);
    tables.forEach((t) => {
      t.customerId = null;
      t.orderId = null;
      setTableStatus(t, "available");
    });
    if (els.actors) els.actors.innerHTML = "";
    if (els.ticketRail) els.ticketRail.innerHTML = "";
    if (els.servingTray) els.servingTray.innerHTML = "";
    if (els.binPile) els.binPile.innerHTML = "";
    if (els.board) els.board.innerHTML = "";
    if (els.tools) els.tools.innerHTML = "";
    show(els.cook, false);
    show(els.playfield, false);
    show(els.floor, false);
    show(els.idle, true);
    setRestartVisible(false);
    show(els.cancelSelect, false);
    els.sessionBtn.textContent = "Open café";
    setStatus("Café closed. Progress saved — come back anytime.");
    renderHud();
  }

  els.sessionBtn?.addEventListener("click", () => {
    if (state.open) closeCafe();
    else openCafe();
  });

  els.restart?.addEventListener("click", () => restartRecipe());
  els.cancelSelect?.addEventListener("click", () => cancelAllSelection());
  els.cookBack?.addEventListener("click", () => {
    if (state.view !== "cooking") return;
    const order = state.activeOrderId ? orders.get(state.activeOrderId) : null;
    if (order && order.status === "preparing") order.status = "pending";
    returnToFloor(order ? `Paused ${RECIPES[order.recipeId].name} — ticket still on the rail.` : "Back on the floor.");
    renderTickets();
  });
  els.kitchen?.addEventListener("click", () => {
    if (!state.open || state.view !== "floor") return;
    const next = [...orders.values()].find((o) => o.status === "pending");
    if (next) startCookingForOrder(next.id);
    else setStatus("No pending tickets — take an order first.");
  });

  // Clean up if the snacks room is hidden
  const snacks = document.querySelector("#snacks");
  if (snacks && typeof MutationObserver === "function") {
    const obs = new MutationObserver(() => {
      if (snacks.hasAttribute("hidden") && state.open) {
        // keep progress but pause sim timers when leaving room
        state.spawnArmed = false;
        clearAllTimers();
      } else if (!snacks.hasAttribute("hidden") && state.open && state.view === "floor") {
        state.spawnArmed = true;
        scheduleSpawn();
      }
    });
    obs.observe(snacks, { attributes: true, attributeFilter: ["hidden"] });
  }

  renderHud();
  setRestartVisible(false);
  show(els.cancelSelect, false);
  window.CafePhase1 = { ready: true, sim: true };
  window.CafeSim = {
    ready: true,
    getState: () => ({
      open: state.open,
      view: state.view,
      customers: customers.size,
      orders: orders.size,
      tables: tables.map((t) => ({ id: t.id, status: t.status })),
      persist: { ...persist },
      sim: { ...sim }
    }),
    spawnNow: () => {
      if (state.open) return trySpawn();
      return null;
    },
    /** Test helper: complete the active cook without playing every mini-game step. */
    finishCookNow: () => {
      if (state.view === "cooking" && state.activeOrderId) finishCooking();
    }
  };
})();
