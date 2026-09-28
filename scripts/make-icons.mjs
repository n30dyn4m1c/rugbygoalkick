// ---------------------------------------------------------------------------
// Render public/icons/icon.svg to the PNG sizes the PWA manifest needs.
//   node scripts/make-icons.mjs
// Maskable icons get extra padding so launchers can crop them to any shape.
// ---------------------------------------------------------------------------
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const svg = await readFile('public/icons/icon.svg', 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
const targets = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['maskable-512.png', 512, 0.12],
  ['apple-touch-icon.png', 180, 0],
];
for (const [name, size, pad] of targets) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(`<html><body style="margin:0;background:#05070d;display:grid;place-items:center;height:${size}px">
    <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`);
  await page.screenshot({ path: `public/icons/${name}`, omitBackground: false });
  console.log(`public/icons/${name}`);
}
await browser.close();
