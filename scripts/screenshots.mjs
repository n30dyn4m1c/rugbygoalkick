// ---------------------------------------------------------------------------
// Capture screenshots of key game states at phone and desktop sizes.
//
//   npm run screenshots                 → screenshots/<size>-<state>.png
//   npm run screenshots -- --out dir    → custom output directory
//   npm run screenshots -- --seed 7     → round seed (default 7)
//
// Starts a Vite dev server, drives the game through the dev-only
// window.__game hook with a frozen (manually stepped) clock, and exits
// non-zero on any page error or console error.
// ---------------------------------------------------------------------------
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const outDir = resolve(arg('out', 'screenshots'));
const seed = Number(arg('seed', 7));

const VIEWPORTS = [
  { name: 'phone-portrait', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'phone-landscape', width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
];

// Each state: a function run in the page against window.__game, then a shot.
const STATES = [
  ['title', (g) => g.step(2.0)],
  // First-kick tutorial coach mark on the aim step
  ['tutorial', (g) => { g.settings.set({ tutorialDone: false }); g.startTutorial(); g.step(0.3); g.go('aim'); g.step(1.0); }],
  ['establish', (g) => { g.settings.set({ tutorialDone: true }); g.showTitle(); g.seed(SEED); g.startMatch(); g.step(0.8); }],
  ['tee', (g) => { g.go('tee'); g.step(1.2); }],
  ['aiming', (g) => { g.go('aim'); g.setAim({ yaw: g.yawToPosts() + 0.02 }); g.step(1.2); }],
  // Node-side step: a real pointer drag (slingshot), captured mid-pull, then cancelled.
  ['drag', async (page, vp) => {
    const x = vp.width / 2;
    const y = vp.height * 0.62;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - vp.width * 0.06, y + Math.min(vp.height * 0.2, 170), { steps: 6 });
    await page.evaluate(() => window.__game.step(0.2));
  }, async (page, vp) => {
    await page.mouse.move(vp.width / 2, vp.height * 0.62, { steps: 3 });
    await page.mouse.up();
    await page.evaluate(() => window.__game.step(0.2));
  }],
  ['flight', (g) => { g.kick(0.72); g.step(1.0); }],
  // Goal celebration: +2, confetti, crowd on its feet (just after the reveal)
  ['result', (g) => { for (let i = 0; i < 60 && !g.state.flight.revealed; i++) g.step(0.1); g.step(0.45); }],
  ['doink', (g) => { g.state.flight.hold = 99; g.step(0.2); g.go('aim'); g.kickFor('post_out') && g.step(0.05); const f = g.state.flight; g.step(Math.max(0, (f.result.events[0]?.t ?? 0) + 0.25)); }],
  ['pause', (g) => { g.pause(); g.step(0.1); }],
  ['settings', (g) => { g.openSettings(); g.step(0.1); }],
  ['summary', (g) => { g.resume(); g.autoplay(10); g.step(0.2); }],
  ['practice-setup', (g) => { g.showTitle(); g.settings.set({ practice: { tryX: 18, windSpeed: 4, windDir: 'ltr', previewTier: 2 } }); g.openPractice(); g.step(0.1); }],
  // Let the last goal's confetti and +2 finish so the heat map is readable
  ['practice', (g) => { g.seed(SEED); g.startMode('practice'); g.autoplay(6); g.go('tee'); g.step(0.3); g.go('aim'); g.step(4); return new Promise((r) => setTimeout(r, 1500)); }],
  ['pressure', (g) => { g.showTitle(); g.seed(SEED); g.startMode('pressure'); g.step(0.5); g.go('tee'); g.step(4.0); }],
  ['pressure-summary', (g) => { g.go('aim'); g.kickFor('wide_right'); for (let i = 0; i < 80 && g.state.state !== 'over'; i++) g.step(0.1); g.step(0.2); }],
];

await mkdir(outDir, { recursive: true });
const server = await createServer({ server: { port: 0, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const problems = [];
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => problems.push(`[${vp.name}] pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`[${vp.name}] console: ${m.text()}`);
    });

    await page.goto(url);
    await page.waitForFunction(() => window.__game !== undefined);
    await page.evaluate(() => window.__game.freeze());

    for (const [name, run, after] of STATES) {
      if (run.constructor.name === 'AsyncFunction') await run(page, vp);
      else await page.evaluate(`((SEED) => (${run.toString()})(window.__game))(${seed})`);
      // Let the browser present the frame rendered by step().
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const file = `${outDir}/${vp.name}-${name}.png`;
      await page.screenshot({ path: file, timeout: 90000 }); // software GL + bloom is slow
      const info = await page.evaluate(() => ({
        state: window.__game.state.state,
        calls: window.__game.renderer.info.render.calls,
      }));
      console.log(`${file}  state=${info.state}  drawCalls=${info.calls}`);
      if (after) await after(page, vp);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('\nAll screenshots captured cleanly.');
