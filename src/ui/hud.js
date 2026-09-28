// ---------------------------------------------------------------------------
// DOM HUD
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

export function updateRoundUI(round, totalRounds, score) {
  $('round-counter').textContent = `Round ${round} / ${totalRounds}`;
  $('score-display').textContent = `Goals: ${score} / ${totalRounds}`;
}

export function updateWindUI(windSpeed, windDirDeg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dirName = dirs[Math.round(windDirDeg / 45) % 8];
  $('wind-text').textContent = `Wind: ${windSpeed.toFixed(1)} m/s ${dirName}`;

  const arrowEl = $('wind-arrow-ptr');
  if (!arrowEl) return;
  arrowEl.style.transform = `translate(0, -50%) rotate(${windDirDeg - 90}deg)`;

  let color;
  if (windSpeed <= 2) {
    color = '#4caf50';
  } else if (windSpeed <= 5) {
    const t = (windSpeed - 2) / 3;
    color = `rgb(${Math.round(76 + t * 179)},${Math.round(175 + t * 60)},${Math.round(80 - t * 80)})`;
  } else {
    const t = Math.min((windSpeed - 5) / 3, 1);
    color = `rgb(255,${Math.round(235 - t * 200)},${Math.round(t * 30)})`;
  }
  arrowEl.style.background = color;
  arrowEl.style.color = color;
}

export function updatePowerUI(p) {
  const pct = Math.round(p * 100);
  $('power-bar-fill').style.width = pct + '%';
  $('power-value').textContent = pct + '%';
}

export function setInstructions(text) {
  $('instructions').textContent = text;
}

export function showMessage(text, color) {
  const el = $('message');
  el.textContent = text;
  el.style.color = color;
  el.style.display = 'block';
}

export function hideMessage() {
  $('message').style.display = 'none';
}

export function showGameOver(score, totalRounds) {
  $('final-score').textContent = `You scored ${score} / ${totalRounds}`;
  $('game-over').style.display = 'flex';
}

export function hideGameOver() {
  $('game-over').style.display = 'none';
}

export function onPlayAgain(handler) {
  $('play-again-btn').addEventListener('click', handler);
}
