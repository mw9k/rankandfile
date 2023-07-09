"use strict";

let settings = {}; // loaded later

let state = {
  best: 0, bestEver: 0, blockGuessesUntil: 0, count: -1, currentFile: 0,
  currentRank:0, focusCount: 0, lastBlurTime: 0, lastFrameTime: 0,
  prevWasWrong: false, streak: 0, wrongCount: 0
};

let sfx = {
  applause: new Howl({ src: ["applause.mp3"] }),
  correct1: new Howl({ src: ["correct1.mp3"] }),
  correct2: new Howl({ src: ["correct2.mp3"] }),
  correct3: new Howl({ src: ["correct3.mp3"] }),
  correct4: new Howl({ src: ["correct4.mp3"] }),
  correct5: new Howl({ src: ["correct5.mp3"] }),
  fanfare: new Howl({ src: ["fanfare.mp3"] }),
  timeout: new Howl({ src: ["timeout.mp3"] }),
  wrong: new Howl({ src: ["wrong.mp3"] })
};

function moveSq() {
  // Choose a new random square and move the circle timer to it
  state.count++;
  state.currentFile = diffRndInt(0, 7, state.currentFile);
  state.currentRank = diffRndInt(0, 7, state.currentRank);
  let sqOld = (state.count % 2) ? "sq2" : "sq1";
  let sqNew = (state.count % 2) ? "sq1" : "sq2";
  el(sqNew).style.setProperty("--file", state.currentFile);
  el(sqNew).style.setProperty("--rank", state.currentRank);
  reanimate(sqOld, "gotRight", "sq");
  reanimate(sqNew, "zoomIn", "sq");
  startCircleTimer(sqNew);
  generateChoices();
}

function diffRndInt(lBound, uBound, prevRnd) {
  // Choose a random int different from previous choice
  // Bounds are "inclusive"
  let newRnd;
  if (prevRnd > uBound || prevRnd < lBound) { // if prev rnd outside of bounds
    newRnd = rndIntInRange(lBound, uBound);   // straightforward rndIntInRange
  } else {
    newRnd = rndIntInRange(lBound, uBound - 1); // otherwise, reduce range by 1
    if (newRnd >= prevRnd) newRnd++; // shift up to compensate for missing no.
  }
  return newRnd;
}

function rndIntInRange(lBound, uBound) {
  // Bounds are "inclusive"
  return Math.floor(Math.random() * (uBound - lBound + 1)) + lBound;
}

function reanimate(elem, className, resetTo) {
  // Reset and re-apply a CSS animation, allowing it to replay
  if (resetTo !== undefined) el(elem).classList = resetTo;
  el(elem).classList.remove(className);
  el(elem).offsetHeight;  // resets the animation
  el(elem).classList.add(className);
}

function generateChoices() {
  // Generates near-correct wrong answers
  const maxDist = (settings.constrain == "normal") ? 2 : 3;
  let correctSq = [state.currentFile, state.currentRank];
  let candidateSqs = [];
  for (let i = 0; i < 8; i++) {  // build array of every sq on same rank / file
    if (settings.constrain != "fileOnly") candidateSqs.push([correctSq[0], i]);
    if (settings.constrain != "rankOnly") candidateSqs.push([i, correctSq[1]]);
  }
  // Cull unwanted sqs...
  let keepSqs = [];
  for (let sq of candidateSqs) {
    let include = true;
    // Exclude actual correct sq (may be present twice)
    if (sq[0] == correctSq[0] && sq[1] == correctSq[1]) include = false;
    // Exclude sqs that are too distant from the correct sq...
    if (Math.abs(sq[0] - correctSq[0]) > maxDist ) include = false;
    if (Math.abs(sq[1] - correctSq[1]) > maxDist ) include = false;
    let keepSq = constrain(numToFile(sq[0]), sq[1] + 1);
    if (include) keepSqs.push(keepSq);
  }
  shuffleArray(keepSqs);
  keepSqs.splice(2);  // shorten the array to 2 near-correct options
  correctSq = constrain(numToFile(correctSq[0]), correctSq[1] + 1);
  let rndPos = rndIntInRange(0, 2); // random positon to insert correct option
  keepSqs.splice(rndPos, 0, correctSq); // add the actually correct option
  // Apply options to button elements...
  for (let [i, choice] of keepSqs.entries()) {
    el(`choice${i + 1}`).textContent = choice;
  }
}

function shuffleArray(arr) {
  // Adapted from https://stackoverflow.com/questions/2450954
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function el(elem) {	
  // Custom shortener for document.getElementById()
  return document.getElementById(elem);
}

function constrain(file, rank) {
  if (settings.constrain == "rankOnly") file = "";
  if (settings.constrain == "fileOnly") rank = "";
  return `${file}${rank}`;
}

function numToFile(num) {
  return String.fromCharCode(num + 97);
}

function makeGuess(guess) {
  if (state.blockGuessesUntil > performance.now()) {
    return false; // honour delay until guesses are allowed
  }
  if (!guess.length) return false;
  if (settings.constrain == "rankOnly") {
    // Auto-add missing portion of guess when using constrained modes...
    guess = `${numToFile(state.currentFile)}${guess}`;
  } else if (settings.constrain == "fileOnly") {
    guess += state.currentRank + 1;
  }
  let guessRank = parseInt(guess[1] - 1);
  let guessFile = guess[0].toLowerCase().charCodeAt(0) - 97;
  let gotRight = ( guessRank == state.currentRank &&
                   guessFile == state.currentFile );
  updateStreak(gotRight);
  processAnswer(gotRight);
}

function updateStreak(gotRight) {
  state.streak = (gotRight) ? state.streak + 1 : 0;
  if (state.streak > state.best) state.best = state.streak;
  if (state.best > state.bestEver) {
    state.bestEver = state.best;
    setLocalStorage("rankFileHiScore", state.bestEver);
  }
  el("streakNo").textContent = state.streak;
  el("bestNo").textContent = state.best;
  el("bestEverNo").textContent = state.bestEver;
}

function setLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`Error setting ${key} in localStorage:`, e);
    alert("Something went wrong. LocalStorage may be unavailable or " +
      "full. Please check your browser settings and try again.");
  }
}

function getLocalStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`Error getting ${key} from localStorage:`, e);
    return null;
  }
}

function processAnswer(gotRight) {
  state.prevWasWrong = !gotRight;  // true if got wrong
  let soundName = "";
  if (gotRight) {
    let soundNum = state.streak % 10;
    if (soundNum > 0 && soundNum <= 5) {  // 1-5: same sound
      soundNum = 1;
    } else if (soundNum > 5) {  // 6-9: builds in pitch
      soundNum -= 4;
    } else if (soundNum == 0) {  // 10 correct: fanfare sound
      soundName = "fanfare";
    }
    if (!soundName) soundName = `correct${soundNum}`;
    playSound(soundName);
    if (state.streak % 20 == 0) playSound("applause", 150);  // applause @ 20
    const anim = (state.streak % 10) ? "bump" : "bigBump";
    reanimate("streakNo", anim, anim);  // special animation @ 10 correct
    moveSq();
  } else {
    playSound("wrong");
    let sqOld = (state.count % 2) ? "sq1" : "sq2";
    el(sqOld).classList = "sq";
    reanimate(sqOld, "gotWrong");
    state.wrongCount++;
  }
}

function startCircleTimer(sq="sq1", delay=300) {
  // Initiates the "circle timer" sweep animation
  let canvas = el(sq),
      ctx = canvas.getContext("2d");
  ctx.fillStyle = "#BA990D";
  clearCanvas(canvas, ctx);
  let cData = { fullTripMs: settings.timeLimit * 1000, count: state.count,
    focusCount: state.focusCount, wrongCount: state.wrongCount, drawCount: 0 };
  setTimeout(() => {  // small delay before starting timer animation
    cData.startTime = performance.now()
    const sqCurrent = (state.count % 2) ? "sq1" : "sq2";
    if (state.prevWasWrong) {   // possible if button mashing
      canvas.classList.add("gotWrong");
    } else if (sqCurrent !== canvas.id) {
      return; // avoid starting multiple timers; possible if button mashing
    } else {
      canvas.classList.remove("gotWrong", "timeout", "gotRight");
      window.requestAnimationFrame(function () {
        circleStep(canvas, ctx, cData)
      });
    }
 }, delay);
}

function circleStep(canvas, ctx, cData) {
  // Perform a certain portion of the circle timer's sweep animation
  let sqCurrent = (state.count % 2) ? "sq1" : "sq2";
  if (!document.hasFocus()) {
    // If animation is running offscreen (esp. Firefox), don't advance timer...
    window.requestAnimationFrame(function () {
      circleStep(canvas, ctx, cData)
    });
    return;
  }
  if (state.count !== cData.count ||             // stop if already guessed
      state.wrongCount !== cData.wrongCount) {   // stop if got wrong
    stopDrawing(canvas, ctx);
    return;
  }
  if (settings.timeLimit * 1000 != cData.fullTripMs) {
    // Restart if settings changed mid-rotate...
    startCircleTimer(canvas.id, 100);
    return;
  }
  if (
    state.focusCount !== cData.focusCount &&
    state.lastBlurTime > cData.startTime
  ) {
    // Redraw all if window lost focus; to avoid glitchiness...
    clearCanvas(canvas, ctx);
    cData.focusCount = state.focusCount;
    // Pick up where left off...
    let adjusted = performance.now() - (state.lastBlurTime - cData.startTime);
    cData.startTime = adjusted;
  }
  let timeElapsed = performance.now() - cData.startTime;
  let progress = timeElapsed / cData.fullTripMs;
  if (timeElapsed > cData.fullTripMs) {
    stopDrawing(canvas, ctx);
    outOfTime(canvas);
    return;
  }
  // No need to clear anim. at each step, as it is additive in nature
  drawCirclePortion(canvas, ctx, cData, progress);  // The actual drawing
}

function drawCirclePortion(canvas, ctx, cData, progress) {
  // Formula for point on outer circle, from origin cx, cy:
  // x = cx + r * cos(a)
  // y = cy + r * sin(a)
  const angle = (360 * progress) - 90;
  const radians = Math.PI / 180 * angle;
  var x = 50 + 100 * Math.cos(radians);
  var y = 50 + 100 * Math.sin(radians);
  ctx.beginPath();
  ctx.moveTo(50, 50);
  ctx.lineTo(50, -150);
  // Draw to the corners once certain angles are passed, keeping shape fillable
  if (angle + 90 > 45) ctx.lineTo(150, -50);
  if (angle + 90 > 135) ctx.lineTo(150, 150);
  if (angle + 90 > 225) ctx.lineTo(-50, 150);
  if (angle + 90 > 315) ctx.lineTo(-50, -50);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  state.lastFrameTime = performance.now();
  cData.drawCount++;
  // Continue the animation (call the next step in the recursion)...
  window.requestAnimationFrame(function () { circleStep(canvas, ctx, cData) });
}

function stopDrawing(canvas, ctx){
  clearCanvas(canvas, ctx);
}

function outOfTime(canvas){
  updateStreak(false);
  state.wrongCount++;
  reanimate(canvas.id, "timeout");
  state.blockGuessesUntil = performance.now() + 600;
  if (state.count < 0) {
    // Loop the animation; on initial load only
    setTimeout(function () {
      if (state.count < 0) {
        canvas.classList.remove("timeout");
        startCircleTimer();
      }
    }, 2500);
  } else {
    playSound("timeout"); // no sound in initial loop, would get annoying
  }
}

function clearCanvas(canvas, ctx = canvas.getContext("2d")) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener("DOMContentLoaded", (event) => {
  // When DOM is ready, but before images & stylesheets etc loaded
  generateChoices();
  resetSettings();
  loadSettings(true);
  state.bestEver = getLocalStorage("rankFileHiScore") || "0";
  el("bestEverNo").textContent = state.bestEver;
  addEventHandling();
});

window.addEventListener("load", (event) => {
  // When DOM is ready and styles + images are also loaded
  resizeElements();
  startCircleTimer("sq1", 100);
  el("gameArea").classList.remove("loading");
});

function addEventHandling() {
  const allChoices = document.getElementsByClassName("choice");
  for (let choice of allChoices) {
    choice.addEventListener("click", function (e) {
      let gotRight = makeGuess(choice.textContent);
      reanimate(choice.id, "clickedDown");
    });
  }
  const showPcsRadioBttns = document.getElementsByClassName("showPcs");
  for (let bttn of showPcsRadioBttns) {
    bttn.addEventListener("change", function (e) {
      settings.showPcs = e.target.id;
      saveSettings();
    });
  }
  const constrainRadioBttns = document.getElementsByClassName("constrain");
  for (let bttn of constrainRadioBttns) {
    bttn.addEventListener("change", function (e) {
      settings.constrain = e.target.id;
      resetCurrentScore();
      saveSettings();
      generateChoices();
    });
  }
  const internalLinks = document.getElementsByClassName("internalLink");
  // Custom alternative to anchor links, ensuring smooth scrolling...
  for (let link of internalLinks) {
    link.addEventListener("click", function (e) {
      let target = e.target.dataset.target;
      e.preventDefault();
      el(target).scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  const checkboxes = document.querySelectorAll(`input[type="checkbox"]`);
  for (let box of checkboxes) {
    box.addEventListener("change", function (e) {
      settings[e.target.id] = e.target.checked;
      saveSettings();
    });
  }
  el("board").addEventListener("click", function (e) {
    el("gameArea").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  el("zoomIn").addEventListener("click", function (e) {
    zoom(1);
  });
  el("zoomOut").addEventListener("click", function (e) {
    zoom(-1);
  });
  el("resetHiScore").addEventListener("click", function (e) {
    resetHiScore();
  });
  el("resetSettings").addEventListener("click", function (e) {
    resetSettings(true, true);

  });
  el("timeLimit").addEventListener("input", function (e) {
    settings.timeLimit = Number(e.target.value);
    if (settings.timeLimit == 1) settings.timeLimit = 1.5;
    saveSettings();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "-" || e.key === "_") {   // anticipating "_" as typo for "-"
      zoom(-1);
    } else if (e.key === "+") {
      zoom(1);
    } else if (e.key == "A" || e.key == "a" || e.key == "1") {
      el("choice1").click();
    } else if (e.key == "S" || e.key == "s" || e.key == "2") {
      el("choice2").click();
    } else if (e.key == "D" || e.key == "d" || e.key == "3") {
      el("choice3").click();
    }
  });
  window.addEventListener("focus", function (e) {
    reFocus();
  });
  window.addEventListener("blur", function (e) {
    state.lastBlurTime = this.performance.now();
  });
  window.addEventListener("resize", function (event) {
    resizeElements();
  }, true);
}

function reFocus() {
  // Clear animations on window refocus to prevent oddities
  state.focusCount++;
  const limitMs = settings.timeLimit * 1000;
  if (this.performance.now() - state.lastFrameTime > limitMs) {
    clearCanvas(el("sq1"));
    clearCanvas(el("sq2"));
  }
}

function loadSettings(firstLoad) {
  let loaded = JSON.parse(getLocalStorage("rankFileSettings"));
  if (loaded && typeof loaded === "object" && loaded.exists) {
    for (const p in loaded) {
      // Load one property at a time, so future additions won't break saves
      settings[p] = loaded[p];
    }
  }
  applySettings(firstLoad);
}

function saveSettings() {
  setLocalStorage("rankFileSettings", JSON.stringify(settings));
  applySettings();
}

function applySettings(firstLoad) {
  if (settings.showQuads) {
    el("quadrants").classList.remove("hidden");
    el("showQuads").checked = true;
  } else {
    el("quadrants").classList.add("hidden");
    el("showQuads").checked = false;
  }
  if (settings.timeLimit) {
    if (el("timeLimit")) {
      let timeLimit = Math.floor(settings.timeLimit);
      el("timeLimit").value = timeLimit;
      if (timeLimit == 1) timeLimit = 1.5;
      el("timeLimitLabel").innerHTML = `Time Limit: ${timeLimit}s`;
    }
  }
  if (settings.flip) {
    el("board").classList.add("flipped");
    el("flip").checked = true;
  } else {
    el("board").classList.remove("flipped");
    el("flip").checked = false;
  }
  if (settings.showPcs) {
    el("board").classList.remove("noPcs", "allPcs", "kqOnly");
    el("board").classList.add(settings.showPcs);
    if (el(settings.showPcs)) {
      el(settings.showPcs).checked = true;
    }
  }
  if (settings.zoom) {
    zoom(0, false); // double check zoom is properly set within limits
    const widthVH = 65; // initial width of board as set in CSS
    const zoomLevel = Math.round(widthVH * (settings.zoom / 100) );
    el("zoomPercent").textContent = `${settings.zoom}%`;
    el("gameArea").style.width = `${zoomLevel}vh`;
    el("centerCover").style.width = `${zoomLevel}vh`;
    resizeElements();
  }
  if (settings.showLabels) {
    el("board").classList.remove("hideLabels");
  } else {
    el("board").classList.add("hideLabels");
  }
  if (el("showLabels")) { el("showLabels").checked = settings.showLabels; }
  if (el(settings.constrain)) {
    if (!el(settings.constrain).checked) {
      el(settings.constrain).checked = true;
      generateChoices();
    }
  }
  if (settings.sfx) el("sfx").checked = true;
}

function resetCurrentScore() {
  state.best = 0;
  state.streak = 0;
  updateStreak(false);
}

function resetHiScore() {
  if (confirm(`Are you sure you want to erase your "All Time" Best Score?`)) {
    state.bestEver = 0;
    setLocalStorage("rankFileHiScore", state.bestEver);
    el("bestEverNo").textContent = state.bestEver;
  }
}

function resetSettings(andSave = false, askConfirm = false) {
  if (askConfirm) {
    if (!confirm(`Reset all settings to default?`)) return;
  }
  settings = {  // the default settings:
    showQuads: false, flip: false, showPcs: "allPcs", constrain: "normal",
    sfx: true, showLabels: true, timeLimit: "5", zoom: 100, exists: true
  };
  if (andSave) saveSettings();
}

function playSound(sound, delay = 0) {
  if (!settings.sfx) return;
  if (delay) {
    setTimeout(() => {
      sfx[sound].play();
    }, (delay));
  } else {
    sfx[sound].play();
  }
}

function zoom(direction, andSave = true) {
  // "direction": expects 1 (zoom in), -1 (zoom out), or 0 (don't zoom)
  const stepSize = 5;
  settings.zoom += (stepSize * direction);
  settings.zoom = Math.max(15, settings.zoom);
  settings.zoom = Math.min(300, settings.zoom);
  if (andSave) saveSettings();
}

function resizeElements() {
  // Some custom resizing to account for different resolutions.
  // Aims to stick with the default system font size up to a point,
  // then resizes on a logistic curve (holds close to system size for longer)
  const bodyFontSz = window.getComputedStyle(document.body).fontSize;
  let boardSz = el("board").clientWidth;
  let neutralBoardSz = 380; // typical board size in px at ~1080p
  let relativeBoardSz = (boardSz / neutralBoardSz);
  // Allow some elements to scale linearly (no curve applied):
  el("gameArea").style.setProperty("--unscaled-rel-sz", relativeBoardSz);
  // Assymetrical curve; more room in upper range than lower:
  const rangeSize = (relativeBoardSz <= 1) ? 0.75 : 2;
  const minSz = 1 - rangeSize, maxSz = 1 + rangeSize;
  relativeBoardSz = Math.max(relativeBoardSz, minSz); // lower bound for range
  relativeBoardSz = Math.min(relativeBoardSz, maxSz); // upper bound for range
  relativeBoardSz = normaliseRange(relativeBoardSz, minSz, maxSz);  // normalise
  relativeBoardSz = customCurve(relativeBoardSz);  //apply curve
  relativeBoardSz = normaliseRange(relativeBoardSz, 0, 1, minSz, maxSz);
  el("gameArea").style.setProperty("--relative-board-sz", relativeBoardSz);
  el("gameArea").style.setProperty("--body-font-sz", bodyFontSz);
  adjustForMobile();
}

function adjustForMobile() {
  // Fine tuning if content takes up full width (eg on mobile)
  const vw = window.innerWidth || document.documentElement.clientWidth;
  const ratio = el("centralColumn").clientWidth / vw;
  if (ratio == 1) {
    document.body.classList.add("fullWidth");
  } else {
    document.body.classList.remove("fullWidth");
}
}

function customCurve(x) {
  // Makes a curve with a flat middle, and logistic curved approach & retreat
  // Expects input from 0 to 1
  const flatStart = 0.4,	// start of the middle range at which curve flattens
    flatScale = 1 / flatStart;  // normalise range from 0-1 to feed into curve
  const scale = 0.5 / logisticCurve(flatStart * flatScale);
  // ...find max value of curve to scale it down,
  if (x >= flatStart && x < 1 - flatStart) {
    return 0.5	// flat through middle range
  } else if (x < flatStart) {
    return logisticCurve(x * flatScale) * scale;
  } else {
    return (1 - logisticCurve((1 - x) * flatScale) * scale);  // inverted
  }
}

function logisticCurve(x) {
  // Expects input from 0 to 1
  // Produces a logistic curve (type of S shaped curve)
  const midPoint = 0.5; // adjust curve midpoint
  const steepness = 8; // adjust curve steepness
  return 1 / (1 + Math.exp(- steepness * (x - midPoint)));
}

function normaliseRange(value, min, max, newMin = 0, newMax = 1) {
  // Maps a value from a range (min to max) to a new range (newMin to newMax)
  // First normalise to the range 0 to 1...
  const normalised = (value - min) / (max - min);
  // Scale to the new range (newMin to newMax)...
  return normalised * (newMax - newMin) + newMin;
}

function measureExecutionTime(fn) {
  // For Debug: returns execution time of a given function
  console.time("Execution time");
  fn();
  console.timeEnd("Execution time");
}