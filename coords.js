
let prevRank = 0, prevFile = 0, streak = 0, best = 0;


function moveSq() {
  chosenFile = newRand(0, 7);
  chosenRank = newRand(0, 7);
  prevFile = chosenFile;
  prevRank = chosenRank;
  el('sq').style.setProperty('--file', chosenFile);
  el('sq').style.setProperty('--rank', chosenRank);
  generateChoices();
}


function newRand(lBound, uBound, prevRnd) {
  // choose rnd int,  differently from previous choice. Try up to 10000x.
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
  choices.push(String(prevFile) + String(prevRank)); // add correct choice 1st
  for (let i = 0; i < 10000; i++) { // try 10k times
    let lBound = (prevFile - 1 >= 0) ? prevFile - 1: prevFile;
    let uBound = (prevFile + 1 <= 7) ? prevFile + 1 : prevFile;
    let rndFile = rndIntInRange(lBound, uBound);
    if (Math.random() < .75) rndFile = prevFile; // 75% chance of no change 

    lBound = (prevRank - 1 >= 0) ? prevRank - 1 : prevRank;
    uBound = (prevRank + 1 <= 7) ? prevRank + 1 : prevRank;
    rndRank = rndIntInRange(lBound, uBound);
    if (Math.random() < .75) rndRank = prevRank;

    let rndSq = String(rndFile) + String(rndRank);
    if (choices.indexOf(rndSq) == -1) choices.push(rndSq);  // add if unique
    if (choices.length >= 4) break;
  }

  shuffleArray(choices);

  for (let [i, choice] of choices.entries()) {
    let file = String.fromCharCode(parseInt(choice[0]) + 97);
    let rank = parseInt(choice[1]) + 1;
    el(`choice${i+1}`).textContent = `${file}${rank}`;
  }
}


function el(elem) {	// Custom shortener for document.getElementById()
  return document.getElementById(elem);
}


function fileToNum(rank) {
  return rank.toLowerCase().charCodeAt(0) - 96;
}


function makeGuess(guess) {
  if (!guess.length) return false;
  let guessedRank = parseInt(guess[1] - 1);
  let guessedFile = fileToNum(guess[0]) - 1;
  let gotRight = (guessedRank == prevRank && guessedFile == prevFile);
  if (gotRight) moveSq();
  updateStreak(gotRight);
  el("guess").value = "";
}

function updateStreak(gotRight) {
  streak = (gotRight) ? streak + 1 : 0;
  if (streak > best) best = streak;
  el("streakNo").textContent = streak;
  el("bestNo").textContent = best;
}

window.addEventListener("load", (event) => {
  el("board").classList.remove("justFlipped");

  let allChoices = document.getElementsByClassName("choice");

  for (let choice of allChoices) {
    choice.addEventListener("click", function () {
        makeGuess(choice.textContent);
    });
  }

  el("guess").addEventListener('input', function (e) {
    makeGuess(el("guess").value); 
    el("board").classList.remove("justFlipped");
  });
  el("guess").addEventListener('blur', function (e) {
    el("guess").focus({ preventScroll: true });
  });
  el("flip").addEventListener('input', function (e) {
    el("board").classList.add("justFlipped");
    if (el("flip").checked) {
      el("board").classList.add("flipped");
    } else el("board").classList.remove("flipped");
  });
  el("showQuads").addEventListener('input', function (e) {
    if (el("showQuads").checked) {
      el("quadrants").classList.remove("hidden");
    } else el("quadrants").classList.add("hidden");
  });
  
  const showPcsGroup = document.querySelectorAll('input[name="showPcs"]');
  for (let btn of showPcsGroup) {
    btn.addEventListener("click", () => {
      let choice = btn.id;
      if (choice == "noPcs") {
        el("board").classList.add("noPcs");
      } else {
        el("board").classList.remove("noPcs");
      }
    });
}
});

function shuffleArray(arr) { 
  // from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
