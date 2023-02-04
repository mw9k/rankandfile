let prevRank = 0, prevFile = 0, streak = 0, best = 0;
let settings = { exists:true, showQuads:true, flipped:false, showPcs:"kqOnly",
  constrain:"normal" };

function moveSq() {
  loadSettings();
  el("board").classList.remove("justFlipped");
  chosenFile = newRand(0, 7, prevFile);
  chosenRank = newRand(0, 7, prevRank);
  prevFile = chosenFile;
  prevRank = chosenRank;
  el('sq').style.setProperty('--file', chosenFile);
  el('sq').style.setProperty('--rank', chosenRank);
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
  let correctChoice = constrain(String.fromCharCode(prevFile + 97), prevRank + 1);
  choices.push(correctChoice); 
  
  for (let i = 0; i < 10000; i++) { // try 10k times
    let maxDist = (settings.constrain == "fileOnly") ? 3 : 1;
    let lBound = (prevFile - maxDist >= 0) ? prevFile - maxDist: 0;
    let uBound = (prevFile + maxDist <= 7) ? prevFile + maxDist : 7;
    let rndFile = rndIntInRange(lBound, uBound);
    rndFile = String.fromCharCode(rndFile + 97);
    if (Math.random() < .75) rndFile = String.fromCharCode(prevFile + 97); // ~75% chance of no change 
    
    maxDist = (settings.constrain == "rankOnly") ? 3 : 1;
    lBound = (prevRank - maxDist >= 0) ? prevRank - maxDist : 0;
    uBound = (prevRank + maxDist <= 7) ? prevRank + maxDist : 7;
    let rndRank = rndIntInRange(lBound, uBound);
    if (Math.random() < .75) rndRank = prevRank; // ~75% chance of no change 
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


function constrain(file, rank) {
  if (settings.constrain == "rankOnly") file = "";
  if (settings.constrain == "fileOnly") rank = "";
  return `${file}${rank}`;
}

function el(elem) {	// Custom shortener for document.getElementById()
  return document.getElementById(elem);
}


function makeGuess(guess) {
  guess = String(guess).replace(/\s/g, ""); // trim whitespace
  if (!guess.length) return false;
  if (settings.constrain == "rankOnly") {
    guess = `${String.fromCharCode(prevFile + 97)}${guess}`;
  } else if (settings.constrain == "fileOnly") {
    guess += prevRank + 1;
  }
  let guessedRank = parseInt(guess[1] - 1);
  let guessedFile = guess[0].toLowerCase().charCodeAt(0) - 97;
  let gotRight = (guessedRank == prevRank && guessedFile == prevFile);
  if (gotRight) {
    moveSq();
  } else flashWrong();
  updateStreak(gotRight);
}


function updateStreak(gotRight) {
  streak = (gotRight) ? streak + 1 : 0;
  if (streak > best) best = streak;
  el("streakNo").textContent = streak;
  el("bestNo").textContent = best;
}

function flashWrong() {
  document.body.style.backgroundColor = "red";
  setTimeout(function () { document.body.style.backgroundColor = "initial"; }, 300);
}


window.addEventListener("load", (event) => {
  loadSettings();
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
  });
  el("flip").addEventListener('input', function (e) {
    settings.flipped = e.target.checked;
    saveSettings();
  });
  el("showQuads").addEventListener('input', function (e) {
    settings.showQuads = e.target.checked;
    saveSettings();
  });
  document.addEventListener("keypress", function (event) {
    if (event.key == "A" || event.key == "a") {
      el("choice1").click();
    } else if (event.key == "S" || event.key == "s") {
      el("choice2").click();
    } else if (event.key == "D" || event.key == "d") {
      el("choice3").click();
    }
  });
  generateChoices();
});

function shuffleArray(arr) { 
  // adapted from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function loadSettings() {
  let loaded = JSON.parse(localStorage.getItem('rankFileSettings'));
  if (loaded && loaded.exists) {
    settings = loaded;
    applySettings();
  }
}

function saveSettings() {
  localStorage.setItem('rankFileSettings', JSON.stringify(settings));
  applySettings();
}

function applySettings() {
  if (settings.showQuads) {
    el("quadrants").classList.remove("hidden");
    el("showQuads").setAttribute("checked", "");
  } else {
    el("quadrants").classList.add("hidden");
    el("showQuads").removeAttribute("checked");
  }
  el("board").classList.add("justFlipped");
  if (settings.flipped) {
    el("board").classList.add("flipped");
    el("flip").setAttribute("checked", "");
  } else {
    el("board").classList.remove("flipped");
    el("flip").removeAttribute("checked");
  }
  el("board").classList.remove("noPcs");
  el("board").classList.remove("allPcs");
  el("board").classList.remove("kqOnly");
  el("board").classList.add(settings.showPcs);
  if (el(settings.showPcs)) {
    el(settings.showPcs).setAttribute("checked", "");
  }
  if (el(settings.constrain)) {
    el(settings.constrain).setAttribute("checked", "");
  }
}

function resetSettings() {

}
