let settings = {}, 
  glb = { prevRank:0, prevFile:0, streak:0, best:0, bestEver:0, count:0 },
  sfxWrong = new Audio("wrong.wav"), sfxRight = new Audio("right.wav");

function moveSq() {
  glb.count++;
  chosenFile = newRand(0, 7, glb.prevFile);
  chosenRank = newRand(0, 7, glb.prevRank);
  glb.prevFile = chosenFile;
  glb.prevRank = chosenRank;
  let sqOld = (glb.count % 2 == 0) ? "sq1" : "sq2";
  let sqNew = (glb.count % 2 == 0) ? "sq2" : "sq1";
  el(sqOld).classList.remove("gotRight", "bouncing", "hider");
  el(sqNew).classList.remove("gotRight", "bouncing", "hider");
  el(sqNew).style.setProperty('--file', chosenFile);
  el(sqNew).style.setProperty('--rank', chosenRank);
  el(sqOld).offsetHeight; // reflow element; req. to restart animation
  el(sqNew).offsetHeight;
  el(sqOld).classList.add("gotRight");
  el(sqNew).classList.add("bouncing");
  generateChoices();
}


function newRand(lBound, uBound, prevRnd) {
  // choose a random int different from previous choice. Try up to 10000x.
  for (let i = 0; i < 10000; i++) {
    var newRnd = rndIntInRange(lBound, uBound);
    if (newRnd !== prevRnd) break;
  }
  return newRnd;
}

function rndIntInRange(lBound, uBound) {
  return Math.floor(Math.random() * (uBound - lBound + 1)) + lBound;
}


function generateChoices() {
  let choices = [];
  let correctChoice = constrain(numToFile(glb.prevFile), glb.prevRank + 1);
  choices.push(correctChoice); 
  
  for (let i = 0; i < 10000; i++) { // try 10k times
    let maxDist = (settings.constrain == "fileOnly") ? 3 : 1;
    let lBound = (glb.prevFile - maxDist >= 0) ? glb.prevFile - maxDist: 0;
    let uBound = (glb.prevFile + maxDist <= 7) ? glb.prevFile + maxDist : 7;
    let rndFile = rndIntInRange(lBound, uBound);
    rndFile = numToFile(rndFile);
    if (Math.random() < .75) rndFile = numToFile(glb.prevFile); // ~75% chance of no change 
    
    maxDist = (settings.constrain == "rankOnly") ? 3 : 1;
    lBound = (glb.prevRank - maxDist >= 0) ? glb.prevRank - maxDist : 0;
    uBound = (glb.prevRank + maxDist <= 7) ? glb.prevRank + maxDist : 7;
    let rndRank = rndIntInRange(lBound, uBound);
    if (Math.random() < .75) rndRank = glb.prevRank; // ~75% chance of no change 
    rndRank++;
    
    let rndSq = constrain(rndFile, rndRank);
    if (choices.indexOf(rndSq) == -1) choices.push(rndSq);  // add if unique
    if (choices.length >= 3) break;
  }

  shuffleArray(choices);
  for (let [i, choice] of choices.entries()) {
    el(`choice${i + 1}`).textContent = choice;
  }
}


function el(elem) {	// Custom shortener for document.getElementById()
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
  guess = String(guess).replace(/\s/g, ""); // trim whitespace
  if (!guess.length) return false;
  if (settings.constrain == "rankOnly") {
    guess = `${numToFile(glb.prevFile)}${guess}`;
  } else if (settings.constrain == "fileOnly") {
    guess += glb.prevRank + 1;
  }
  let guessedRank = parseInt(guess[1] - 1);
  let guessedFile = guess[0].toLowerCase().charCodeAt(0) - 97;
  let gotRight = (guessedRank == glb.prevRank && guessedFile == glb.prevFile);
  if (gotRight) {
    if (settings.sfx) sfxRight.play();
    moveSq();
  } else {
    if (settings.sfx) sfxWrong.play();
    if (settings.flashScreen) flashWrong();
  } 
  updateStreak(gotRight);
}

function updateStreak(gotRight) {
  glb.streak = (gotRight) ? glb.streak + 1 : 0;
  if (glb.streak > glb.best) glb.best = glb.streak;
  if (glb.best > glb.bestEver) {
    glb.bestEver = glb.best;
    localStorage.setItem('rankFileHiScore', glb.bestEver);
  }
  el("streakNo").textContent = glb.streak;
  el("bestNo").textContent = glb.best;
  el("bestEverNo").textContent = glb.bestEver;
}

function flashWrong() {
  el("board").classList.add("flashWrong");
  setTimeout(function () { 
    el("board").classList.remove("flashWrong");
  }, 300);
}


window.addEventListener("load", (event) => {
  resetSettings();
  loadSettings(true);
  glb.bestEver = localStorage.getItem('rankFileHiScore');
  el("bestEverNo").textContent = glb.bestEver;
  let allChoices = document.getElementsByClassName("choice");
  for (let choice of allChoices) {
    choice.addEventListener("click", function () {
        makeGuess(choice.textContent);
    });
  }
  window.addEventListener("click", function (e) {
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
  document.addEventListener("keypress", function (event) {
    if (event.key == "A" || event.key == "a" || event.key == "1") {
      el("choice1").click();
    } else if (event.key == "S" || event.key == "s" || event.key == "2") {
      el("choice2").click();
    } else if (event.key == "D" || event.key == "d" || event.key == "3") {
      el("choice3").click();
    }
  });
  generateChoices();
});


function shuffleArray(arr) { 
  // adapted from https://stackoverflow.com/questions/2450954
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function loadSettings(firstLoad) {
  let loaded = JSON.parse(localStorage.getItem('rankFileSettings'));
  if (loaded && loaded.exists) {
    settings = loaded;
    applySettings(firstLoad);
  }
}

function saveSettings() {
  localStorage.setItem('rankFileSettings', JSON.stringify(settings));
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
  if (settings.flip) {
    el("board").classList.add("flipped");
    el("flip").checked = true;
  } else {
    el("board").classList.remove("flipped");
    el("flip").checked = false;
  }
  el("board").classList.remove("noPcs", "allPcs", "kqOnly");
  el("board").classList.add(settings.showPcs);
  if (el(settings.showPcs)) {
    el(settings.showPcs).checked = true;
  }
  if (el(settings.constrain)) {
    el(settings.constrain).checked = true;
  }
  if (settings.sfx) el("sfx").checked = true;
  if (settings.flashScreen) el("flashScreen").checked = true;
  if (!firstLoad) el("board").classList.remove("noAnim");
}

function resetHiScore() {
  if (confirm('Are you sure you want to erase your saved High Score?')) {
    glb.bestEver = 0;
    localStorage.setItem('rankFileHiScore', glb.bestEver);
    el("bestEverNo").textContent = glb.bestEver;
  }
}

function resetSettings(andSave = false) {
  settings = { exists:true, showQuads:false, flip:false, showPcs:"allPcs",
  constrain: "normal", sfx:true, flashScreen:true };
  if (andSave) saveSettings();
}

// https://jfxr.frozenfractal.com/#%7B%22_version%22%3A1%2C%22_name%22%3A%22Pickup%2Fcoin%2098%22%2C%22_locked%22%3A%5B%5D%2C%22sampleRate%22%3A44100%2C%22attack%22%3A0%2C%22sustain%22%3A0.03%2C%22sustainPunch%22%3A0%2C%22decay%22%3A0.35000000000000003%2C%22tremoloDepth%22%3A0%2C%22tremoloFrequency%22%3A10%2C%22frequency%22%3A800%2C%22frequencySweep%22%3A0%2C%22frequencyDeltaSweep%22%3A0%2C%22repeatFrequency%22%3A0%2C%22frequencyJump1Onset%22%3A15%2C%22frequencyJump1Amount%22%3A95%2C%22frequencyJump2Onset%22%3A25%2C%22frequencyJump2Amount%22%3A35%2C%22harmonics%22%3A0%2C%22harmonicsFalloff%22%3A0.5%2C%22waveform%22%3A%22whistle%22%2C%22interpolateNoise%22%3Atrue%2C%22vibratoDepth%22%3A0%2C%22vibratoFrequency%22%3A10%2C%22squareDuty%22%3A45%2C%22squareDutySweep%22%3A90%2C%22flangerOffset%22%3A0%2C%22flangerOffsetSweep%22%3A0%2C%22bitCrush%22%3A16%2C%22bitCrushSweep%22%3A0%2C%22lowPassCutoff%22%3A22050%2C%22lowPassCutoffSweep%22%3A0%2C%22highPassCutoff%22%3A0%2C%22highPassCutoffSweep%22%3A0%2C%22compression%22%3A1%2C%22normalization%22%3Atrue%2C%22amplification%22%3A100%7D
// https://jfxr.frozenfractal.com/#%7B%22_version%22%3A1%2C%22_name%22%3A%22Pickup%2Fcoin%2083%22%2C%22_locked%22%3A%5B%5D%2C%22sampleRate%22%3A44100%2C%22attack%22%3A0%2C%22sustain%22%3A0.03%2C%22sustainPunch%22%3A0%2C%22decay%22%3A0.25%2C%22tremoloDepth%22%3A0%2C%22tremoloFrequency%22%3A10%2C%22frequency%22%3A219.8422641453093%2C%22frequencySweep%22%3A0%2C%22frequencyDeltaSweep%22%3A0%2C%22repeatFrequency%22%3A0%2C%22frequencyJump1Onset%22%3A30%2C%22frequencyJump1Amount%22%3A-30%2C%22frequencyJump2Onset%22%3A66%2C%22frequencyJump2Amount%22%3A-60%2C%22harmonics%22%3A0%2C%22harmonicsFalloff%22%3A0.5%2C%22waveform%22%3A%22breaker%22%2C%22interpolateNoise%22%3Atrue%2C%22vibratoDepth%22%3A0%2C%22vibratoFrequency%22%3A10%2C%22squareDuty%22%3A35%2C%22squareDutySweep%22%3A-80%2C%22flangerOffset%22%3A0%2C%22flangerOffsetSweep%22%3A0%2C%22bitCrush%22%3A16%2C%22bitCrushSweep%22%3A0%2C%22lowPassCutoff%22%3A22050%2C%22lowPassCutoffSweep%22%3A0%2C%22highPassCutoff%22%3A0%2C%22highPassCutoffSweep%22%3A0%2C%22compression%22%3A1%2C%22normalization%22%3Atrue%2C%22amplification%22%3A180%7D
// https://jfxr.frozenfractal.com/#%7B%22_version%22%3A1%2C%22_name%22%3A%22Pickup%2Fcoin%20148%22%2C%22_locked%22%3A%5B%5D%2C%22sampleRate%22%3A44100%2C%22attack%22%3A0%2C%22sustain%22%3A0.03%2C%22sustainPunch%22%3A80%2C%22decay%22%3A0.16%2C%22tremoloDepth%22%3A0%2C%22tremoloFrequency%22%3A10%2C%22frequency%22%3A200%2C%22frequencySweep%22%3A0%2C%22frequencyDeltaSweep%22%3A0%2C%22repeatFrequency%22%3A0%2C%22frequencyJump1Onset%22%3A20%2C%22frequencyJump1Amount%22%3A60%2C%22frequencyJump2Onset%22%3A66%2C%22frequencyJump2Amount%22%3A60%2C%22harmonics%22%3A0%2C%22harmonicsFalloff%22%3A0.5%2C%22waveform%22%3A%22sine%22%2C%22interpolateNoise%22%3Atrue%2C%22vibratoDepth%22%3A0%2C%22vibratoFrequency%22%3A10%2C%22squareDuty%22%3A95%2C%22squareDutySweep%22%3A30%2C%22flangerOffset%22%3A0%2C%22flangerOffsetSweep%22%3A0%2C%22bitCrush%22%3A16%2C%22bitCrushSweep%22%3A0%2C%22lowPassCutoff%22%3A22050%2C%22lowPassCutoffSweep%22%3A0%2C%22highPassCutoff%22%3A0%2C%22highPassCutoffSweep%22%3A0%2C%22compression%22%3A1%2C%22normalization%22%3Atrue%2C%22amplification%22%3A100%7D
// https://sfxr.me/#34T6Pkvwr51Zy9LqyfpNkXie6QzPy95KdPia3piS2fBwL4R5aMKZ8GPqxhuUNeYEhBik1CSzBXBEjfH77YSnLPvfGoHwsYafNzJKEhruNhZGCgRinbK9beAL7
//https://sfxr.me/#11111GshsWfnMjhqHAkCpmyqTVjKSVZ4Mboik7xvFocEtLmuY6E9aedyZG5RvwMYoeQvm7ZKUCxdfYzXhx7ACnCbqidLtcRwJ2yKPpNF6tVCP8mzshHQ4Ew9
//https://sfxr.me/#34T6PkuaeGhaQ3WFNRp1gAKh1HixSXGPMRU1wbf6dMq5zuXxxXYYESQEAEfcWEyPD1HQqqja6XYRd4ChnGKQSjMwWBLba2Mm8LUwokXPi5JVz8Bf7M28bHb5H