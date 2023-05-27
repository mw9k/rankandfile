let settings = {}, // loaded later
  state = { prevRank:0, prevFile:0, streak:0, best:0, bestEver:0, count:-1,
            wrongCount:0, blockGuessesUntil:0, lastFrameTime:0, focusCount:0,
            lastBlurTime:0 },
  sfx = { wrong: new Howl({ src: ["wrong.wav"] }), 
          right: new Howl({ src: ["right.wav"] }), 
          timeout: new Howl({ src: ["timeout.mp3"] }), 
          fanfare: new Howl({ src: ["fanfare.wav"] }) };

function moveSq() {
  state.count++;
  chosenFile = diffRndInt(0, 7, state.prevFile);
  chosenRank = diffRndInt(0, 7, state.prevRank);
  state.prevFile = chosenFile;
  state.prevRank = chosenRank;
  let sqOld = (state.count % 2) ? "sq2" : "sq1";
  let sqNew = (state.count % 2) ? "sq1" : "sq2";
  el(sqNew).style.setProperty("--file", chosenFile);
  el(sqNew).style.setProperty("--rank", chosenRank);
  reanimate(sqOld, "gotRight", "sq");
  reanimate(sqNew, "zoomIn", "sq");
  startCircleTimer(sqNew);
  generateChoices();
}

function diffRndInt(lBound, uBound, prevRnd) {  
  // choose a random int different from previous choice
  // bounds are 'inclusive'
  let newRnd;
  if (prevRnd > uBound || prevRnd < lBound) { // if prev rnd not within bounds 
    newRnd = rndIntInRange(lBound, uBound);   // straightforward rndIntInRange
  } else {
    newRnd = rndIntInRange(lBound, uBound - 1); // otherwise, reduce range by 1
    if (newRnd >= prevRnd) newRnd++; // shift up to compensate for missing no.
  }
  return newRnd;
}

function rndIntInRange(lBound, uBound) { 
  // bounds are 'inclusive'
  return Math.floor(Math.random() * (uBound - lBound + 1)) + lBound;
}

function reanimate(elem, className, resetTo) {
  // reset and re-apply CSS animation, allowing it to replay 
  if (resetTo !== undefined) el(elem).classList = resetTo;
  el(elem).classList.remove(className);
  el(elem).offsetHeight;  // resets the animation
  el(elem).classList.add(className);
}

function generateChoices() {
  let choices = []; 
  // first add correct answer, then generate near-correct wrong answers...
  let correctChoice = constrain(numToFile(state.prevFile), state.prevRank + 1);
  choices.push(correctChoice); 
  let i = 0;
  while (choices.length < 3 && i < 10000) { // try <10k, as failsafe
    let lockAxis, rndRank, rndFile;
    let maxDist = 3;
    if (settings.constrain == "normal") { 
      maxDist = 1;
      lockAxis = (Math.random() < .5) ? "x" : "y"; // lock either axis
    } 
    let lBound = (state.prevRank - maxDist >= 0) ? state.prevRank - maxDist : 0;
    let uBound = (state.prevRank + maxDist <= 7) ? state.prevRank + maxDist : 7;
    // pseudorandomly select a file (x-axis coordinate):
    if (lockAxis == "x") {
      rndFile = numToFile(state.prevFile); // if locked axis, use actual answer
    } else {
      rndFile = rndIntInRange(lBound, uBound);
      rndFile = numToFile(rndFile);
    }
    // pseudorandomly select a rank (y-axis coordinate):
    if (lockAxis == "y") {
      rndRank = state.prevRank; // if locked axis, use actual answer
    } else {
      rndRank = rndIntInRange(lBound, uBound);
    }
    let rndSq = constrain(rndFile, rndRank + 1);
    if (choices.indexOf(rndSq) == -1) choices.push(rndSq);  // add if unique
    i++;
  }
  shuffleArray(choices);
  for (let [i, choice] of choices.entries()) {
    el(`choice${i + 1}`).textContent = choice;
  }
}

function shuffleArray(arr) {
  // adapted from https://stackoverflow.com/questions/2450954
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function el(elem) {	
  // 'shortcut' for document.getElementById()
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
  if (state.blockGuessesUntil > performance.now()) return false;
  if (!guess.length) return false;
  if (settings.constrain == "rankOnly") { 
    guess = `${numToFile(state.prevFile)}${guess}`;
  } else if (settings.constrain == "fileOnly") {
    guess += state.prevRank + 1;
  }
  let guessRank = parseInt(guess[1] - 1);
  let guessFile = guess[0].toLowerCase().charCodeAt(0) - 97;
  let gotRight = (guessRank == state.prevRank && guessFile == state.prevFile);
  updateStreak(gotRight);
  processAnswer(gotRight);
}

function updateStreak(gotRight) {
  state.streak = (gotRight) ? state.streak + 1 : 0;
  if (state.streak > state.best) state.best = state.streak;
  if (state.best > state.bestEver) {
    state.bestEver = state.best;
    try {
      localStorage.setItem("rankFileHiScore", state.bestEver);
    } catch (e) {
      console.error(`Error setting high score in localStorage:`, e);
      alert("An error occurred accessing localStorage.");
    }
  }
  el("streakNo").textContent = state.streak;
  el("bestNo").textContent = state.best;
  el("bestEverNo").textContent = state.bestEver;
}

function setLocalStorage(key, value) { 
   // (with error handling)
   try {
     localStorage.setItem(key, value);
  } catch (e) {
    console.error(`Error setting ${key} in localStorage:`, e);
    alert("Something went wrong. LocalStorage may be unavailable, or the" +
    " storage quota may have been exceeded. Please check your browser" +
    " settings and try again.");
  }
}

function getLocalStorage(key) {
  // (with error handling)
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`Error getting ${key} from localStorage:`, e);
    return null;
  }
}

function processAnswer(gotRight) {
  if (gotRight) {
    if (state.streak % 5) {
      playSound("right");
      reanimate("streakNo", "bump", "bump");
    } else {
      playSound("fanfare");
      reanimate("streakNo", "bigBump", "bigBump");
    }
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
  let canvas = el(sq),
      ctx = canvas.getContext("2d");
  ctx.fillStyle = "#BA990D";
  clearCanvas(canvas, ctx);
  setTimeout(() => {  // small delay before starting timer animation
    // prevent drawing over BGs, if user button mashes:
    if (canvas.classList.contains("gotWrong", "gotRight","timeout")) return;
    let c = { startTime: performance.now(), fullTripMs: settings.timeLimit * 1000,
      count: state.count, wrongCount: state.wrongCount, drawCount: 0,
      focusCount: state.focusCount };
    window.requestAnimationFrame(function () { circleStep(canvas, ctx, c) }) 
 }, delay);
}

function circleStep(canvas, ctx, c) {
  // if (c.drawCount % 10 == 0) {
  //   if (canvas.classList.contains("gotWrong")){
  //     console.log(canvas.classList);
  //     clearCanvas(canvas, ctx);
  //     return; 
  //   } 
  // }
  if (!document.hasFocus()) {
    // if animation is running offscreen (esp. Firefox), don't advance timer...
    window.requestAnimationFrame(function () { circleStep(canvas, ctx, c) });
    return;
  }
  if (state.count !== c.count ||             // stop if already guessed
      state.wrongCount !== c.wrongCount) {   // stop if got wrong
    clearCanvas(canvas, ctx);
    return; 
  } 
  if (settings.timeLimit * 1000 != c.fullTripMs) {
    // restart if settings changed mid-rotate...
    startCircleTimer(canvas.id, 100);
    return;
  }
  if (state.focusCount !== c.focusCount && state.lastBlurTime > c.startTime) {
    // redraw all if window lost focus; to avoid glitchiness...
    clearCanvas(canvas, ctx);
    c.focusCount = state.focusCount;
    // pick up where left off...
    c.startTime = performance.now() - (state.lastBlurTime - c.startTime); 
  } 
  let timeElapsed = performance.now() - c.startTime;
  let progress = timeElapsed / c.fullTripMs;
  if (timeElapsed > c.fullTripMs) {
    outOfTime(canvas, ctx);
    return;
  }
  // formula for point on outer circle, from origin cx, cy:
  // x = cx + r * cos(a)
  // y = cy + r * sin(a)
  let angle = (360 * progress) - 90;
  var x = 50 + 100 * Math.cos(Math.PI / 180 * angle);
  var y = 50 + 100 * Math.sin(Math.PI / 180 * angle);
  ctx.beginPath();
  ctx.moveTo(50, 50);
  ctx.lineTo(50, -150);
  if (angle + 90 > 45) ctx.lineTo(150, -50);
  if (angle + 90 > 135) ctx.lineTo(150, 150);
  if (angle + 90 > 225) ctx.lineTo(-50, 150);
  if (angle + 90 > 315) ctx.lineTo(-50, -50);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  state.lastFrameTime = performance.now();
  c.drawCount++;
  window.requestAnimationFrame(function () { circleStep(canvas, ctx, c) });
}

function outOfTime(canvas, ctx){
  clearCanvas(canvas, ctx);
  updateStreak(false);
  state.wrongCount++;
  reanimate(canvas.id, "timeout");
  state.blockGuessesUntil = performance.now() + 600;
  if (state.count < 0) {
    // loop the animation; on initial load only
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

window.addEventListener("load", (event) => {
  resizeElements();
  resetSettings();
  loadSettings(true);  
  state.bestEver = localStorage.getItem("rankFileHiScore");
  el("bestEverNo").textContent = state.bestEver;
  let allChoices = document.getElementsByClassName("choice");
  for (let choice of allChoices) {
    choice.addEventListener("click", function () {
      if (state.blockGuessesUntil > performance.now()) return false;
      let gotRight = makeGuess(choice.textContent);
      reanimate(choice.id, "clickedDown");
    });
  }
  el("zoomIn").addEventListener("click", function (e) {
    zoom(1);
    saveSettings();
  });
  el("zoomOut").addEventListener("click", function (e) {
    zoom(-1);
    saveSettings();
  });
  el("resetHiScore").addEventListener("click", function (e) {
     resetHiScore();
  });
  el("resetSettings").addEventListener("click", function (e) {
    resetSettings(true, true);
  });
  document.addEventListener("click", function (e) {
    let target = e.target.dataset.target;
    if (target !== undefined) {
      e.preventDefault();
      el(target).scrollIntoView({ behavior: "smooth", block: "start"});
    }
    if (e.target.type == "radio") {
      if (e.target.name == "showPcs") {
        settings.showPcs = e.target.id;
        saveSettings();
      } else if (e.target.name == "constrain") {
        settings.constrain = e.target.id;
        resetCurrentScore();
        saveSettings();
        generateChoices();
      }
    }
    if (e.target.type == "checkbox") {
      settings[e.target.id] = e.target.checked;
      saveSettings();
    }
  });
  el("timeLimit").addEventListener("input", function(e) {
    settings.timeLimit = Number(e.target.value);
    if (settings.timeLimit == 1) settings.timeLimit = 1.5;
    saveSettings();
  });
  document.addEventListener("keypress", function (e) {
    if (e.key == "A" || e.key == "a" || e.key == "1") {
      el("choice1").click();
    } else if (e.key == "S" || e.key == "s" || e.key == "2") {
      el("choice2").click();
    } else if (e.key == "D" || e.key == "d" || e.key == "3") {
      el("choice3").click();
    }
  });
  window.addEventListener("focus", function (e) {
    // clear animations on window refocus to prevent oddities...
    state.focusCount++;
    if (this.performance.now() - state.lastFrameTime > settings.timeLimit * 1000) {
      clearCanvas(el("sq1"));
      clearCanvas(el("sq2"));
    }
  });
  window.addEventListener("blur", function (e) {
    state.lastBlurTime = this.performance.now();
  });
  generateChoices();
  startCircleTimer("sq1", 100);
  window.addEventListener("resize", function (event) {
    resizeElements();
  }, true);
});

function loadSettings(firstLoad) {
  let loaded = JSON.parse(localStorage.getItem("rankFileSettings"));
  if (loaded && loaded.exists) {
    for (const p in loaded) {
      // load one property at a time, so future additions won't break saves
      settings[p] = loaded[p];
    }
  }
  applySettings(firstLoad);
}

function saveSettings() {
  localStorage.setItem("rankFileSettings", JSON.stringify(settings));
  applySettings();
}

function applySettings(firstLoad) {
  if (firstLoad) el("board").classList.add("noAnim");
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
    const zoomLevel = Math.round(65 * settings.zoom);
    if (zoomLevel > 300 || zoomLevel < 15) return;
    let zoomPercent = Math.round(100 *(settings.zoom));
    el("zoomPercent").textContent = `${zoomPercent}%`;
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
  if (!firstLoad) el("board").classList.remove("noAnim");
}

function resetCurrentScore() {
  state.best = 0;
  state.streak = 0;
  updateStreak(false);
}

function resetHiScore() {
  if (confirm(`Are you sure you want to erase your 'All Time' Best Score?`)) {
    state.bestEver = 0;
    try {
      localStorage.setItem("rankFileHiScore", state.bestEver);
    } catch (e) {
      console.error(`Error setting high score in localStorage:`, e);
      alert("An error occurred accessing localStorage.");
    }
    el("bestEverNo").textContent = state.bestEver;
  }
}

function resetSettings(andSave = false, askConfirm = false) {
  if (askConfirm) {
    if (!confirm(`Reset all settings to default?`)) return;
  }
  settings = {
    exists: true, showQuads: false, flip: false, showPcs: "allPcs",
    constrain: "normal", sfx: true, showLabels: true, timeLimit: "5",
    zoom: 1
  };
  if (andSave) saveSettings();
}

function playSound(sound) {
  if (settings.sfx) {
    sfx[sound].play();
  }
}

function zoom(direction) {  // 1 or -1
  const stepSize = ((100 / 65) - 1) / 8;  // assuming 65vh width & 8 steps
  settings.zoom += (stepSize * direction);
}

function resizeElements() {
  // hack to size borders / outlines relative to container (using ems in CSS)
  let boardSz = el("board").clientWidth;
  let fontSz = Math.ceil(boardSz / 10);
  el("board").style.fontSize = `${fontSz}px`;
  // other CSS sizing...
  fontSz = Math.ceil(boardSz / 28);
  el("gameArea").style.fontSize = `${fontSz}px`;
  let howHigh = Math.ceil(boardSz / 6.5);
  el("multiChoice").style.height = `${howHigh}px`;
}
