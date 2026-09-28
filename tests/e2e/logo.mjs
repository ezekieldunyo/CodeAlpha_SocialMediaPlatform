import { chromium } from 'playwright-core';
import { API, APP, LAUNCH, OUT } from './config.mjs';

// The wavelink app tile (frontend/public/wavelink-logo-{128,512}.png) in every
// place it appears: sidebar (full and collapsed), mobile header, and above the
// login / sign-up forms. Checks alt text, explicit size, the right source
// file, sharpness at 1x-3x, that nothing is drawn around or over the tile,
// that the old SVG "W" mark is gone, and that the favicon is untouched.

let failed = 0;
const errors = [];
const expect = (cond, msg) => { if (cond) console.log('✓', msg); else { failed++; console.log('✗', msg); } };

const stamp = Date.now().toString(36);
const reg = await (await fetch(`${API}/auth/register.php`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: `logo_${stamp}`, email: `logo_${stamp}@example.com`, password: 'password123', display_name: 'Logo Check' }),
})).json();

const browser = await chromium.launch(LAUNCH);

// Collects facts about every logo <img> on the page, plus traces of the old mark.
async function inspect(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('img.logo-tile')].every((i) => i.complete && i.naturalWidth > 0));
  return page.evaluate(() => {
    const tiles = [...document.querySelectorAll('img.logo-tile')]
      .filter((img) => img.getClientRects().length > 0) // visible ones only
      .map((img) => {
        const cs = getComputedStyle(img);
        const parent = getComputedStyle(img.parentElement);
        const r = img.getBoundingClientRect();
        return {
          src: new URL(img.currentSrc || img.src).pathname,
          alt: img.getAttribute('alt'),
          widthAttr: img.getAttribute('width'),
          heightAttr: img.getAttribute('height'),
          natural: img.naturalWidth,
          rendered: [Math.round(r.width), Math.round(r.height)],
          untouched:
            cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.backgroundImage === 'none' &&
            cs.borderRadius === '0px' && cs.borderStyle === 'none' && cs.boxShadow === 'none' &&
            cs.filter === 'none' && cs.opacity === '1' && cs.mixBlendMode === 'normal' &&
            parent.backgroundColor === 'rgba(0, 0, 0, 0)',
          nextText: img.nextElementSibling && img.nextElementSibling.getClientRects().length ? img.nextElementSibling.textContent : null,
        };
      });
    const oldMark =
      document.querySelectorAll('svg[viewBox="0 0 400 300"], [stroke^="url(#wl-mark"], #wl-mark-a, #wl-mark-b').length;
    return { tiles, oldMark, dpr: window.devicePixelRatio };
  });
}

function checkTiles(label, info, { count, size, file, text }) {
  const { tiles, oldMark, dpr } = info;
  expect(tiles.length === count, `${label}: ${count} logo tile(s) visible (got ${tiles.length})`);
  for (const t of tiles) {
    expect(t.src === `/${file}`, `${label}: uses ${file} (got ${t.src})`);
    expect(t.alt === 'wavelink', `${label}: alt="wavelink"`);
    expect(t.widthAttr === String(size) && t.heightAttr === String(size), `${label}: width/height attributes = ${size} (got ${t.widthAttr}x${t.heightAttr})`);
    expect(t.rendered[0] === size && t.rendered[1] === size, `${label}: renders at ${size}x${size} (got ${t.rendered.join('x')})`);
    expect(t.natural >= size * dpr, `${label}: sharp at ${dpr}x (${t.natural}px source for ${size * dpr} device px)`);
    expect(t.untouched, `${label}: shown as-is (no background, radius, border, shadow, filter or opacity)`);
    if (text !== undefined) expect(t.nextText === text, `${label}: ${text ? `"${text}" text beside the tile` : 'tile only, no wordmark'} (got ${JSON.stringify(t.nextText)})`);
  }
  expect(oldMark === 0, `${label}: old W mark absent`);
}

async function signedInPage(viewport, deviceScaleFactor) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor });
  await ctx.addInitScript(([token, user]) => {
    localStorage.setItem('wavelink_token', token);
    localStorage.setItem('wavelink_user', JSON.stringify(user));
  }, [reg.token, reg.user]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  return page;
}

// Sidebar, full width: tile + "wavelink" text. Checked at 1x and 2x.
for (const dsf of [1, 2]) {
  const page = await signedInPage({ width: 1400, height: 900 }, dsf);
  await page.goto(`${APP}/`);
  const info = await inspect(page);
  checkTiles(`sidebar @${dsf}x`, info, { count: 1, size: 34, file: 'wavelink-logo-128.png', text: 'wavelink' });
  if (dsf === 2) await page.screenshot({ path: `${OUT}/l1-sidebar-2x.png`, clip: { x: 0, y: 0, width: 700, height: 160 } });
  await page.context().close();
}

// Sidebar, collapsed (narrower desktop): tile only.
{
  const page = await signedInPage({ width: 1100, height: 850 }, 2);
  await page.goto(`${APP}/`);
  checkTiles('collapsed sidebar @2x', await inspect(page), { count: 1, size: 34, file: 'wavelink-logo-128.png', text: null });
  await page.screenshot({ path: `${OUT}/l2-collapsed-2x.png`, clip: { x: 0, y: 0, width: 400, height: 200 } });
  await page.context().close();
}

// Mobile header, phone at 3x.
{
  const page = await signedInPage({ width: 390, height: 844 }, 3);
  await page.goto(`${APP}/`);
  checkTiles('mobile header @3x', await inspect(page), { count: 1, size: 28, file: 'wavelink-logo-128.png', text: 'wavelink' });
  await page.screenshot({ path: `${OUT}/l3-mobile-3x.png`, clip: { x: 0, y: 0, width: 390, height: 120 } });
  await page.context().close();
}

// Login and sign-up: large tile above the form, desktop 2x and phone 3x.
for (const [path, heading] of [['/login', 'Log in to wavelink'], ['/register', 'Create your account']]) {
  for (const [viewport, dsf, label] of [[{ width: 1400, height: 900 }, 2, 'desktop @2x'], [{ width: 390, height: 844 }, 3, 'phone @3x']]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${APP}${path}`);
    const info = await inspect(page);
    checkTiles(`${path} ${label}`, info, { count: 1, size: 88, file: 'wavelink-logo-512.png' });
    const above = await page.evaluate((h) => {
      const img = document.querySelector('img.logo-tile');
      const title = [...document.querySelectorAll('h2')].find((e) => e.textContent === h);
      const form = document.querySelector('form');
      return img.getBoundingClientRect().bottom <= title.getBoundingClientRect().top &&
        title.getBoundingClientRect().bottom <= form.getBoundingClientRect().top;
    }, heading);
    expect(above, `${path} ${label}: tile sits above the heading and form`);
    await page.screenshot({ path: `${OUT}/l4${path.replace('/', '-')}-${dsf}x.png` });
    await ctx.close();
  }
}

// No layout shift while the tile loads: hold the image back, measure, release.
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  let release;
  const held = new Promise((r) => (release = r));
  await page.route('**/wavelink-logo-512.png', async (route) => { await held; await route.continue(); });
  await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Log in to wavelink' }).waitFor();
  const before = await page.evaluate(() => [document.querySelector('h2').getBoundingClientRect().top, document.querySelector('img.logo-tile').complete]);
  release();
  await page.waitForFunction(() => document.querySelector('img.logo-tile').complete && document.querySelector('img.logo-tile').naturalWidth > 0);
  const after = await page.evaluate(() => document.querySelector('h2').getBoundingClientRect().top);
  expect(before[1] === false && before[0] === after, `no layout shift while the logo loads (heading top ${before[0]} -> ${after}, image was ${before[1] ? 'already' : 'not yet'} loaded)`);
  await ctx.close();
}

// Favicon unchanged.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${APP}/login`);
  const icons = await page.evaluate(() => [...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')].map((l) => l.getAttribute('href')));
  expect(JSON.stringify(icons) === JSON.stringify(['/favicon.ico', '/favicon-32x32.png', '/favicon-16x16.png', '/apple-touch-icon.png']), `favicon links unchanged (${icons.join(', ')})`);
  await ctx.close();
}

expect(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
console.log(failed ? `== ${failed} FAILED` : '== all logo checks passed');
process.exitCode = failed ? 1 : 0;
