// ---------------------------------------------------------------------------
// Interactive first-kick tutorial: coach marks that react to what the player
// does, never a wall of text. Each step ends when the player does the thing.
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

const COPY = {
  establish: {
    all: 'A try! You convert it from anywhere on a line straight back from where it was scored.',
  },
  tee: {
    touch: 'Drag to slide the tee back and forth. Stepping back widens the angle to the posts. The gold ring is a good spot. Tap “Kick from here”.',
    keyboard: 'Use {raise} {lower} to slide the tee. Stepping back widens the angle. The gold ring is a good spot. Press {kick} to kick from here.',
    gamepad: 'Push the stick up or down to slide the tee. Stepping back widens the angle. Press A to kick from here.',
  },
  aim: {
    touch: 'Drag back from anywhere, like a slingshot. The dots show exactly where the ball will go, wind included. Let go to kick. The Height slider sets how high it flies.',
    keyboard: '{aimLeft} {aimRight} aim, {raise} {lower} set the height. Press {kick} to start the meter, and again to kick. Watch the ring at the posts move with the meter.',
    gamepad: 'Left stick aims and sets the height. Press A to start the meter, and again to kick. Watch the ring at the posts move with the meter.',
  },
  meter: {
    keyboard: 'Press {kick} when the ring sits between the posts, above the bar.',
    gamepad: 'Press A when the ring sits between the posts, above the bar.',
  },
  result: {
    all: 'The card says why it went where it did. That’s it: 10 kicks, 2 points a goal, and the wind gets stronger.',
  },
};

export function createTutorial({ keyLabelFor }) {
  let active = false;
  let onDone = null;

  function show(step, device) {
    const set = COPY[step];
    if (!set) return hide();
    const text = set[device] ?? set.touch ?? set.all;
    if (!text) return hide();
    $('coach-text').textContent = text.replace(/\{(\w+)\}/g, (_, a) => keyLabelFor(a));
    $('coach').hidden = false;
  }

  function hide() {
    $('coach').hidden = true;
  }

  $('btn-coach-skip').addEventListener('click', () => finish());

  function finish() {
    if (!active) return;
    active = false;
    hide();
    onDone?.();
  }

  return {
    get active() {
      return active;
    },
    start(done) {
      active = true;
      onDone = done;
    },
    /** Called on every game phase change. */
    phase(phase, device) {
      if (!active) return;
      if (phase === 'flight') hide();
      else if (phase === 'next' || phase === 'over') finish();
      else show(phase, device === 'mouse' ? 'touch' : device);
    },
    finish,
  };
}
