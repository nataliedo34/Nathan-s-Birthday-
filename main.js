const LINE_1 = "Happy Birthday";
const LINE_2 = "Nathan!";
const TOTAL = LINE_1.length + 1 + LINE_2.length;
/* Legacy typed intro constants kept for replay compatibility */

const FORTUNES = [
  "Today's lucky snack is strawberry pudding.",
  "A small good thing is already on its way.",
  "You are very easy to celebrate.",
  "Lucky number: 20. Lucky feeling: cozy.",
  "Someone saved you the best bite.",
  "This year, your softness is a strength.",
  "A friend will be glad you texted.",
  "Nap first. Adventure second. Or the other way around.",
  "You bring the room up a whole degree. In a good way.",
  "Chiikawa believes in you. Quietly. A lot.",
  "Hachiware packed you an extra snack.",
  "Usagi is cheering at a volume that is not allowed indoors.",
  "Wish for something tender. It counts.",
  "Twenty looks bright on you.",
  "The meadow is yours today."
];

const WISHES = [
  "The candles went out. Your wish stayed.",
  "Make a little room. Twenty is going to be sweet.",
  "Wish received. Chiikawa is holding it carefully.",
  "Smoke, sparkle, done. Happy birthday, Nathan."
];

const LINES = {
  chiikawa: ["hello…", "ehehe", "happy birthday", "♡"],
  hachi: ["you got this", "nice", "twenty suits you"],
  usagi: ["YA-HA!", "NATHAN!", "WOO!", "let's go!!"]
};

const intro = document.querySelector("#intro");
const site = document.querySelector("#site");
const typed = document.querySelector("#typed");
const bubble = document.querySelector(".bubble");
const bobber = document.querySelector("#bobber");
const status = document.querySelector("#status");
const hearts = document.querySelector("#hearts");
const skip = document.querySelector("#skip");
const heading = document.querySelector("h1") || document.querySelector(".welcome-copy h1") || document.querySelector(".sr-only");
const introVideo = document.querySelector("#intro-video");
const cinemaMode = Boolean(intro?.classList.contains("cinema"));

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function playIntroVideo() {
  if (!introVideo) return;
  introVideo.muted = true;
  introVideo.volume = 0;
  introVideo.currentTime = 0;
  if (reduceMotion) {
    introVideo.pause();
    return;
  }
  const play = introVideo.play();
  if (play && typeof play.catch === "function") {
    play.catch(() => {});
  }
}

function stopIntroVideo() {
  if (!introVideo) return;
  introVideo.pause();
  document.querySelectorAll(".polaroid video").forEach((v) => v.pause());
}

let runId = 0;
let opened = false;
let typedDone = false;
let lastWish = -1;
const friendIndex = { chiikawa: 0, hachi: 0, usagi: 0 };

function later(token, fn, ms) {
  window.setTimeout(() => {
    if (token === runId) fn();
  }, ms);
}

function renderTyped(count) {
  if (!typed) return;
  typed.replaceChildren();
  if (count <= LINE_1.length) {
    typed.textContent = LINE_1.slice(0, count);
    return;
  }
  typed.append(LINE_1);
  typed.append(document.createElement("br"));
  const second = Math.max(0, count - LINE_1.length - 1);
  typed.append(LINE_2.slice(0, second));
}

function spawnHearts() {
  if (!hearts) return;
  hearts.replaceChildren();
  const colors = ["#e9899c", "#f7b7c3", "#ffe56b", "#e9899c"];
  for (let i = 0; i < 6; i += 1) {
    const heart = document.createElement("span");
    heart.className = "heart";
    heart.textContent = "♡";
    heart.style.left = `${18 + i * 12}%`;
    heart.style.color = colors[i % colors.length];
    heart.style.animationDelay = `${i * 0.08}s`;
    hearts.append(heart);
  }
}

function spawnConfetti() {
  if (reduceMotion) return;
  document.querySelectorAll(".confetti").forEach((piece) => piece.remove());
  const colors = ["#f7b7c3", "#ffe56b", "#b7d4ea", "#fff", "#c5e6a0", "#e9899c"];
  for (let i = 0; i < 42; i += 1) {
    const piece = document.createElement("i");
    piece.className = "confetti";
    const size = 8 + Math.random() * 8;
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * (Math.random() > 0.5 ? 1.3 : 0.7)}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.borderRadius = Math.random() > 0.6 ? "50%" : "2px";
    piece.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    document.body.append(piece);
    window.setTimeout(() => piece.remove(), 4500);
  }
}

function focusHero() {
  if (!heading || typeof heading.focus !== "function") return;
  heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}

function openSite() {
  if (opened) return;
  opened = true;
  runId += 1;
  stopIntroVideo();
  document.documentElement.classList.remove("intro-on");
  document.documentElement.classList.add("rooms-on");
  site?.removeAttribute("aria-hidden");
  intro?.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (typeof showRoom === "function") showRoom("top", { silent: true });
  }, 0);
  if (reduceMotion) {
    intro?.classList.add("is-gone");
    focusHero();
    return;
  }
  intro?.classList.add("leave");
  spawnConfetti();
  window.setTimeout(() => {
    intro?.classList.add("is-gone");
    focusHero();
  }, 1080);
}
window.openSite = openSite;

function showOpenButton(token) {
  if (!status) return;
  const button = document.createElement("button");
  button.className = "btn";
  button.type = "button";
  button.textContent = "Open the party";
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openSite();
  });
  status.replaceChildren(button);
  if (token === runId) button.focus();
}

function finishGreeting(token) {
  typedDone = true;
  bobber?.classList.add("yay");
  spawnHearts();
  if (reduceMotion) {
    showOpenButton(token);
    return;
  }
  if (status) status.textContent = "opening the party";
  later(token, openSite, 1600);
}

function startIntro() {
  const token = ++runId;
  typedDone = false;
  if (cinemaMode && window.__cinema) {
    window.__cinema.start();
    return;
  }
  bobber?.classList.remove("yay");
  bubble?.classList.remove("done");
  status?.replaceChildren();
  hearts?.replaceChildren();
  renderTyped(0);
  playIntroVideo();

  if (reduceMotion) {
    renderTyped(TOTAL);
    bubble?.classList.add("done");
    finishGreeting(token);
    return;
  }

  let count = 0;
  const step = () => {
    if (token !== runId) return;
    count += 1;
    renderTyped(count);
    if (count >= TOTAL) {
      bubble?.classList.add("done");
      later(token, () => finishGreeting(token), 700);
      return;
    }
    const onSpace = count === LINE_1.length + 1;
    const delay = onSpace ? 320 : 64 + Math.random() * 78;
    later(token, step, delay);
  };
  later(token, step, 700);
}

function replay() {
  opened = false;
  document.querySelectorAll(".confetti").forEach((piece) => piece.remove());
  intro?.classList.remove("is-gone", "leave");
  intro?.removeAttribute("aria-hidden");
  site?.setAttribute("aria-hidden", "true");
  document.documentElement.classList.add("intro-on");
  document.documentElement.classList.remove("rooms-on");
  window.scrollTo(0, 0);
  startIntro();
}

skip?.addEventListener("click", (event) => {
  event.stopPropagation();
  openSite();
});

intro?.addEventListener("click", (event) => {
  if (cinemaMode) return;
  if (typedDone && !opened) openSite();
});

document.addEventListener("keydown", (event) => {
  if (opened) return;
  if (event.key === "Escape") openSite();
});

document.querySelector("#replay")?.addEventListener("click", replay);

document.querySelectorAll(".person").forEach((person) => {
  person.addEventListener("click", () => {
    const name = person.dataset.friend;
    const options = LINES[name];
    const say = person.querySelector(".say");
    if (!options || !say) return;
    say.textContent = options[friendIndex[name] % options.length];
    friendIndex[name] += 1;
  });
});

/* Gachapon + claw gameplay moved to arcade-games.js (Phase 1). */

const cake = document.querySelector("#cake");
const blow = document.querySelector("#blow");
const wish = document.querySelector("#wish");
let candlesLit = true;

blow.addEventListener("click", () => {
  candlesLit = !candlesLit;
  cake.classList.toggle("out", !candlesLit);
  if (candlesLit) {
    blow.textContent = "Blow out the candles";
    wish.textContent = "Make another wish, then blow.";
    return;
  }
  if (typeof window.ParkAudio?.sfx === "function") window.ParkAudio.sfx("candle");
  let index = Math.floor(Math.random() * WISHES.length);
  if (index === lastWish) index = (index + 1) % WISHES.length;
  lastWish = index;
  blow.textContent = "Light them again";
  wish.textContent = WISHES[index];
});

/* Music handled by audio.js (ParkAudio). Nav #music is bound there. */

const photoPages = [...document.querySelectorAll(".book-pages img")];
const pageCount = photoPages.length + 2; // cover + photos + The End
const lightbox = document.querySelector("#lightbox");
const lightImg = document.querySelector("#light-img");
const lightCount = document.querySelector("#light-count");
const lightPrev = document.querySelector("#light-prev");
const lightNext = document.querySelector("#light-next");
const book = document.querySelector("#book");
const flipbook = document.querySelector("#flipbook");
const pageFace = document.querySelector("#page-face");
const pageUnder = document.querySelector("#page-under");
const pageFlyer = document.querySelector("#page-flyer");
const pageImg = document.querySelector("#page-img");
const pagePhoto = document.querySelector("#page-photo");
const coverSheet = document.querySelector("#cover-sheet");
const endSheet = document.querySelector("#end-sheet");
const bookPrev = document.querySelector("#book-prev");
const bookNext = document.querySelector("#book-next");
const bookCurl = document.querySelector("#book-curl");
const bookStamp = document.querySelector("#book-stamp");
const bookToStart = document.querySelector("#book-to-start");
const bookToEnd = document.querySelector("#book-to-end");
const bookCount = document.querySelector("#book-count");
const bookDots = document.querySelector("#book-dots");
const bookHint = document.querySelector("#book-hint");
const stampMark = document.querySelector("#stamp-mark");
const heartField = document.querySelector("#heart-field");
const stickerSay = document.querySelector("#sticker-say");
const bookBuddy = document.querySelector("#book-buddy");
const edgePrev = document.querySelector("#edge-prev");
const edgeNext = document.querySelector("#edge-next");
let bookIndex = 0;
let flipping = false;
let lastTap = 0;
let drag = null;
let hintGone = false;

function isCover(index) {
  return index === 0;
}

function isEnd(index) {
  return index === pageCount - 1;
}

function photoAt(index) {
  return photoPages[Math.max(0, Math.min(photoPages.length - 1, index - 1))];
}

function paintOnto(root, index) {
  const cover = root.querySelector(".cover-sheet");
  const end = root.querySelector(".end-sheet");
  const img = root.id === "page-face" ? pageImg : root.querySelector(":scope > img");
  const photoBtn = root.querySelector(".page-photo");
  if (isCover(index)) {
    root.classList.add("is-cover");
    root.classList.remove("is-end");
    if (cover) cover.hidden = false;
    if (end) end.hidden = true;
    if (photoBtn) photoBtn.hidden = true;
    if (img) {
      img.hidden = root.id !== "page-face";
      img.removeAttribute("src");
      img.alt = "";
    }
    return;
  }
  if (isEnd(index)) {
    root.classList.remove("is-cover");
    root.classList.add("is-end");
    if (cover) cover.hidden = true;
    if (end) end.hidden = false;
    if (photoBtn) photoBtn.hidden = true;
    if (img) {
      img.hidden = true;
      img.removeAttribute("src");
      img.alt = "";
    }
    return;
  }
  root.classList.remove("is-cover");
  root.classList.remove("is-end");
  if (cover) cover.hidden = true;
  if (end) end.hidden = true;
  if (photoBtn) photoBtn.hidden = false;
  const page = photoAt(index);
  if (img) {
    img.hidden = false;
    img.src = page.getAttribute("src");
    img.alt = page.alt;
  }
}

function renderDots() {
  bookDots.innerHTML = "";
  for (let index = 0; index < pageCount; index += 1) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "book-dot" + (index === bookIndex ? " is-on" : "");
    const label = isCover(index) ? "Cover" : isEnd(index) ? "The End" : `Page ${index}`;
    dot.setAttribute("aria-label", label);
    if (isCover(index)) dot.classList.add("is-cover-dot");
    if (isEnd(index)) dot.classList.add("is-end-dot");
    dot.addEventListener("click", () => turnTo(index));
    bookDots.appendChild(dot);
  }
}

function renderBook() {
  paintOnto(pageFace, bookIndex);
  paintOnto(pageUnder, Math.min(pageCount - 1, bookIndex + 1));
  pageUnder.style.opacity = bookIndex >= pageCount - 1 ? "0" : "0.72";
  if (isCover(bookIndex)) {
    pagePhoto.removeAttribute("aria-label");
    bookCount.textContent = "Cover";
  } else if (isEnd(bookIndex)) {
    pagePhoto.removeAttribute("aria-label");
    bookCount.textContent = "The End";
  } else {
    pagePhoto.setAttribute("aria-label", `${photoAt(bookIndex).alt} Tap for hearts.`);
    bookCount.textContent = `${bookIndex} of ${photoPages.length}`;
  }
  bookPrev.disabled = bookIndex === 0 || flipping;
  bookNext.disabled = bookIndex >= pageCount - 1 || flipping;
  bookCurl.disabled = bookIndex >= pageCount - 1 || flipping;
  edgePrev.disabled = bookIndex === 0 || flipping;
  edgeNext.disabled = bookIndex >= pageCount - 1 || flipping;
  if (bookToStart) bookToStart.disabled = bookIndex === 0 || flipping;
  if (bookToEnd) bookToEnd.disabled = bookIndex >= pageCount - 1 || flipping;
  stampMark.classList.remove("is-on");
  renderDots();
  if (lightbox.open) {
    if (isCover(bookIndex) || isEnd(bookIndex)) lightbox.close();
    else fillLightbox(bookIndex);
  }
}

function fillLightbox(index) {
  if (isCover(index) || isEnd(index)) return;
  const page = photoAt(index);
  lightImg.src = page.getAttribute("src");
  lightImg.alt = page.alt;
  lightCount.textContent = `${index} of ${photoPages.length}`;
  lightPrev.disabled = index <= 1;
  lightNext.disabled = index >= photoPages.length;
}

function hideHint() {
  if (hintGone) return;
  hintGone = true;
  bookHint.classList.add("is-gone");
}

function hopBuddy() {
  bookBuddy.classList.remove("is-hop");
  void bookBuddy.offsetWidth;
  bookBuddy.classList.add("is-hop");
}

function sparkleFlip() {
  const box = flipbook.getBoundingClientRect();
  const kinds = ["", "is-pink", "is-sky"];
  for (let i = 0; i < 10; i += 1) {
    const spark = document.createElement("span");
    spark.className = "spark " + kinds[i % kinds.length];
    spark.style.left = `${40 + Math.random() * (box.width - 80)}px`;
    spark.style.top = `${60 + Math.random() * (box.height - 140)}px`;
    spark.style.animationDelay = `${i * 0.03}s`;
    flipbook.appendChild(spark);
    window.setTimeout(() => spark.remove(), 800);
  }
}

function turnTo(index, direction = index >= bookIndex ? 1 : -1) {
  if (flipping) return;
  const next = Math.max(0, Math.min(pageCount - 1, index));
  if (next === bookIndex) return;
  hideHint();
  flipping = true;
  pageFace.classList.add("is-still");
  bookPrev.disabled = true;
  bookNext.disabled = true;
  bookCurl.disabled = true;
  edgePrev.disabled = true;
  edgeNext.disabled = true;

  paintOnto(pageFlyer, bookIndex);
  paintOnto(pageFace, next);
  paintOnto(pageUnder, Math.min(pageCount - 1, next + (direction > 0 ? 1 : 0)));
  pageUnder.style.opacity = next >= pageCount - 1 ? "0" : "0.72";

  pageFlyer.hidden = false;
  pageFlyer.style.transform = "";
  pageFlyer.classList.remove("is-flip", "is-flip-back", "is-drag");
  void pageFlyer.offsetWidth;
  pageFlyer.classList.add(direction > 0 ? "is-flip" : "is-flip-back");
  hopBuddy();
  sparkleFlip();

  window.setTimeout(() => {
    bookIndex = next;
    pageFlyer.classList.remove("is-flip", "is-flip-back", "is-drag");
    pageFlyer.style.transform = "";
    pageFlyer.hidden = true;
    flipping = false;
    pageFace.classList.remove("is-still");
    renderBook();
  }, 620);
}

function turnPage(direction) {
  turnTo(bookIndex + direction, direction);
}

function burstHearts(clientX, clientY) {
  const box = heartField.getBoundingClientRect();
  const colors = ["", "is-butter", "is-sky"];
  for (let i = 0; i < 7; i += 1) {
    const heart = document.createElement("span");
    heart.className = "float-heart " + colors[i % colors.length];
    const x = clientX - box.left + (Math.random() * 48 - 24);
    const y = clientY - box.top + (Math.random() * 24 - 8);
    heart.style.left = `${x}px`;
    heart.style.top = `${y}px`;
    heart.style.animationDelay = `${i * 0.04}s`;
    heartField.appendChild(heart);
    window.setTimeout(() => heart.remove(), 1200);
  }
}

function beginDrag(event) {
  if (flipping || drag) return;
  if (event.target.closest(".sticker, .curl, .book-dot, .btn, .page-edge")) return;
  drag = {
    id: event.pointerId,
    startX: event.clientX,
    moved: false,
    fromPhoto: Boolean(event.target.closest(".page-photo")),
    fromCover: Boolean(event.target.closest(".cover-sheet"))
  };
  flipbook.classList.add("is-drag");
  pageFace.classList.add("is-still");
  try { flipbook.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
}

function moveDrag(event) {
  if (!drag || event.pointerId !== drag.id || flipping) return;
  const delta = event.clientX - drag.startX;
  if (Math.abs(delta) < 8) return;
  drag.moved = true;
  hideHint();

  const next = delta < 0 ? bookIndex + 1 : bookIndex - 1;
  if (next < 0 || next >= pageCount) {
    pageFlyer.hidden = true;
    pageFlyer.style.transform = "";
    return;
  }

  if (pageFlyer.hidden) {
    paintOnto(pageFlyer, bookIndex);
    paintOnto(pageFace, next);
    paintOnto(pageUnder, Math.min(pageCount - 1, next + (delta < 0 ? 1 : 0)));
    pageFlyer.hidden = false;
    pageFlyer.classList.add("is-drag");
  }

  const progress = Math.max(-1, Math.min(1, delta / 180));
  const angle = progress * -105;
  pageFlyer.style.transform = `rotateY(${angle}deg)`;
  pageFlyer.style.opacity = String(1 - Math.abs(progress) * 0.35);
}

function endDrag(event) {
  if (!drag || event.pointerId !== drag.id) return;
  const delta = event.clientX - drag.startX;
  const fromPhoto = drag.fromPhoto;
  const fromCover = drag.fromCover;
  const moved = drag.moved;
  const releaseX = event.clientX;
  const releaseY = event.clientY;
  drag = null;
  flipbook.classList.remove("is-drag");

  if (!moved) {
    pageFlyer.hidden = true;
    pageFlyer.style.transform = "";
    pageFlyer.style.opacity = "";
    pageFlyer.classList.remove("is-drag");
    pageFace.classList.remove("is-still");
    if (fromCover && isCover(bookIndex)) {
      turnPage(1);
      return;
    }
    if (fromPhoto && !isCover(bookIndex)) {
      burstHearts(releaseX, releaseY);
      const now = Date.now();
      if (now - lastTap < 320) {
        fillLightbox(bookIndex);
        if (!lightbox.open) lightbox.showModal();
      }
      lastTap = now;
    }
    return;
  }

  if (Math.abs(delta) >= 64) {
    const direction = delta < 0 ? 1 : -1;
    const next = bookIndex + direction;
    if (next >= 0 && next < pageCount) {
      pageFlyer.classList.remove("is-drag");
      pageFlyer.style.transform = "";
      pageFlyer.style.opacity = "";
      pageFlyer.hidden = true;
      turnTo(next, direction);
      return;
    }
  }

  pageFlyer.classList.remove("is-drag");
  pageFlyer.style.transform = "";
  pageFlyer.style.opacity = "";
  pageFlyer.hidden = true;
  pageFace.classList.remove("is-still");
  renderBook();
}

bookPrev.addEventListener("click", () => turnPage(-1));
bookNext.addEventListener("click", () => turnPage(1));
bookCurl.addEventListener("click", () => turnPage(1));
edgePrev.addEventListener("click", () => turnPage(-1));
edgeNext.addEventListener("click", () => turnPage(1));
bookToStart?.addEventListener("click", () => turnTo(0, -1));
bookToEnd?.addEventListener("click", () => turnTo(pageCount - 1, 1));

bookStamp.addEventListener("click", () => {
  hideHint();
  stampMark.classList.remove("is-on");
  void stampMark.offsetWidth;
  stampMark.classList.add("is-on");
  const target = isCover(bookIndex) ? coverSheet : isEnd(bookIndex) ? endSheet : pagePhoto;
  const rect = (target || pageFace).getBoundingClientRect();
  burstHearts(rect.left + rect.width * 0.7, rect.top + rect.height * 0.7);
});

flipbook.addEventListener("pointerdown", beginDrag);
flipbook.addEventListener("pointermove", moveDrag);
flipbook.addEventListener("pointerup", endDrag);
flipbook.addEventListener("pointercancel", endDrag);

document.querySelectorAll(".sticker").forEach((sticker) => {
  sticker.addEventListener("click", (event) => {
    event.stopPropagation();
    hideHint();
    sticker.classList.remove("is-wiggle");
    void sticker.offsetWidth;
    sticker.classList.add("is-wiggle");
    stickerSay.textContent = sticker.dataset.say;
    stickerSay.classList.remove("is-on");
    void stickerSay.offsetWidth;
    stickerSay.classList.add("is-on");
  });
});

lightPrev.addEventListener("click", () => {
  if (bookIndex > 1) turnTo(bookIndex - 1, -1);
});

lightNext.addEventListener("click", () => {
  if (bookIndex < pageCount - 1) turnTo(bookIndex + 1, 1);
});

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});

lightbox.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" && bookIndex > 1) {
    event.preventDefault();
    turnTo(bookIndex - 1, -1);
  } else if (event.key === "ArrowRight" && bookIndex < pageCount - 1) {
    event.preventDefault();
    turnTo(bookIndex + 1, 1);
  }
});

document.addEventListener("keydown", (event) => {
  if (!opened || lightbox.open || flipping) return;
  const rect = book.getBoundingClientRect();
  const onBook = rect.top < window.innerHeight * 0.85 && rect.bottom > window.innerHeight * 0.15;
  if (!onBook) return;
  if (event.key === "ArrowRight") {
    event.preventDefault();
    turnPage(1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    turnPage(-1);
  }
});

pageFlyer.hidden = true;
renderBook();

site.setAttribute("aria-hidden", "true");
startIntro();

/* —— Room navigation + park map —— */

const rooms = [...document.querySelectorAll(".room[data-room]")];
const partyMap = document.querySelector("#party-map");
const parkViewport = document.querySelector("#park-viewport");
const parkWorld = document.querySelector("#park-world");
let currentRoom = "top";
let parkPan = { x: 0, y: 0, scale: 1 };
let parkDragging = false;
let parkDragStart = null;
let parkMoved = false;

const ROOM_LABELS = {
  top: "Back at the park.",
  letter: "Hachiware's Post Office.",
  reasons: "Chiikawa's Jar Tent.",
  album: "Memory Carousel.",
  wishes: "Birthday Stage.",
  snacks: "Birthday Café.",
  play: "Usagi's Midway.",
  garden: "Wishing Garden.",
  ending: "Exit Gate."
};

const PASSPORT_KEY = "nates-birthday-park-passport-v1";
const PASSPORT_STOPS = [
  { id: "letter", label: "Post", mark: "POST" },
  { id: "reasons", label: "Jar Tent", mark: "JAR" },
  { id: "album", label: "Carousel", mark: "BOOK" },
  { id: "snacks", label: "Café", mark: "CAFE" },
  { id: "wishes", label: "Stage", mark: "STAGE" },
  { id: "play", label: "Midway", mark: "GAME" },
  { id: "garden", label: "Garden", mark: "WISH" },
  { id: "ending", label: "Exit", mark: "EXIT" }
];

function loadPassport() {
  try {
    const raw = localStorage.getItem(PASSPORT_KEY);
    const data = raw ? JSON.parse(raw) : { stamps: {} };
    return data && typeof data === "object" ? data : { stamps: {} };
  } catch {
    return { stamps: {} };
  }
}

function savePassport(data) {
  localStorage.setItem(PASSPORT_KEY, JSON.stringify(data));
}

function stampPassport(id) {
  if (!PASSPORT_STOPS.some((stop) => stop.id === id)) return;
  const data = loadPassport();
  if (!data.stamps) data.stamps = {};
  if (data.stamps[id]) {
    renderPassport();
    return;
  }
  data.stamps[id] = Date.now();
  if (typeof window.ParkAudio?.sfx === "function") window.ParkAudio.sfx("stamp");
  const collected = PASSPORT_STOPS.filter((stop) => data.stamps[stop.id]).length;
  if (collected >= PASSPORT_STOPS.length) data.complete = true;
  savePassport(data);
  renderPassport();
  if (data.complete && !data.celebrated) {
    data.celebrated = true;
    savePassport(data);
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("park:passport-complete"));
      const dialog = document.querySelector("#passport-dialog");
      dialog?.showModal();
      if (typeof showToast === "function") showToast("Passport complete — fireworks unlocked!");
    }, 600);
  }
}

function renderPassport() {
  const grid = document.querySelector("#passport-grid");
  const countEl = document.querySelector("#pass-count");
  const completeEl = document.querySelector("#passport-complete");
  const data = loadPassport();
  const stamps = data.stamps || {};
  const collected = PASSPORT_STOPS.filter((stop) => stamps[stop.id]).length;
  if (countEl) countEl.textContent = String(collected);
  if (completeEl) completeEl.hidden = !data.complete;
  if (!grid) return;
  grid.innerHTML = PASSPORT_STOPS.map((stop) => {
    const on = Boolean(stamps[stop.id]);
    return `<div class="pass-stamp${on ? " is-collected" : ""}"><div class="pass-mark">${stop.mark}</div><span>${stop.label}</span></div>`;
  }).join("");
}

function ensureRoomBack(roomEl) {
  if (roomEl.dataset.room === "top") return;
  if (roomEl.querySelector(".room-back")) return;
  const back = document.createElement("button");
  back.type = "button";
  back.className = "room-back";
  back.textContent = "Return to Park";
  back.addEventListener("click", () => showRoom("top"));
  roomEl.prepend(back);
}

rooms.forEach(ensureRoomBack);
renderPassport();

function clampParkPan() {
  if (!parkViewport || !parkWorld) return;
  const vw = parkViewport.clientWidth;
  const vh = parkViewport.clientHeight;
  const worldW = 1600 * parkPan.scale;
  const worldH = 1000 * parkPan.scale;
  if (worldW <= vw) parkPan.x = (vw - worldW) / 2;
  else parkPan.x = Math.min(0, Math.max(vw - worldW, parkPan.x));
  if (worldH <= vh) parkPan.y = (vh - worldH) / 2;
  else parkPan.y = Math.min(0, Math.max(vh - worldH, parkPan.y));
}

function applyParkTransform(animate) {
  if (!parkWorld) return;
  clampParkPan();
  parkWorld.style.transition = animate ? "" : "none";
  parkWorld.style.transform = `translate(${parkPan.x}px, ${parkPan.y}px) scale(${parkPan.scale})`;
  if (!animate) {
    void parkWorld.offsetWidth;
    parkWorld.style.transition = "";
  }
}

function centerParkOn(el, scale = 1.35) {
  if (!parkViewport || !parkWorld || !el) return;
  const vw = parkViewport.clientWidth;
  const vh = parkViewport.clientHeight;
  const cx = el.offsetLeft + el.offsetWidth / 2;
  const cy = el.offsetTop + el.offsetHeight / 2;
  parkPan.scale = scale;
  parkPan.x = vw / 2 - cx * scale;
  parkPan.y = vh / 2 - cy * scale;
  parkWorld.classList.add("is-zooming");
  applyParkTransform(true);
}

function resetParkView() {
  if (!parkViewport || !parkWorld) return;
  const vw = parkViewport.clientWidth;
  const vh = parkViewport.clientHeight;
  /* Cover-fit: fill the screen, no empty margins */
  const fit = Math.max(vw / 1600, vh / 1000);
  parkPan.scale = fit;
  parkPan.x = (vw - 1600 * parkPan.scale) / 2;
  parkPan.y = (vh - 1000 * parkPan.scale) / 2;
  parkWorld.classList.remove("is-zooming");
  applyParkTransform(true);
}

window.__parkGetPan = () => ({ ...parkPan });
window.__parkSetCamera = (wx, wy, scale, animate) => {
  if (!parkViewport || !parkWorld) return;
  const vw = parkViewport.clientWidth;
  const vh = parkViewport.clientHeight;
  parkPan.scale = scale || Math.max(vw / 1600, vh / 1000);
  parkPan.x = vw / 2 - wx * parkPan.scale;
  parkPan.y = vh / 2 - wy * parkPan.scale;
  if (animate) parkWorld.classList.add("is-zooming");
  else parkWorld.classList.remove("is-zooming");
  applyParkTransform(Boolean(animate));
};

function showRoom(id, options = {}) {
  const next = rooms.find((room) => room.dataset.room === id) || rooms.find((room) => room.dataset.room === "top");
  if (!next) return;
  currentRoom = next.dataset.room;
  rooms.forEach((room) => {
    const on = room === next;
    room.classList.toggle("is-active", on);
    room.hidden = !on;
    room.setAttribute("aria-hidden", on ? "false" : "true");
    if (on) room.scrollTop = 0;
  });
  document.documentElement.classList.toggle("park-explore", currentRoom === "top");
  document.querySelectorAll(".nav-room").forEach((btn) => {
    btn.classList.toggle("is-on", btn.dataset.room === currentRoom);
  });
  document.querySelectorAll(".hotspot").forEach((btn) => {
    btn.classList.toggle("is-hot", btn.dataset.room === currentRoom);
  });
  partyMap?.close();
  if (currentRoom !== "top") stampPassport(currentRoom);
  if (!options.silent && typeof showToast === "function") {
    showToast(ROOM_LABELS[currentRoom] || "");
  }
  window.dispatchEvent(new CustomEvent("park:room", { detail: currentRoom }));
  if (currentRoom === "top") {
    window.setTimeout(resetParkView, 40);
    focusHero();
  }
}

function visitSpot(el) {
  const id = el?.dataset?.room;
  if (!id) return;
  if (reduceMotion) {
    showRoom(id);
    return;
  }
  centerParkOn(el, Math.max(parkPan.scale * 1.35, 1.55));
  window.setTimeout(() => showRoom(id), 580);
}

window.visitParkRoom = (id, el) => {
  if (el) visitSpot(el);
  else showRoom(id);
};

document.querySelectorAll("[data-room]").forEach((el) => {
  if (el.classList.contains("room")) return;
  el.addEventListener("click", (event) => {
    const id = el.dataset.room;
    if (!id) return;
    event.preventDefault();
    if (el.classList.contains("hotspot")) {
      if (parkMoved) return;
      visitSpot(el);
      return;
    }
    showRoom(id);
  });
});

document.querySelector("#passport-btn")?.addEventListener("click", () => {
  renderPassport();
  document.querySelector("#passport-dialog")?.showModal();
});

document.querySelector("#directory-btn")?.addEventListener("click", () => {
  partyMap?.showModal();
});

document.querySelector("#reset-view")?.addEventListener("click", () => {
  resetParkView();
});

/* Park pan / drag — secondary; explore mode prefers WASD + click-to-move */
if (parkViewport && parkWorld) {
  document.documentElement.classList.add("park-explore");
  resetParkView();
  window.addEventListener("resize", () => {
    if (currentRoom === "top") resetParkView();
  });

  const onDown = (event) => {
    if (document.documentElement.classList.contains("park-explore")) return;
    if (event.target.closest("button, a")) return;
    parkDragging = true;
    parkMoved = false;
    parkViewport.classList.add("is-dragging");
    const point = event.touches ? event.touches[0] : event;
    parkDragStart = { x: point.clientX, y: point.clientY, panX: parkPan.x, panY: parkPan.y };
  };
  const onMove = (event) => {
    if (!parkDragging || !parkDragStart) return;
    const point = event.touches ? event.touches[0] : event;
    const dx = point.clientX - parkDragStart.x;
    const dy = point.clientY - parkDragStart.y;
    if (Math.hypot(dx, dy) > 6) parkMoved = true;
    parkPan.x = parkDragStart.panX + dx;
    parkPan.y = parkDragStart.panY + dy;
    applyParkTransform(false);
    if (event.cancelable) event.preventDefault();
  };
  const onUp = () => {
    parkDragging = false;
    parkDragStart = null;
    parkViewport.classList.remove("is-dragging");
    window.setTimeout(() => { parkMoved = false; }, 80);
  };

  parkViewport.addEventListener("mousedown", onDown);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  parkViewport.addEventListener("touchstart", onDown, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onUp);
}

/* Entrance hosts + wanderer speech bubbles */
document.querySelectorAll(".host, .wanderer").forEach((friend) => {
  friend.addEventListener("click", () => {
    const name = friend.dataset.friend;
    const options = LINES[name] || ["hi"];
    const bubble = friend.querySelector(".say");
    if (!bubble) return;
    bubble.textContent = options[Math.floor(Math.random() * options.length)];
    friend.classList.add("is-talking");
    window.setTimeout(() => friend.classList.remove("is-talking"), 1800);
    if (name === "usagi" && typeof runUsagi === "function") runUsagi();
  });
});

/* —— Meadow, eggs, jar, claw, night —— */

const REASONS = [
  "You make even the most ordinary days entertaining.",
  "I can be completely myself around you without feeling judged.",
  "We have inside jokes that nobody else would understand.",
  "Growing up with you gave me some of my favorite memories.",
  "You make me laugh even when I'm in a terrible mood.",
  "I love that we can annoy each other and still be best friends.",
  "You have your own little quirks that make you uniquely you.",
  "I'm proud of the person you've become and the person you're still becoming.",
  "Even doing absolutely nothing together can be fun.",
  "You understand parts of me that other people never will.",
  "Life would be significantly more boring without you in it.",
  "I love seeing you get excited about the things you enjoy.",
  "No matter how old we get, I'll always have someone to reminisce about our childhood with.",
  "You've taught me that love doesn't always have to be expressed through words.",
  "You're someone I'll always be rooting for, no matter what you decide to do in life.",
  "Even when we disagree, I wouldn't trade our relationship for anything.",
  "You make home feel a little more like home.",
  "I love knowing that we still have so many memories left to make together.",
  "Your happiness genuinely makes me happy.",
  "Out of all the people in the world, I'm really glad I got to have you as my brother."
];

const butterflies = document.querySelector("#butterflies");
if (butterflies) {
  for (let i = 0; i < 5; i += 1) {
    const bug = document.createElement("span");
    bug.className = "butterfly";
    bug.style.animationDelay = `${i * 1.7}s`;
    bug.style.animationDuration = `${10 + i * 1.4}s`;
    bug.style.top = `${12 + i * 8}%`;
    butterflies.appendChild(bug);
  }
}

const fireflies = document.querySelector("#fireflies");
if (fireflies) {
  for (let i = 0; i < 28; i += 1) {
    const fly = document.createElement("span");
    fly.className = "firefly";
    fly.style.left = `${4 + Math.random() * 92}%`;
    fly.style.top = `${8 + Math.random() * 78}%`;
    fly.style.animationDelay = `${Math.random() * 5}s`;
    fly.style.animationDuration = `${3.5 + Math.random() * 3.5}s`;
    fly.style.setProperty("--fly-size", `${4 + Math.random() * 5}px`);
    fireflies.appendChild(fly);
  }
}

const stars = document.querySelector("#stars");
if (stars) {
  for (let i = 0; i < 36; i += 1) {
    const spark = document.createElement("span");
    spark.className = "star-spark";
    spark.style.left = `${Math.random() * 100}%`;
    spark.style.top = `${Math.random() * 55}%`;
    spark.style.animationDelay = `${Math.random() * 4}s`;
    spark.style.setProperty("--spark", `${1.5 + Math.random() * 2.5}px`);
    stars.appendChild(spark);
  }
}

const balloonToast = document.querySelector("#balloon-toast");
let toastTimer = 0;
function showToast(message) {
  if (!balloonToast) return;
  balloonToast.textContent = message;
  balloonToast.classList.add("is-on");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => balloonToast.classList.remove("is-on"), 2800);
}
window.showToast = showToast;

document.querySelectorAll(".pop-balloon").forEach((balloon) => {
  balloon.addEventListener("click", () => {
    if (balloon.classList.contains("is-popped")) return;
    balloon.classList.add("is-popped");
    showToast(balloon.dataset.msg || "Pop!");
  });
});

document.querySelectorAll(".meadow-flower[data-msg]").forEach((flower) => {
  flower.addEventListener("click", () => showToast(flower.dataset.msg));
});

const usagiRunner = document.querySelector("#usagi-runner");
function runUsagi() {
  if (!usagiRunner || reduceMotion || usagiRunner.classList.contains("is-run")) return;
  usagiRunner.classList.remove("is-run");
  void usagiRunner.offsetWidth;
  usagiRunner.classList.add("is-run");
  window.setTimeout(() => usagiRunner.classList.remove("is-run"), 2900);
}
window.runUsagi = runUsagi;

window.setInterval(() => {
  if (!opened || document.hidden || reduceMotion) return;
  if (Math.random() > 0.55) runUsagi();
}, 12000);

let usagiClicks = 0;
document.querySelectorAll(".person").forEach((person) => {
  person.addEventListener("click", () => {
    if (person.dataset.friend !== "usagi") return;
    usagiClicks += 1;
    if (usagiClicks >= 5) {
      usagiClicks = 0;
      person.classList.add("is-chaos");
      showToast("USAGI MODE: absolute chaos unlocked.");
      runUsagi();
      window.setTimeout(() => person.classList.remove("is-chaos"), 1000);
    }
  });
});

const sun = document.querySelector("#sun");
const moon = document.querySelector("#moon");
const nightMsg = document.querySelector("#night-msg");
const nightWorld = document.querySelector("#night-world");
const nightFx = document.querySelector("#night-fx");
const nightScenes = [
  "photos/night/campfire.jpg",
  "photos/night/lantern-cafe.jpg",
  "photos/night/trailer.jpg",
  "photos/night/mushroom.jpg"
];
let nightSceneIndex = 0;

const nightToggle = document.querySelector("#night-toggle");

function setNightMode(night) {
  document.body.classList.toggle("is-night", night);
  if (stars) stars.hidden = !night;
  if (fireflies) fireflies.hidden = !night;
  if (moon) {
    moon.hidden = !night;
    moon.setAttribute("aria-hidden", night ? "false" : "true");
  }
  if (nightMsg) nightMsg.hidden = !night;
  if (nightWorld) {
    nightWorld.hidden = !night;
    nightWorld.setAttribute("aria-hidden", night ? "false" : "true");
  }
  if (nightFx) {
    nightFx.hidden = !night;
    nightFx.setAttribute("aria-hidden", night ? "false" : "true");
  }
  if (sun) {
    sun.hidden = night;
  }
  if (nightToggle) {
    nightToggle.setAttribute("aria-pressed", night ? "true" : "false");
    nightToggle.title = night ? "Day mode" : "Night mode";
    nightToggle.setAttribute("aria-label", night ? "Switch to day mode" : "Switch to night mode");
  }
}
window.setNightMode = setNightMode;

function toggleNightMode() {
  const night = !document.body.classList.contains("is-night");
  if (night) {
    const bg = nightWorld?.querySelector(".night-bg");
    if (bg) {
      bg.src = nightScenes[nightSceneIndex % nightScenes.length];
      nightSceneIndex += 1;
    }
  }
  setNightMode(night);
}

nightToggle?.addEventListener("click", toggleNightMode);

document.querySelector("#age-20")?.addEventListener("click", () => {
  const dialog = document.querySelector("#achieve-dialog");
  const text = document.querySelector("#achieve-text");
  if (text) {
    text.textContent = "Achievement unlocked: Survived 20 years of being an excellent little brother. Reward: endless sister support.";
  }
  dialog?.showModal();
});

const cloudSecret = document.querySelector('.cloud[data-secret="cloud"]');
cloudSecret?.addEventListener("click", () => {
  if (document.querySelector(".secret-photo")) return;
  const img = document.createElement("img");
  img.className = "secret-photo";
  img.src = "photos/01-bouncer.jpg";
  img.alt = "A hidden childhood photo of Nathan.";
  document.querySelector(".hero")?.appendChild(img);
  showToast("A little memory was hiding in the clouds.");
  window.setTimeout(() => img.remove(), 6000);
});

const found = new Set();
const secretPage = document.querySelector("#secret-page");
document.querySelectorAll(".hidden-find").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.classList.add("is-found");
    found.add(btn.dataset.find);
    showToast(`Hidden friend ${found.size}/3`);
    if (found.size >= 3) secretPage?.showModal();
  });
});

let nameBuffer = "";
document.addEventListener("keydown", (event) => {
  if (!opened || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key.length !== 1) return;
  nameBuffer = (nameBuffer + event.key.toLowerCase()).slice(-6);
  if (nameBuffer.includes("nathan")) {
    nameBuffer = "";
    spawnConfetti();
    showToast("NATHAN!! The meadow heard you.");
  }
});

const jarNotes = document.querySelector("#jar-notes");
const reasonText = document.querySelector("#reason-text");
const reasonHint = document.querySelector(".reason-hint");
const reasonCount = document.querySelector("#reason-count");
const openedReasons = new Set();

document.querySelector("#letter .letter")?.addEventListener("click", () => {
  if (typeof window.ParkAudio?.sfx === "function") window.ParkAudio.sfx("letter");
});

if (jarNotes) {
  REASONS.forEach((reason, index) => {
    const note = document.createElement("button");
    note.type = "button";
    note.className = "jar-note";
    note.style.left = `${8 + (index % 5) * 18 + (index % 3) * 3}%`;
    note.style.top = `${10 + Math.floor(index / 5) * 22 + (index % 2) * 4}%`;
    note.style.setProperty("--rot", `${(index % 7) * 7 - 18}deg`);
    note.setAttribute("aria-label", `Reason ${index + 1}`);
    note.addEventListener("click", () => {
      note.classList.add("is-open");
      openedReasons.add(index);
      if (typeof window.ParkAudio?.sfx === "function") window.ParkAudio.sfx("note");
      if (reasonHint) reasonHint.hidden = true;
      if (reasonText) {
        reasonText.hidden = false;
        reasonText.textContent = reason;
      }
      if (reasonCount) reasonCount.textContent = `${openedReasons.size} of 20 opened`;
    });
    jarNotes.appendChild(note);
  });
}

/* Claw machine gameplay moved to arcade-games.js (Phase 1). */

document.querySelector("#lanterns-btn")?.addEventListener("click", () => {
  const field = document.querySelector("#ending-lanterns");
  if (!field) return;
  field.replaceChildren();
  if (!document.body.classList.contains("is-night")) {
    setNightMode(true);
    const bg = nightWorld?.querySelector(".night-bg");
    if (bg) bg.src = "photos/night/lantern-cafe.jpg";
  }
  if (nightMsg) nightMsg.hidden = false;
  for (let i = 0; i < 18; i += 1) {
    const lantern = document.createElement("span");
    lantern.className = "lantern paper-lantern " + ["pl-warm", "pl-pink", "pl-cream"][i % 3];
    lantern.style.left = `${5 + Math.random() * 90}%`;
    lantern.style.bottom = "-40px";
    lantern.style.position = "absolute";
    lantern.style.marginTop = "0";
    lantern.style.animation = `lantern-rise ${4.5 + Math.random() * 2}s ease-in forwards`;
    lantern.style.animationDelay = `${i * 0.1}s`;
    lantern.style.width = `${26 + Math.random() * 16}px`;
    lantern.style.height = `${34 + Math.random() * 18}px`;
    field.appendChild(lantern);
  }
  showToast("Lanterns for your next year.");
});
