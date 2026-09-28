// ---------------------------------------------------------------------------
// Production + offline check: serves dist/ with `vite preview`, loads the game
// once (service worker installs), goes offline, reloads and plays a kick.
//   npm run build && npm run check:offline
// ---------------------------------------------------------------------------
import { preview } from 'vite';
import { chromium } from 'playwright';

const server = await preview({ preview: { port: 0 }, logLevel: 'error' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

try {
  await page.goto(url);
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  });
  check('service worker installs and activates', sw);
  check('production build has no debug hook', await page.evaluate(() => window.__game === undefined));
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector('link[rel="manifest"]')?.href;
    return href ? (await fetch(href)).json() : null;
  });
  check('web app manifest with icons', !!manifest && manifest.icons.length >= 3, manifest?.name);

  await page.waitForTimeout(1500); // let precaching finish
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector('#btn-play', { state: 'visible', timeout: 15000 });
  check('reloads offline: title screen is up', true);
  check('reloads offline: 3D canvas present', await page.evaluate(() => !!document.querySelector('#stage canvas')));
  await page.getByRole('button', { name: 'Play match' }).tap();
  // The establishing shot runs on game time; slow software GL stretches it in wall time
  const reached = await page.waitForFunction(() => document.getElementById('hud').dataset.phase === 'tee', null, { timeout: 30000 }).then(() => true, () => false);
  check('offline: match starts and reaches the tee', reached, await page.evaluate(() => document.getElementById('hud').dataset.phase));
  check('offline: display font loaded from the cache', await page.evaluate(() => document.fonts.check("800 20px 'Barlow Condensed'")));
  check('no page errors', errors.length === 0, errors.join('; '));
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
process.exit(failed ? 1 : 0);
