// ---------------------------------------------------------------------------
// DOM HUD — shows only what the current phase needs (see data-phase in CSS)
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

const root = $('hud');

export function setPhase(phase) {
  root.dataset.phase = phase;
}

export function setDevice(device) {
  root.dataset.device = device;
}

export function setHandedness(hand) {
  root.dataset.hand = hand;
}

export function setScore(kick, total, points) {
  $('hud-kick').textContent = total ? `Kick ${kick}/${total}` : `Kick ${kick}`;
  $('hud-points').textContent = `${points} pts`;
}

/**
 * @param {{label: string, level: number, levelWord: string}} desc  from describeWind()
 * @param {number} arrowDeg  screen rotation (0 = toward the posts)
 */
export function setWind(desc, arrowDeg) {
  $('wind-label').textContent = desc.label;
  $('wind-word').textContent = desc.levelWord;
  [...$('wind-bars').children].forEach((bar, i) => bar.classList.toggle('on', i < desc.level));
  $('wind-arrow').style.transform = `rotate(${arrowDeg}deg)`;
  $('wind-arrow').style.opacity = desc.level === 0 ? '0.25' : '1';
  $('wind').setAttribute('aria-label', `Wind: ${desc.label}. Strength ${desc.level} of 5, ${desc.levelWord}.`);
}

export function setWindArrow(arrowDeg) {
  $('wind-arrow').style.transform = `rotate(${arrowDeg}deg)`;
}

export function setCaption(text, hint = '') {
  $('caption-text').textContent = text ?? '';
  $('caption-hint').textContent = hint;
}

export function setTeeInfo(text, hint) {
  $('tee-info').textContent = text;
  if (hint !== undefined) $('tee-hint').textContent = hint;
}

export function setAimInfo(text, hint) {
  $('aim-info').textContent = text;
  if (hint !== undefined) $('aim-hint').textContent = hint;
}

export function setElevation(deg) {
  const slider = $('elev-slider');
  if (Number(slider.value) !== Math.round(deg)) slider.value = String(Math.round(deg));
  $('elev-value').textContent = `${Math.round(deg)}°`;
}

export function onElevationInput(fn) {
  const slider = $('elev-slider');
  slider.addEventListener('input', (e) => fn(Number(e.target.value)));
  // After a touch/mouse drag, hand keys back to the game (arrows aim again)
  slider.addEventListener('pointerup', () => slider.blur());
}

// Pointer-activated HUD buttons shouldn't keep keyboard focus either
for (const id of ['btn-tee', 'btn-next', 'btn-pause']) {
  $(id).addEventListener('pointerup', (e) => e.currentTarget.blur());
}

export function onTeeConfirm(fn) {
  $('btn-tee').addEventListener('click', fn);
}

export function setMeter(on, power = 0) {
  root.classList.toggle('meter-on', on);
  const pct = Math.round(power * 100);
  $('meter-fill').style.width = `${pct}%`;
  $('meter-value').textContent = `${pct}%`;
}

/** Slingshot feedback line from the drag origin to the finger, or null to hide. */
export function setDrag(drag) {
  root.classList.toggle('dragging', !!drag);
  if (!drag) return;
  const line = $('drag-line');
  line.setAttribute('x1', drag.x0);
  line.setAttribute('y1', drag.y0);
  line.setAttribute('x2', drag.x1);
  line.setAttribute('y2', drag.y1);
  const origin = $('drag-origin');
  origin.setAttribute('cx', drag.x0);
  origin.setAttribute('cy', drag.y0);
  const label = $('drag-power');
  label.setAttribute('x', drag.x1 + 18);
  label.setAttribute('y', drag.y1 + 6);
  label.textContent = drag.cancel ? 'Release to cancel' : `${Math.round(drag.power * 100)}%`;
}

export function showResult({ title, tone, points, why, next }) {
  const card = $('result-card');
  card.dataset.tone = tone;
  $('result-title').textContent = title;
  $('result-points').textContent = points ? `+${points}` : '';
  $('result-why').textContent = why;
  $('btn-next').textContent = next;
}

export function onNext(fn) {
  $('btn-next').addEventListener('click', fn);
}

export function onPause(fn) {
  $('btn-pause').addEventListener('click', fn);
}
