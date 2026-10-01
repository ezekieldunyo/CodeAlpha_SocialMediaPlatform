import { chromium } from 'playwright-core';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LAUNCH, OUT } from './config.mjs';

// End-to-end check of a DEPLOYED wavelink site, through a real browser (so it
// also gets past a host's "are you a browser" check, which blocks curl):
//
//   node tests/e2e/live.mjs https://your-site.example.com
//
// It signs up a throwaway account (wl_check_…), posts text and a photo, likes,
// comments, edits the profile, refreshes a deep link, deletes its posts and
// logs back in. Its posts are removed at the end; the account itself stays
// (there is no delete-account feature) and is named so it's easy to spot.
// Not part of run-all.sh: this talks to whatever site you point it at.

const SITE = (process.argv[2] || '').replace(/\/$/, '');
if (!/^https?:\/\//.test(SITE)) {
  console.error('Usage: node tests/e2e/live.mjs https://your-site.example.com');
  process.exit(2);
}
const local = /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(SITE);

let failed = 0;
const expect = (cond, msg) => { if (cond) console.log('✓', msg); else { failed++; console.log('✗', msg); } };
const firstLine = (e) => String(e?.message ?? e).split('\n')[0];
const tag = Date.now().toString(36);
const username = `wl_check_${tag}`;
const password = `Check-${tag}-${Math.random().toString(36).slice(2, 10)}`;

const dir = mkdtempSync(join(tmpdir(), 'wavelink-live-'));
const photo = join(dir, 'photo.png');
writeFileSync(photo, Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAVUlEQVRoge3PSQ3AMADAsB6/QhiN8edWGFElWyGQeb5/rP1uazzOQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1A7QJKFwHyx+uV5QAAAABJRU5ErkJggg==',
  'base64'
)); // a real 64x48 PNG

const browser = await chromium.launch(LAUNCH);
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const pageErrors = [];
const apiCalls = [];
const badResponses = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('response', (r) => {
  const url = r.url();
  if (!/\/api\/.*\.php/.test(url)) return;
  apiCalls.push(url);
  const type = r.headers()['content-type'] || '';
  if (r.status() >= 500 || !type.includes('application/json')) badResponses.push(`${r.status()} ${type || 'no content-type'} ${url}`);
});
const post = (text) => page.locator('.center .post', { hasText: text });

try {
  // ---------- The site and its API load ----------
  const feed = page.waitForResponse((r) => r.url().includes('/api/posts/list.php'), { timeout: 30000 });
  await page.goto(`${SITE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const feedResponse = await feed;
  expect(feedResponse.status() === 200 && Array.isArray((await feedResponse.json()).posts), `the app loads and the API answers (${new URL(feedResponse.url()).pathname} -> ${feedResponse.status()}, JSON)`);
  await page.getByRole('tab', { name: 'For you' }).waitFor({ timeout: 10000 });

  // ---------- Register ----------
  await page.goto(`${SITE}/register`);
  await page.getByLabel('Name', { exact: true }).fill('Wavelink Check');
  await page.locator('.input-prefix input').fill(username);
  await page.getByLabel('Email').fill(`${username}@example.com`);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.locator('.center .composer').waitFor({ timeout: 15000 });
  expect(true, `registered @${username} (account saved in the database, logged in)`);

  // ---------- Post text ----------
  const composer = page.locator('.center .composer');
  const text = `Live check: hello from wavelink ${tag} 🌊`;
  await composer.getByLabel('Post content').fill(text);
  await composer.getByRole('button', { name: 'Post', exact: true }).click();
  await post(text).waitFor({ timeout: 15000 });
  const shownTime = await post(text).locator('.post-time time').innerText();
  expect(shownTime === 'now', `text post published (emoji kept, time shows "${shownTime}")`);

  // ---------- Upload a photo and post it ----------
  const caption = `Live check: photo ${tag}`;
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), composer.getByRole('button', { name: 'Add a photo' }).click()]);
  await fc.setFiles(photo);
  await composer.locator('.composer-preview:not(.is-uploading)').waitFor({ timeout: 30000 });
  const uploadError = await composer.locator('.form-error').count() ? await composer.locator('.form-error').innerText() : '';
  expect(uploadError === '', `photo uploaded${uploadError ? `: ${uploadError}` : ''}`);
  await composer.getByLabel('Post content').fill(caption);
  await composer.getByRole('button', { name: 'Post', exact: true }).click();
  const image = post(caption).locator('img.post-image');
  await image.waitFor({ timeout: 15000 });
  await page.waitForFunction((el) => el.complete, await image.elementHandle(), { timeout: 15000 });
  const shown = await image.evaluate((el) => ({ src: el.src, width: el.naturalWidth }));
  expect(shown.width === 64, `photo post published and the image displays (${shown.src})`);
  expect(new URL(shown.src).origin === new URL(SITE).origin, 'the image is served from the site itself, same http/https as the page');

  // ---------- Like and comment, kept after a reload ----------
  await post(caption).locator('.action.like').click();
  await post(caption).locator('.action.like.is-liked', { hasText: '1' }).waitFor({ timeout: 10000 });
  await post(caption).locator('.action').first().click();
  await post(caption).getByPlaceholder('Write a reply…').fill('Live check comment');
  await post(caption).getByRole('button', { name: 'Reply' }).click();
  await post(caption).locator('.comment', { hasText: 'Live check comment' }).waitFor({ timeout: 10000 });
  await page.reload();
  await post(caption).locator('.action.like.is-liked', { hasText: '1' }).waitFor({ timeout: 15000 });
  expect((await post(caption).locator('.action').first().innerText()).trim() === '1' && (await post(caption).locator('img.post-image').count()) === 1,
    'like, comment and photo are still there after a reload (saved in the database)');
  await page.screenshot({ path: `${OUT}/live-feed.png` });

  // ---------- Edit profile (PUT, sent as POST), then refresh the deep link ----------
  await page.goto(`${SITE}/u/${username}`);
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await page.getByRole('dialog').getByLabel('Bio').fill(`Checked ${tag}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 });
  await page.getByText(`Checked ${tag}`).waitFor({ timeout: 10000 });
  expect(true, 'profile edit saved');
  await page.reload();
  await page.getByText(`Checked ${tag}`).waitFor({ timeout: 15000 });
  expect(new URL(page.url()).pathname === `/u/${username}`, `refreshing /u/${username} loads the profile (page addresses work, not a 404)`);

  // ---------- Delete both posts (DELETE, sent as POST) ----------
  for (const content of [caption, text]) {
    page.once('dialog', (d) => d.accept());
    await post(content).getByRole('button', { name: 'More options' }).click();
    await page.getByRole('menuitem', { name: 'Delete post' }).click();
    await post(content).waitFor({ state: 'detached', timeout: 15000 });
  }
  await page.reload();
  await page.locator('.profile-info').waitFor({ timeout: 15000 });
  expect((await page.locator('.center .post').count()) === 0, 'both posts deleted (and still gone after a reload)');

  // ---------- Log out and back in ----------
  await page.locator('.left-nav').getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: /Log out/ }).click();
  await page.waitForURL(`${SITE}/login`, { timeout: 10000 });
  await page.getByLabel('Email').fill(`${username}@example.com`);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.locator('.center .composer').waitFor({ timeout: 15000 });
  expect(true, 'logged out and back in with the new account');

  // ---------- Settings and code are not downloadable ----------
  const blocked = await page.evaluate(async () => {
    const out = {};
    for (const path of ['/config/local.php', '/config/config.php', '/includes/jwt.php']) {
      const r = await fetch(path, { cache: 'no-store' });
      out[path] = { status: r.status, bytes: (await r.text()).length };
    }
    return out;
  });
  const summary = Object.entries(blocked).map(([p, r]) => `${p} -> ${r.status}`).join(', ');
  if (local) console.log(`- (local preview has no Apache rules) ${summary}`);
  else expect(Object.values(blocked).every((r) => r.status === 403 || r.status === 404), `config and code folders are blocked (${summary})`);
} catch (e) {
  failed++;
  console.log(`✗ stopped early: ${firstLine(e)}`);
  await page.screenshot({ path: `${OUT}/live-failure.png` }).catch(() => {});
  const alert = await page.locator('[role="alert"]').first().innerText().catch(() => '');
  if (alert) console.log(`  the page says: ${alert}`);
  console.log(`  at ${page.url()} (screenshot: ${OUT}/live-failure.png)`);
}

const origins = [...new Set(apiCalls.map((u) => new URL(u).origin))];
expect(origins.length === 1 && origins[0] === new URL(SITE).origin, `all ${apiCalls.length} API requests went to ${origins.join(', ') || '(none)'}`);
expect(badResponses.length === 0, `every API answer was JSON, no server errors${badResponses.length ? ': ' + badResponses.slice(0, 5).join(' | ') : ''}`);
expect(pageErrors.length === 0, `no page errors${pageErrors.length ? ': ' + pageErrors.join(' | ') : ''}`);
await browser.close();
console.log(`\nTest account left on the site: @${username}`);
console.log(failed ? `== ${failed} FAILED` : '== live site works end to end');
process.exitCode = failed ? 1 : 0;
