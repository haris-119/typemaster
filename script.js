/* ============================================================
   TypeMaster – Typing Speed Test  |  script.js
   Handles: passage rendering, keystroke tracking, timer,
            live stats, result screen, best score (LocalStorage)
   ============================================================ */

'use strict';

// ─── Text Passages Pool ───────────────────────────────────────────────────────
// A variety of short-to-medium passages for the user to practise on.
const PASSAGES = [
  "The quick brown fox jumps over the lazy dog near the riverbank on a sunny afternoon in autumn.",
  "Programming is the art of telling another human what one wants the computer to do in clear and precise terms.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts most in life.",
  "The best way to predict the future is to create it through hard work, dedication, and consistent effort.",
  "In the middle of every difficulty lies opportunity waiting to be discovered by those who dare to look.",
  "Typing fast is a skill that improves with deliberate practice every single day without exception.",
  "A journey of a thousand miles begins with a single step taken at the right moment in time.",
  "Reading makes a full man, conference a ready man, and writing an exact and precise man indeed.",
  "Technology is best when it brings people together and makes the world a smaller, friendlier place.",
  "Do not wait to strike till the iron is hot, but make it hot by striking it repeatedly and patiently."
];

// ─── LocalStorage Key ─────────────────────────────────────────────────────────
const BEST_SCORE_KEY = 'typemaster_best_score';

// ─── DOM References ───────────────────────────────────────────────────────────
const passageEl        = document.getElementById('passage');
const hiddenInput      = document.getElementById('hiddenInput');
const timerValueEl     = document.getElementById('timerValue');
const liveWpmEl        = document.getElementById('liveWpm');
const liveAccuracyEl   = document.getElementById('liveAccuracy');
const liveCorrectEl    = document.getElementById('liveCorrect');
const liveErrorsEl     = document.getElementById('liveErrors');
const resetBtn         = document.getElementById('resetBtn');
const durationBtns     = document.querySelectorAll('.duration-btn');
const testScreen       = document.getElementById('testScreen');
const resultScreen     = document.getElementById('resultScreen');
const resultWpmEl      = document.getElementById('resultWpm');
const resultAccuracyEl = document.getElementById('resultAccuracy');
const resultErrorsEl   = document.getElementById('resultErrors');
const resultEvalEl     = document.getElementById('resultEvaluation');
const newBestBadge     = document.getElementById('newBestBadge');
const tryAgainBtn      = document.getElementById('tryAgainBtn');
const bestScoreDisplay = document.getElementById('bestScoreDisplay');
const passageCard      = document.querySelector('.passage-card');

// ─── State Variables ──────────────────────────────────────────────────────────
let selectedDuration = 30;   // seconds chosen by user
let timeLeft         = 30;   // countdown counter
let timerInterval    = null; // setInterval handle
let testStarted      = false;
let testFinished     = false;
let currentPassage   = '';   // the active passage string
let userInput        = '';   // everything the user has typed so far
let startTime        = null; // Date.now() when typing began (for accurate WPM)
let totalErrors      = 0;    // cumulative wrong keystrokes

// ─── Utility: Pick a Random Passage ──────────────────────────────────────────
/**
 * Returns a random passage from the pool, different from the current one.
 */
function getRandomPassage() {
  const pool = PASSAGES.filter(p => p !== currentPassage);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Utility: LocalStorage Helpers ───────────────────────────────────────────
/**
 * Read the best score from LocalStorage.
 * Returns the stored integer or null if nothing is saved yet.
 */
function getBestScore() {
  const raw = localStorage.getItem(BEST_SCORE_KEY);
  return raw !== null ? parseInt(raw, 10) : null;
}

/**
 * Persist a new best score to LocalStorage.
 */
function saveBestScore(wpm) {
  localStorage.setItem(BEST_SCORE_KEY, String(wpm));
}

/**
 * Update the best-score badge in the header.
 */
function renderBestScore() {
  const best = getBestScore();
  bestScoreDisplay.textContent = best !== null ? `${best} WPM` : '— WPM';
}

// ─── Passage Rendering ────────────────────────────────────────────────────────
/**
 * Converts the passage string into individual <span class="char"> elements
 * so each character can be coloured correct/wrong independently.
 */
function renderPassage() {
  passageEl.innerHTML = '';
  for (let i = 0; i < currentPassage.length; i++) {
    const span = document.createElement('span');
    span.classList.add('char', 'pending');
    // Preserve spaces visually
    span.textContent = currentPassage[i];
    passageEl.appendChild(span);
  }
  // Put cursor on the very first character
  updateCursor(0);
}

/**
 * Place the blinking cursor class on the character at `index`.
 */
function updateCursor(index) {
  // Remove cursor from any existing character
  const prev = passageEl.querySelector('.cursor');
  if (prev) prev.classList.remove('cursor');

  const chars = passageEl.querySelectorAll('.char');
  if (index < chars.length) {
    chars[index].classList.add('cursor');
  }
}

// ─── Live Statistics Calculation ─────────────────────────────────────────────
/**
 * Calculate WPM based on correctly typed characters and elapsed time.
 * Standard formula: (correct_chars / 5) / minutes_elapsed
 */
function calcWpm(correctChars) {
  if (!startTime) return 0;
  const elapsedMinutes = (Date.now() - startTime) / 60000;
  if (elapsedMinutes === 0) return 0;
  return Math.round((correctChars / 5) / elapsedMinutes);
}

/**
 * Calculate accuracy as a percentage of correct keystrokes out of total.
 * total keystrokes = userInput.length (attempts so far)
 */
function calcAccuracy(correctChars) {
  const total = userInput.length;
  if (total === 0) return 100;
  return Math.round((correctChars / total) * 100);
}

/**
 * Count how many characters the user typed correctly so far.
 */
function countCorrect() {
  let correct = 0;
  for (let i = 0; i < userInput.length; i++) {
    if (userInput[i] === currentPassage[i]) correct++;
  }
  return correct;
}

/**
 * Refresh all four live stat displays.
 */
function updateLiveStats() {
  const correct = countCorrect();
  const wpm     = calcWpm(correct);
  const acc     = calcAccuracy(correct);

  liveWpmEl.textContent      = wpm;
  liveAccuracyEl.textContent = `${acc}%`;
  liveCorrectEl.textContent  = correct;
  liveErrorsEl.textContent   = totalErrors;
}

// ─── Passage Highlighting ─────────────────────────────────────────────────────
/**
 * Walk through every character span and apply correct/wrong/pending classes
 * based on the current userInput state.
 */
function highlightPassage() {
  const chars = passageEl.querySelectorAll('.char');
  chars.forEach((span, i) => {
    // Reset classes first
    span.classList.remove('correct', 'wrong', 'pending', 'cursor');

    if (i < userInput.length) {
      if (userInput[i] === currentPassage[i]) {
        span.classList.add('correct');
      } else {
        span.classList.add('wrong');
      }
    } else {
      span.classList.add('pending');
    }
  });
  // Move cursor to next untyped character
  updateCursor(userInput.length);
}

// ─── Timer ────────────────────────────────────────────────────────────────────
/**
 * Start the countdown timer.
 * Timer fires every second; when it hits 0 the test ends.
 */
function startTimer() {
  // Avoid duplicate intervals
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    timeLeft -= 1;
    timerValueEl.textContent = timeLeft;

    // Red pulsing warning when ≤ 5 seconds remain
    if (timeLeft <= 5) {
      timerValueEl.classList.add('warning');
    }

    if (timeLeft <= 0) {
      endTest();
    }
  }, 1000);
}

/**
 * Stop the countdown timer.
 */
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ─── Input Handling ───────────────────────────────────────────────────────────
/**
 * Called on every `input` event from hiddenInput.
 * Handles start-of-test detection, character tracking, error counting,
 * live highlight update, and auto-finish when passage is complete.
 */
function handleInput(e) {
  // Block input after test is finished
  if (testFinished) return;

  // Prevent typing beyond the passage length
  const newValue = hiddenInput.value;
  if (newValue.length > currentPassage.length) {
    hiddenInput.value = newValue.slice(0, currentPassage.length);
    return;
  }

  // ── Start test on first keystroke ──
  if (!testStarted && newValue.length > 0) {
    testStarted = true;
    startTime   = Date.now();
    startTimer();
  }

  // ── Track new errors (only on new characters added, not backspace) ──
  if (newValue.length > userInput.length) {
    // User typed a new character — check if it is wrong
    const idx = newValue.length - 1;
    if (newValue[idx] !== currentPassage[idx]) {
      totalErrors++;
    }
  }

  userInput = newValue;

  // Update visual highlighting
  highlightPassage();

  // Update live stats display
  updateLiveStats();

  // ── Auto-finish when the entire passage is typed ──
  if (userInput.length === currentPassage.length) {
    endTest();
  }
}

// ─── Evaluation Message ───────────────────────────────────────────────────────
/**
 * Returns a short encouraging evaluation string based on the WPM score.
 */
function getEvaluation(wpm) {
  if (wpm >= 100) return '🚀 Outstanding! You\'re a true TypeMaster!';
  if (wpm >= 80)  return '🔥 Excellent! Your speed is impressive!';
  if (wpm >= 60)  return '👍 Great job! You\'re well above average!';
  if (wpm >= 40)  return '💪 Good work! Keep practising to go faster!';
  if (wpm >= 20)  return '📈 Nice start! Consistent practice will boost you!';
  return '🌱 Keep going — every keystroke is a step forward!';
}

// ─── End Test ─────────────────────────────────────────────────────────────────
/**
 * Called when the timer runs out OR the user finishes the passage.
 * Stops the timer, calculates final results, checks best score, shows result screen.
 */
function endTest() {
  testFinished = true;
  stopTimer();

  // Hide cursor on passage
  const cursorSpan = passageEl.querySelector('.cursor');
  if (cursorSpan) cursorSpan.classList.remove('cursor');

  // Disable further input
  hiddenInput.blur();

  // ── Final calculations ──
  const correct  = countCorrect();
  const finalWpm = calcWpm(correct);
  const finalAcc = calcAccuracy(correct);

  // ── Best score check ──
  const prevBest = getBestScore();
  const isNewBest = prevBest === null || finalWpm > prevBest;
  if (isNewBest) {
    saveBestScore(finalWpm);
    renderBestScore();
  }

  // ── Populate result screen ──
  resultWpmEl.textContent      = finalWpm;
  resultAccuracyEl.textContent = `${finalAcc}%`;
  resultErrorsEl.textContent   = totalErrors;
  resultEvalEl.textContent     = getEvaluation(finalWpm);
  newBestBadge.style.display   = isNewBest ? 'inline-block' : 'none';

  // ── Switch screens ──
  testScreen.classList.add('hidden');
  resultScreen.classList.remove('hidden');
}

// ─── Reset / Restart ──────────────────────────────────────────────────────────
/**
 * Fully resets all state and UI back to the initial test screen.
 * Picks a new random passage.
 */
function resetTest() {
  // Stop any running timer
  stopTimer();

  // Reset state
  testStarted  = false;
  testFinished = false;
  userInput    = '';
  totalErrors  = 0;
  startTime    = null;
  timeLeft     = selectedDuration;

  // Reset hidden input
  hiddenInput.value = '';

  // Reset timer display
  timerValueEl.textContent = selectedDuration;
  timerValueEl.classList.remove('warning');

  // Reset live stats
  liveWpmEl.textContent      = '0';
  liveAccuracyEl.textContent = '100%';
  liveCorrectEl.textContent  = '0';
  liveErrorsEl.textContent   = '0';

  // Load a fresh passage
  currentPassage = getRandomPassage();
  renderPassage();

  // Show test screen, hide result screen
  resultScreen.classList.add('hidden');
  testScreen.classList.remove('hidden');

  // Focus the hidden input so typing can begin immediately
  hiddenInput.focus();
}

// ─── Duration Selection ───────────────────────────────────────────────────────
/**
 * Handle clicks on duration buttons (30s / 60s / 120s).
 * Updates the active button highlight and resets the test.
 */
function selectDuration(btn) {
  durationBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedDuration = parseInt(btn.dataset.duration, 10);
  // A duration change always restarts the test
  resetTest();
}

// ─── Focus Handling ───────────────────────────────────────────────────────────
/**
 * Clicking anywhere on the passage card focuses the hidden input
 * so users don't have to precisely click the input field.
 */
function onPassageCardClick() {
  if (!testFinished) {
    hiddenInput.focus();
  }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
// Typing input
hiddenInput.addEventListener('input', handleInput);

// Prevent keyboard shortcuts / copy-paste that could corrupt the hidden input value
hiddenInput.addEventListener('paste', e => e.preventDefault());
hiddenInput.addEventListener('cut',   e => e.preventDefault());

// Reset button on the test screen
resetBtn.addEventListener('click', resetTest);

// Try Again button on the result screen
tryAgainBtn.addEventListener('click', resetTest);

// Duration buttons
durationBtns.forEach(btn => {
  btn.addEventListener('click', () => selectDuration(btn));
});

// Passage card click-to-focus
passageCard.addEventListener('click', onPassageCardClick);

// ─── Initialise ───────────────────────────────────────────────────────────────
/**
 * Run once on page load:
 *  1. Show the best score from LocalStorage.
 *  2. Load the first random passage and render it.
 *  3. Focus the hidden input.
 */
(function init() {
  renderBestScore();
  currentPassage = getRandomPassage();
  renderPassage();
  hiddenInput.focus();
}());
