// ---------------------------------------------------------------------------
// Look-dev comparison: screenshots of each preset at three sizes, plus a
// throttled performance probe.
//   npm run lookdev  → screenshots/lookdev/<preset>-<size>-<state>.png
//
// Performance numbers come from headless Chromium with SwiftShader (software
// GL) and 4× CPU throttling. They are only meaningful RELATIVE to each other,
// not as real-phone frame rates.
// ---------------------------------------------------------------------------
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const OUT = 'screenshots/lookdev';
const PRESETS = ['A', 'B', 'C'];
const VIEWPORTS = [
  { name: 'phone-portrait', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'phone-landscape', width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
];
const STATES = [
  ['title', (g) => { g.showTitle(); g.step(3); }],
  ['aiming', (g) => { g.settings.set({ tutorialDone: true }); g.seed(21); g.startMatch(); g.go('aim'); g.setAim({ yaw: g.yawToPosts() }); g.step(1.5); }],
  ['flight', (g) => { g.kick(0.78); g.step(0.9); }],
  ['result', (g) => g.step(2.4)],
];

await mkdir(OUT, { recursive: true });
const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];

async function openPage(vp, preset) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${preset}/${vp.name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${preset}/${vp.name}: ${m.text()}`));
  await page.goto(`${url}?look=${preset}`);
  await page.waitForFunction(() => window.__game);
  return { ctx, page };
}

try {
  // Screenshots
  for (const preset of PRESETS) {
    for (const vp of VIEWPORTS) {
      const { ctx, page } = await openPage(vp, preset);
      await page.evaluate(() => window.__game.freeze());
      for (const [name, run] of STATES) {
        await page.evaluate(`(${run.toString()})(window.__game)`);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        await page.screenshot({ path: `${OUT}/${preset}-${vp.name}-${name}.png`, timeout: 60000 });
      }
      await ctx.close();
    }
  }

  // Performance: phone portrait at DPR 2, aiming state, 4× CPU throttle
  const rows = [];
  for (const [label, preset, bloom] of [['A', 'A', false], ['B', 'B', false], ['B + bloom', 'B', true], ['C', 'C', false]]) {
    const { ctx, page } = await openPage(VIEWPORTS[0], preset);
    await page.evaluate(STATES[1][1].toString().replace(/^\(g\) =>/, '(g=window.__game) =>') + '()').catch(() => {});
    await page.evaluate((b) => { window.__game.post.setBloom(b); return window.__game.post.whenReady(); }, bloom);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const r = await page.evaluate(async () => {
      const g = window.__game;
      g.freeze(); // stop simulation; measure rendering only
      for (let i = 0; i < 5; i++) g.post.render(); // warm up shaders
      const n = 20;
      const t0 = performance.now();
      for (let i = 0; i < n; i++) g.post.render();
      g.renderer.getContext().finish();
      const ms = (performance.now() - t0) / n;
      g.post.render();
      const info = g.renderer.info.render;
      // Real-time frames over 3 s with the live loop
      g.loop.setManual(false);
      let frames = 0;
      const start = performance.now();
      await new Promise((res) => {
        const tick = () => { frames++; if (performance.now() - start < 3000) requestAnimationFrame(tick); else res(); };
        requestAnimationFrame(tick);
      });
      return { ms, fps: frames / ((performance.now() - start) / 1000), calls: info.calls, tris: info.triangles };
    });
    rows.push({ label, ...r });
    await ctx.close();
  }
  console.log('\nThrottled render cost (phone portrait, DPR 2, SwiftShader, 4× CPU) — relative only:');
  console.log('preset       ms/frame   fps    draw calls  triangles');
  for (const r of rows) console.log(`${r.label.padEnd(12)} ${r.ms.toFixed(1).padStart(8)} ${r.fps.toFixed(1).padStart(6)} ${String(r.calls).padStart(10)} ${String(r.tris).padStart(10)}`);
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
