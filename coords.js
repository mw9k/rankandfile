let settings = {}, // loaded later
    state = { prevRank:0, prevFile:0, streak:0, best:0, bestEver:0, count:-1 },
    sfx = { wrong: new Audio("wrong.wav"), right: new Audio("right.wav"),
            fanfare: new Audio("fanfare.wav")};

function moveSq() {
  state.count++;
  chosenFile = newRndInt(0, 7, state.prevFile);
  chosenRank = newRndInt(0, 7, state.prevRank);
  state.prevFile = chosenFile;
  state.prevRank = chosenRank;
  let sqOld = (state.count % 2) ? "sq2" : "sq1";
  let sqNew = (state.count % 2) ? "sq1" : "sq2";
  el(sqNew).style.setProperty('--file', chosenFile);
  el(sqNew).style.setProperty('--rank', chosenRank);
  reanimate(sqOld, "gotRight", "sq");
  reanimate(sqNew, "zoomInAndBounce", "sq");
  generateChoices();
}

function newRndInt(lBound, uBound, prevRnd) {  
  // choose a random int different from previous choice
  // bounds are 'inclusive'
  if (prevRnd > uBound || prevRnd < lBound) { // if prev rnd not within bounds 
    var newRnd = rndIntInRange(lBound, uBound); // straightforward rndIntInRange
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
  if (resetTo !== undefined) el(elem).classList = resetTo;
  el(elem).classList.remove(className);
  el(elem).offsetHeight;  // reset, allowing animation to replay
  el(elem).classList.add(className);
}

function generateChoices() {
  let choices = []; 
  // first add correct answer, then generate near-correct wrong answers...
  let correctChoice = constrain(numToFile(state.prevFile), state.prevRank + 1);
  choices.push(correctChoice); 
  for (let i = 0; i < 10000; i++) { // try up to 10k times
    // Pseudorandomly select a 'file' (x-axis coordinate):
    if (Math.random() < .75) {
      var rndFile = numToFile(state.prevFile); // ~75% chance of no change 
    } else {
      var maxDist = (settings.constrain == "fileOnly") ? 3 : 1;
      var lBound = (state.prevFile - maxDist >= 0) ? state.prevFile - maxDist : 0;
      var uBound = (state.prevFile + maxDist <= 7) ? state.prevFile + maxDist : 7;
      var rndFile = rndIntInRange(lBound, uBound);
      rndFile = numToFile(rndFile);
    }
    // Pseudorandomly select a 'rank' (y-axis coordinate):
    if (Math.random() < .75) {
      var rndRank = state.prevRank; // ~75% chance of no change 
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
  if (!guess.length) return false;
  if (settings.constrain == "rankOnly") { 
    guess = `${numToFile(state.prevFile)}${guess}`;
  } else if (settings.constrain == "fileOnly") {
    guess += state.prevRank + 1;
  }
  let guessedRank = parseInt(guess[1] - 1);
  let guessedFile = guess[0].toLowerCase().charCodeAt(0) - 97;
  let gotRight = (guessedRank == state.prevRank && guessedFile == state.prevFile);
  updateStreak(gotRight);
  processAnswer(gotRight);
}

function updateStreak(gotRight) {
  state.streak = (gotRight) ? state.streak + 1 : 0;
  if (state.streak > state.best) state.best = state.streak;
  if (state.best > state.bestEver) {
    state.bestEver = state.best;
    localStorage.setItem('rankFileHiScore', state.bestEver);
  }
  el("streakNo").textContent = state.streak;
  el("bestNo").textContent = state.best;
  el("bestEverNo").textContent = state.bestEver;
}

function processAnswer(gotRight) {
  if (gotRight) {
    if (!state.streak % 10) {
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
  }
}

window.addEventListener("load", (event) => {
  resetSettings();
  loadSettings(true);
  state.bestEver = localStorage.getItem('rankFileHiScore');
  el("bestEverNo").textContent = state.bestEver;
  let allChoices = document.getElementsByClassName("choice");
  for (let choice of allChoices) {
    choice.addEventListener("click", function () {
      let gotRight = makeGuess(choice.textContent);
      reanimate(choice.id, "clickedDown");
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
    localStorage.setItem('rankFileHiScore', state.bestEver);
    el("bestEverNo").textContent = state.bestEver;
  }
}

function resetSettings(andSave = false) {
  settings = { exists:true, showQuads:false, flip:false, showPcs:"kqOnly",
  constrain: "normal", sfx:true };
  if (andSave) saveSettings();
}

function playSound(sound) {
  if (settings.sfx) {
    sfx[sound].play();
  }
}