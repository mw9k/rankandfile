let settings = {}, // loaded later
  state = { prevRank:0, prevFile:0, streak:0, best:0, bestEver:0, count:-1,
            wrongCount:0, blockGuessesUntil:0, lastFrameTime:0, focusCount:0,
            lastBlurTime:0 },
  sfx = { wrong: new Howl({ src: ["wrong.mp3"] }), 
          right: new Howl({ src: ["right.mp3"] }), 
          timeout: new Howl({ src: ["timeout.mp3"] }), 
          fanfare: new Howl({ src: ["fanfare.mp3"] }) };

function moveSq() {
  state.count++;
  chosenFile = newRndInt(0, 7, state.prevFile);
  chosenRank = newRndInt(0, 7, state.prevRank);
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

function newRndInt(lBound, uBound, prevRnd) {  
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
  for (let i = 0; i < 10000; i++) { // try up to 10k times
    let lockAxis, rndRank, rndFile, maxDist, lBound, uBound;
    if (settings.constrain == "normal") { // 50% chance to lock x/y axis...
      lockAxis = (Math.random() < .5) ? "x" : "y";  
    }
    // pseudorandomly select a file (x-axis coordinate):
    if (lockAxis == "x") {
      rndFile = numToFile(state.prevFile); // if locked axis, use actual answer
    } else {
      maxDist = (settings.constrain == "fileOnly") ? 3 : 1;
      lBound = (state.prevFile - maxDist >= 0) ? state.prevFile - maxDist : 0;
      uBound = (state.prevFile + maxDist <= 7) ? state.prevFile + maxDist : 7;
      rndFile = rndIntInRange(lBound, uBound);
      rndFile = numToFile(rndFile);
    }
    // pseudorandomly select a rank (y-axis coordinate):
    if (lockAxis == "y") {
      rndRank = state.prevRank; // if locked axis, use actual answer
    } else {
      maxDist = (settings.constrain == "rankOnly") ? 3 : 1;
      lBound = (state.prevRank - maxDist >= 0) ? state.prevRank - maxDist : 0;
      uBound = (state.prevRank + maxDist <= 7) ? state.prevRank + maxDist : 7;
      rndRank = rndIntInRange(lBound, uBound);
    }
    rndRank++;  // account for zero indexed
    let rndSq = constrain(rndFile, rndRank);
    if (choices.indexOf(rndSq) == -1) choices.push(rndSq);  // add if unique
    if (choices.length >= 3) break;
  }
  shuffleArray(choices);
  for (let [i, choice] of choices.entries()) {
    el(`choice${i + 1}`).textContent = choice;
  }
}

function el(elem) {	
  // custom shortener for document.getElementById()
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
  if (state.blockGuessesUntil > Date.now()) return false;
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
    localStorage.setItem("rankFileHiScore", state.bestEver);
  }
  el("streakNo").textContent = state.streak;
  el("bestNo").textContent = state.best;
  el("bestEverNo").textContent = state.bestEver;
}

function processAnswer(gotRight) {
  if (gotRight) {
    if (state.streak % 5 == 0) {
      playSound("fanfare");
      reanimate("streakNo", "bigBump", "bigBump");
    } else {
      playSound("right");
      reanimate("streakNo", "bump", "bump");
    }
    moveSq();
  } else {
    playSound("wrong");
    let sqOld = (state.count % 2 !== 0) ? "sq1" : "sq2";
    el(sqOld).classList = "sq";
    reanimate(sqOld, "gotWrong");
    state.wrongCount++;
  }
}

function startCircleTimer(sq="sq1", delay=300) {
  let canvas = el(sq),
      ctx = canvas.getContext("2d");
  ctx.strokeStyle = "#BA990D";
  ctx.lineWidth = 2;
  clearCanvas(canvas, ctx);
  setTimeout(function () {  // small delay before starting timer animation
    let c = { ticks: 200, startAngle: 270, startTime: Date.now(), drawCount: 0,
      fullTripMs: settings.timeLimit * 1000, count: state.count,
      wrongCount: state.wrongCount, focusCount: state.focusCount };
    c.tickSize = 360 / c.ticks;
    if (canvas.classList.contains("gotWrong") ||
        canvas.classList.contains("timeout")) { 
          return; // prevent drawing over wrong symbol or timeout symbol
     } 
    window.requestAnimationFrame(function () { circleStep(canvas, ctx, c) }) 
  }, delay);
}

function circleStep(canvas, ctx, c) {
  // formula for point on outer circle, from origin cx, cy:
  // x = cx + r * cos(a)
  // y = cy + r * sin(a)
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
  if (c.fullTripMs / 1000 != settings.timeLimit) {  
    // restart if settings changed mid-rotate...
    startCircleTimer(canvas.id, 100);
    return;
  }
  if (state.focusCount !== c.focusCount && state.lastBlurTime > c.startTime) {
    // redraw all if window lost focus; to avoid glitchiness...
    clearCanvas(canvas, ctx);
    c.drawCount = 0;
    c.focusCount = state.focusCount;
    // pick up where left off...
    c.startTime = Date.now() - (state.lastBlurTime - c.startTime); 
  } 
  let timeElapsed = Date.now() - c.startTime;
  if (timeElapsed > c.fullTripMs + 500) {
    // stop if dramatically over time somehow...
    outOfTime(canvas, ctx);
    return;
  }
  let ticksToDraw = (timeElapsed / c.fullTripMs * c.ticks) - c.drawCount;
  for (let i = 0; i <= ticksToDraw; i += c.tickSize) {
    ctx.beginPath();
    ctx.moveTo(50, 50);
    var x = 50 + 150 * Math.cos(Math.PI / 180 * (c.drawCount * c.tickSize + c.startAngle));
    var y = 50 + 150 * Math.sin(Math.PI / 180 * (c.drawCount * c.tickSize + c.startAngle));
    ctx.lineTo(x, y);
    ctx.stroke();
    c.drawCount++;
    if (c.drawCount >= c.ticks) {  // if time's up (& timer circle fully drawn)
      outOfTime(canvas, ctx); 
      return;
    }
  }
  state.lastFrameTime = Date.now();
  window.requestAnimationFrame(function () { circleStep(canvas, ctx, c) });
}

function outOfTime(canvas, ctx){
  clearCanvas(canvas, ctx);
  updateStreak(false);
  state.wrongCount++;
  reanimate(canvas.id, "timeout");
  state.blockGuessesUntil = Date.now() + 600;
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
      if (state.blockGuessesUntil > Date.now()) return false;
      let gotRight = makeGuess(choice.textContent);
      reanimate(choice.id, "clickedDown");
    });
  }
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
        saveSettings();
        generateChoices();
      }
    }
    if (e.target.type == "checkbox") {
      settings[e.target.id] = e.target.checked;
      saveSettings();
    }
    if (e.target.id == "resetHiScore") resetHiScore();
    if (e.target.id == "resetSettings") resetSettings(true);
  });
  document.addEventListener("input", function(e) {
    if (e.target.id == "timeLimit") {
      settings.timeLimit = e.target.value;
      saveSettings();
    }
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
    if (Date.now() - state.lastFrameTime > settings.timeLimit * 1000) {
      clearCanvas(el("sq1"));
      clearCanvas(el("sq2"));
    }
  });
  window.addEventListener("blur", function (e) {
    state.lastBlurTime = Date.now();
  });
  generateChoices();
  startCircleTimer("sq1", 100);
  window.addEventListener("resize", function (event) {
    resizeElements();
  }, true);
});

function shuffleArray(arr) { 
  // adapted from https://stackoverflow.com/questions/2450954
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

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
      el("timeLimit").value = settings.timeLimit;
      el("timeLimitLabel").innerHTML = `Time Limit: ${el("timeLimit").value}s`;
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

function resetHiScore() {
  if (confirm(`Are you sure you want to erase your 'All Time' Best Score?`)) {
    state.bestEver = 0;
    localStorage.setItem("rankFileHiScore", state.bestEver);
    el("bestEverNo").textContent = state.bestEver;
  }
}

function resetSettings(andSave = false) {
  settings = { exists: true, showQuads: false, flip: false, showPcs: "allPcs",
    constrain: "normal", sfx: true, showLabels: true, timeLimit: "5" };
  if (andSave) saveSettings();
}

function playSound(sound) {
  if (settings.sfx) {
    sfx[sound].play();
  }
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