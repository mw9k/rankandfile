
let prevRank = 0, prevFile = 0;


window.addEventListener("click", (event) => {
  // listen();

});




function moveSq() {
  const ranks = [1, 2, 3, 4, 5, 6, 7, 8];
  const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  chosenFile = randomChoice(files, prevFile);
  prevFile = chosenFile;
  chosenRank = randomChoice(ranks, prevRank);
  prevRank = chosenRank;
  // document.body.append(files[chosenFile], ranks[chosenRank], ", ");

  el('sq').style.setProperty('--file', chosenFile);
  el('sq').style.setProperty('--rank', chosenRank);
  generateOptions();

}


function randomChoice(arr, prevChoice) {
  // choose random member from array,
  // also choosing differently from previous choice.
  // try up to 1000x.
  let choice = undefined;
  for (let i = 0; i < 1000; i++) {
    choice = Math.floor(Math.random() / (1 / arr.length));
    if (choice !== prevChoice) break;
  }
  return choice;
}

function randomIntInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


function generateOptions() {
  let options = [];
  options.push(String(prevFile)+String(prevRank));
  for (let i = 0; i < 10000; i++) {
    let lBound = prevFile;
    if (lBound - 1 >= 0) lBound--;
    let uBound = prevFile;
    if (uBound + 1 <= 7) uBound++;
    let rndFile = randomIntInRange(lBound, uBound);
    if (Math.random() < .75) rndFile = prevFile;

    lBound = prevRank;
    if (lBound - 1 >= 0) lBound--;
    uBound = prevRank;
    if (uBound + 1 <= 7) uBound++;
    let rndRank = randomIntInRange(lBound, uBound);
    if (Math.random() < .75) rndRank = prevRank;

    let rndSq = String(rndFile) + String(rndRank);
    if (options.indexOf(rndSq) == -1) {
      options.push(rndSq);
    }
    if (options.length >= 4) break;
  }

  shuffleArray(options);

  for (let [i, option] of options.entries()) {
    let file = String.fromCharCode(parseInt(option[0]) + 65);
    let rank = parseInt(option[1]) + 1;
    el(`option${i+1}`).innerHTML = `${file}${rank}`;
  }
}


function el(elem) {	// Custom shortener for document.getElementById()
  return document.getElementById(elem);
}

function makeGuess(guess) {
  let guessedRank = parseInt(guess[1] - 1);
  let guessedFile = undefined;
  if (guess.length) {
    guessedFile = guess[0].toLowerCase().charCodeAt(0) - 97;
  } 
  if ( guessedRank == prevRank && guessedFile == prevFile) {
    el("guess").value = "";
    moveSq();
  } 
}

window.addEventListener("load", (event) => {
  el("board").classList.remove("justFlipped");

  let allOptions = document.getElementsByClassName('opt');

  for (let opt of allOptions) {
    opt.addEventListener("click", function () {
        makeGuess(opt.innerHTML);
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


function listen() {
  const SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
  const SpeechGrammarList = window.SpeechGrammarList || webkitSpeechGrammarList;
  const SpeechRecognitionEvent = window.SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

  const sqs = [
    'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8',
    'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8',
    'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8',
    'd1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8',
    'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8',
    'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8',
  ];

  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 20;

  recognition.start();
  console.log('Ready to receive speech.');

  recognition.onresult = (event) => {
    let heard = event.results[event.resultIndex][0].transcript;
    for (let f of event.results[event.resultIndex]) {
      f = String(f.transcript).replace(/\s/g, "");
      console.log("hey, it's..." + f);
      if (sqs.indexOf(f) > -1) {
        makeGuess(f);
      }
    }
  }

}


function shuffleArray(array) { 
  // from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
