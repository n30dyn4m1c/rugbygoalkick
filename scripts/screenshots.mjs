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
  ['title', (g) => g.step(1.0)],
  ['aiming', (g) => { g.skipIntro(); g.step(1.5); }],
  ['flight', (g) => { g.kick(g.state.roundInfo.autoAim, 0.75); g.step(1.3); }],
  ['result', (g) => g.step(3.0)],
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
    await page.evaluate((s) => {
      window.__game.freeze();
      window.__game.seed(s);
    }, seed);

    for (const [name, run] of STATES) {
      await page.evaluate(`(${run.toString()})(window.__game)`);
      // Let the browser present the frame rendered by step().
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const file = `${outDir}/${vp.name}-${name}.png`;
      await page.screenshot({ path: file });
      const info = await page.evaluate(() => ({
        state: window.__game.state.state,
        calls: window.__game.renderer.info.render.calls,
      }));
      console.log(`${file}  state=${info.state}  drawCalls=${info.calls}`);
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
