// ---------------------------------------------------------------------------
// Input smoke test: drives the real game loop with real input events.
//   npm run smoke
// Phone: tap to skip the intro, drag the tee, tap "Kick from here", slingshot kick.
// Desktop: keys move the tee, Space confirms, arrows aim, Space-Space meter kick.
// ---------------------------------------------------------------------------
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures.push(name);
};
const st = (page) => page.evaluate(() => {
  const s = window.__game.state;
  return { state: s.state, teeDist: s.teeDist, yaw: s.yaw, elev: s.elevationDeg, kicked: !!s.flight, revealed: !!s.flight?.revealed, round: s.round };
});
// Wait for game time (not wall time) to pass in the current state: slow
// software-GL frames can stall the loop, and the game rightly ignores input
// for its first 0.12 s of game time in a state.
const settle = (page, seconds = 0.25) =>
  page.waitForFunction((s) => window.__game.state.stateTime >= s, seconds, { timeout: 15000 });
const waitState = (page, name, timeout = 8000) =>
  page.waitForFunction((n) => window.__game.state.state === n, name, { timeout }).then(() => true, () => false);

try {
  // ---- Phone (touch) --------------------------------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.__game);
    await page.evaluate(() => window.__game.seed(11));
    const cdp = await ctx.newCDPSession(page);
    const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const tapEl = async (name) => {
      const b = await page.getByRole('button', { name }).boundingBox();
      await touch('touchStart', b.x + b.width / 2, b.y + b.height / 2);
      await touch('touchEnd');
    };
    await page.waitForTimeout(400);

    // Two taps from page load to the first kick: Play match, Kick from here.
    await tapEl('Play match');
    check('touch: tap 1 (Play match) starts the match', await waitState(page, 'establish', 1500));
    check('touch: first-launch tutorial coach mark is shown', await page.evaluate(() => !document.getElementById('coach').hidden));
    check('touch: establishing shot hands over to the tee by itself', await waitState(page, 'tee', 4000));
    await page.waitForTimeout(400);
    await tapEl('Kick from here');
    check('touch: tap 2 (Kick from here) → ready to kick', await waitState(page, 'aim', 1500));

    // Back to the tee step for the drag checks (debug jump, not a player tap)
    await page.evaluate(() => window.__game.go('tee'));
    await page.waitForTimeout(400);
    const before = (await st(page)).teeDist;
    await touch('touchStart', 200, 560);
    for (let i = 1; i <= 8; i++) await touch('touchMove', 200, 560 + i * 25);
    await touch('touchEnd');
    const after = (await st(page)).teeDist;
    check('touch: dragging moves the tee', Math.abs(after - before) >= 1, `${before} → ${after} m`);

    // A human can't tap 0 ms after lifting from a drag; Chrome's gesture
    // detector swallows such instant taps, so pause like a real finger would.
    await page.waitForTimeout(500);
    const box = await page.getByRole('button', { name: 'Kick from here' }).boundingBox();
    await touch('touchStart', box.x + box.width / 2, box.y + box.height / 2);
    await touch('touchEnd');
    check('touch: "Kick from here" starts aiming', await waitState(page, 'aim', 1500));
    await page.waitForTimeout(300);

    const yaw0 = (await st(page)).yaw;
    await touch('touchStart', 195, 600);
    for (let i = 1; i <= 10; i++) await touch('touchMove', 195 - i * 3, 600 + i * 20);
    const mid = await st(page);
    check('touch: pulling left aims right (slingshot)', mid.yaw > yaw0, `yaw ${yaw0.toFixed(3)} → ${mid.yaw.toFixed(3)}`);
    await touch('touchEnd');
    check('touch: release kicks', await waitState(page, 'flight', 1500));
    await page.waitForFunction(() => window.__game.state.flight?.revealed, null, { timeout: 8000 }).catch(() => {});
    check('touch: result is revealed', (await st(page)).revealed);
    await page.waitForTimeout(500);
    await touch('touchStart', 195, 420);
    await touch('touchEnd');
    await page.waitForTimeout(600);
    check('touch: tap advances to the next kick', (await st(page)).round === 2);

    await page.waitForTimeout(400);
    await tapEl('Pause');
    await page.waitForTimeout(200);
    const paused = await page.evaluate(() => ({ mode: window.__game.app.mode, t: window.__game.state.time }));
    await page.waitForTimeout(500);
    const still = await page.evaluate(() => window.__game.state.time);
    check('touch: pause button pauses the game clock', paused.mode === 'paused' && still === paused.t);
    await tapEl('Resume');
    await page.waitForTimeout(300);
    check('touch: resume continues', (await page.evaluate(() => window.__game.state.time)) > still);
    check('touch: no page errors', errors.length === 0, errors.join('; '));
    await ctx.close();
  }

  // ---- Desktop (keyboard) -----------------------------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.__game);
    await page.evaluate(() => {
      window.__game.seed(11);
      window.__game.settings.set({ tutorialDone: true });
    });
    await page.waitForTimeout(300);
    check('keys: Play match has focus on the title', await page.evaluate(() => document.activeElement?.id === 'btn-play'));
    await page.keyboard.press('Enter');
    check('keys: Enter starts the match', await waitState(page, 'establish', 1500));
    await settle(page);
    await page.keyboard.press('KeyX');
    check('keys: any key skips the establishing shot', await waitState(page, 'tee', 1500));
    await settle(page);

    const t0 = (await st(page)).teeDist;
    await page.keyboard.down('ArrowDown');
    const tt = await page.evaluate(() => window.__game.state.time);
    await page.waitForFunction((t) => window.__game.state.time >= t + 0.4, tt, { timeout: 15000 });
    await page.keyboard.up('ArrowDown');
    const t1 = (await st(page)).teeDist;
    check('keys: ↓ moves the tee back', t1 > t0 + 1, `${t0} → ${t1.toFixed(1)} m`);

    await page.keyboard.press('Space');
    check('keys: Space confirms the tee', await waitState(page, 'aim', 1500));
    await settle(page);

    // Hold each key for 0.3 s of game time
    const hold = async (key) => {
      await page.keyboard.down(key);
      const t = await page.evaluate(() => window.__game.state.time);
      await page.waitForFunction((t0) => window.__game.state.time >= t0 + 0.3, t, { timeout: 15000 });
      await page.keyboard.up(key);
    };
    const a0 = await st(page);
    await hold('ArrowRight');
    await hold('ArrowUp');
    const a1 = await st(page);
    check('keys: → aims right', a1.yaw > a0.yaw, `${a0.yaw.toFixed(3)} → ${a1.yaw.toFixed(3)}`);
    check('keys: ↑ raises the kick', a1.elev > a0.elev, `${a0.elev.toFixed(1)}° → ${a1.elev.toFixed(1)}°`);

    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    check('keys: first Space starts the meter', await page.evaluate(() => window.__game.state.meter.running));
    await page.waitForTimeout(500);
    await page.keyboard.press('Space');
    check('keys: second Space kicks', await waitState(page, 'flight', 1500));
    const power = await page.evaluate(() => window.__game.state.lastPower);
    check('keys: meter power is not pinned at 100%', power > 0.05 && power < 0.99, `power ${power.toFixed(2)}`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    check('keys: Esc pauses', await page.evaluate(() => window.__game.app.mode === 'paused'));
    check('keys: Resume has focus', await page.evaluate(() => document.activeElement?.id === 'btn-resume'));
    await page.keyboard.press('ArrowDown');
    check('keys: arrows move focus in menus', await page.evaluate(() => document.activeElement?.id === 'btn-restart'));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    check('keys: Esc resumes', await page.evaluate(() => window.__game.app.mode === 'playing'));

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    check('keys: hiding the tab auto-pauses', await page.evaluate(() => window.__game.app.mode === 'paused'));
    check('keys: no page errors', errors.length === 0, errors.join('; '));
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nAll input checks passed.');
