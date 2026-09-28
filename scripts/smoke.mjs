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
    await page.waitForTimeout(400);

    await page.touchscreen.tap(195, 420);
    check('touch: tap skips the establishing shot', await waitState(page, 'tee', 1500));

    const before = (await st(page)).teeDist;
    const cdp = await ctx.newCDPSession(page);
    const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await page.waitForTimeout(200);
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
    await page.evaluate(() => window.__game.seed(11));
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyX');
    check('keys: any key skips the establishing shot', await waitState(page, 'tee', 1500));
    await page.waitForTimeout(200);

    const t0 = (await st(page)).teeDist;
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowDown');
    const t1 = (await st(page)).teeDist;
    check('keys: ↓ moves the tee back', t1 > t0 + 1, `${t0} → ${t1.toFixed(1)} m`);

    await page.keyboard.press('Space');
    check('keys: Space confirms the tee', await waitState(page, 'aim', 1500));
    await page.waitForTimeout(300);

    const a0 = await st(page);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowUp');
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

    await page.evaluate(() => window.blur());
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
