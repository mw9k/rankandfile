let settings = {}, 
  glb = { prevRank:0, prevFile:0, streak:0, best:0, bestEver:0, count:-1 },
  sfx = { wrong: new Audio("wrong.wav"), right: new Audio("right.wav") ,
          fanfare: new Audio("fanfare.wav")};

function moveSq() {
  glb.count++;
  chosenFile = newRand(0, 7, glb.prevFile);
  chosenRank = newRand(0, 7, glb.prevRank);
  glb.prevFile = chosenFile;
  glb.prevRank = chosenRank;
  let sqOld = (glb.count % 2) ? "sq2" : "sq1";
  let sqNew = (glb.count % 2) ? "sq1" : "sq2";
  el(sqNew).style.setProperty('--file', chosenFile);
  el(sqNew).style.setProperty('--rank', chosenRank);
  reanimate(sqOld, "gotRight", "sq");
  reanimate(sqNew, "zoomInAndBounce", "sq");
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

function reanimate(elem, className, resetTo) { 
  if (resetTo !== undefined) el(elem).classList = resetTo;
  el(elem).classList.remove(className);
  el(elem).offsetHeight;  // reset, allowing animation to replay
  el(elem).classList.add(className);
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
    if (Math.random() < .75) {
      rndFile = numToFile(glb.prevFile); // ~75% chance of no change 
    }
    
    maxDist = (settings.constrain == "rankOnly") ? 3 : 1;
    lBound = (glb.prevRank - maxDist >= 0) ? glb.prevRank - maxDist : 0;
    uBound = (glb.prevRank + maxDist <= 7) ? glb.prevRank + maxDist : 7;
    let rndRank = rndIntInRange(lBound, uBound);
    if (Math.random() < .75) {
      rndRank = glb.prevRank; // ~75% chance of no change 
    }
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
  if (!guess.length) return false;
  if (settings.constrain == "rankOnly") { 
    guess = `${numToFile(glb.prevFile)}${guess}`;
  } else if (settings.constrain == "fileOnly") {
    guess += glb.prevRank + 1;
  }
  let guessedRank = parseInt(guess[1] - 1);
  let guessedFile = guess[0].toLowerCase().charCodeAt(0) - 97;
  let gotRight = (guessedRank == glb.prevRank && guessedFile == glb.prevFile);
  updateStreak(gotRight);
  processAnswer(gotRight);
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

function processAnswer(gotRight) {
  if (gotRight) {
    if (glb.streak % 10) {
      if (settings.sfx) sfx.right.play();
      reanimate("streakNo", "bump", "bump");
    } else {
      if (settings.sfx) sfx.fanfare.play();
      reanimate("streakNo", "bigBump", "bigBump");
    }
    moveSq();
  } else {
    if (settings.sfx) sfx.wrong.play();
    let sqOld = (glb.count % 2 !== 0) ? "sq1" : "sq2";
    el(sqOld).classList = "sq";
    reanimate(sqOld, "gotWrong");
  }
}

window.addEventListener("load", (event) => {
  resetSettings();
  loadSettings(true);
  glb.bestEver = localStorage.getItem('rankFileHiScore');
  el("bestEverNo").textContent = glb.bestEver;
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
    glb.bestEver = 0;
    localStorage.setItem('rankFileHiScore', glb.bestEver);
    el("bestEverNo").textContent = glb.bestEver;
  }
}

function resetSettings(andSave = false) {
  settings = { exists:true, showQuads:false, flip:false, showPcs:"allPcs",
  constrain: "normal", sfx:true };
  if (andSave) saveSettings();
}