import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { API, APP, LAUNCH, OUT } from './config.mjs';

// The post composer: the character counter, and failed-looking posts. A post
// attempt that errors must say whether it was saved, and retrying must never
// create a duplicate. Includes a replay of the 2026-09-30 bug (the reposts
// table missing, so posting errored after the post was saved), with the
// table dropped in the TEST database only (tests/fault-inject.php refuses
// anything not named *_test). Needs run-all.sh.

let failed = 0;
const errors = [];
const expect = (cond, msg) => { if (cond) console.log('✓', msg); else { failed++; console.log('✗', msg); } };
const firstLine = (e) => String(e?.message ?? e).split('\n')[0];
const tag = Date.now().toString(36);

// tests/fault-inject.php through the same PHP run-all.sh uses. Git Bash hands
// over paths like /c/Users/...; Node on Windows needs C:/Users/...
const PHP = (process.env.PHP || 'php').replace(/^\/([a-z])\//i, '$1:/');
const faultInject = (action) =>
  execFileSync(PHP, [join(dirname(fileURLToPath(import.meta.url)), '..', 'fault-inject.php'), action], { stdio: 'pipe' });

const dir = mkdtempSync(join(tmpdir(), 'wavelink-composer-'));
const photo = join(dir, 'photo.png');
writeFileSync(photo, Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAVUlEQVRoge3PSQ3AMADAsB6/QhiN8edWGFElWyGQeb5/rP1uazzOQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1A7QJKFwHyx+uV5QAAAABJRU5ErkJggg==',
  'base64'
)); // a real 64x48 PNG

const me = await (await fetch(`${API}/auth/register.php`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: `poe_${tag}`, email: `poe_${tag}@example.com`, password: 'password123', display_name: 'Poe Poster' }),
})).json();
// How many of my posts have exactly this text (straight from the API).
async function countMine(text) {
  const { posts } = await (await fetch(`${API}/posts/list.php?feed=user&user_id=${me.user.id}`)).json();
  return posts.filter((p) => p.content === text).length;
}

const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.addInitScript(([token, user]) => {
  localStorage.setItem('wavelink_token', token);
  localStorage.setItem('wavelink_user', JSON.stringify(user));
}, [me.token, me.user]);
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${APP}/`);
const composer = page.locator('.center .composer');
const box = composer.getByLabel('Post content');
const counter = composer.locator('.char-count');
const postBtn = composer.getByRole('button', { name: 'Post', exact: true });
const alert = composer.locator('.form-error');
const note = composer.locator('.form-note');
async function attachPhoto() {
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), composer.getByRole('button', { name: 'Add a photo' }).click()]);
  await fc.setFiles(photo);
  await composer.locator('.composer-preview:not(.is-uploading)').waitFor({ timeout: 10000 });
}
const feedCount = (text) => page.locator('.center .post .post-text', { hasText: text }).count();

// ---------- Character counter ----------
try {
  await attachPhoto();
  expect((await counter.innerText()) === '' && (await postBtn.isEnabled()), 'photo attached, no caption: no counter, Post enabled');
  await box.fill('   \n\n   ');
  expect((await counter.innerText()) === '', 'only spaces / line breaks typed: still no counter (they are not posted)');
  await box.fill('my dream ');
  expect((await counter.innerText()) === '992', `"my dream " + space: counter ${await counter.innerText()} (992: the 8 characters that get posted)`);
  await box.fill('🌊🌊');
  expect((await counter.innerText()) === '998', `two emoji count as 2, like the server (counter ${await counter.innerText()})`);
  await composer.getByRole('button', { name: 'Remove image' }).click();
  await box.fill('');
} catch (e) { failed++; console.log(`✗ counter: stopped early: ${firstLine(e)}`); }

// ---------- Saved, but the answer said "error" ----------
// The server saves the post; the app is shown a 500 instead of the reply.
try {
  const text = `Saved but looked failed ${tag}`;
  await page.route('**/posts/create.php', async (route) => {
    await route.fetch();
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Something went wrong on the server. Please try again.' }) });
  });
  await box.fill(text);
  await postBtn.click();
  await note.filter({ hasText: 'Your post went through.' }).waitFor({ timeout: 5000 });
  await page.unroute('**/posts/create.php');
  expect((await box.inputValue()) === '' && (await alert.count()) === 0, 'saved despite an error reply: says "Your post went through." and clears the composer');
  expect((await feedCount(text)) === 1 && (await countMine(text)) === 1, 'the post shows once in the feed and exists once on the server');
  await composer.screenshot({ path: `${OUT}/c1-went-through.png` });
} catch (e) { failed++; console.log(`✗ saved-with-error: stopped early: ${firstLine(e)}`); await page.unroute('**/posts/create.php').catch(() => {}); }

// ---------- Never reached the server ----------
try {
  const text = `Never sent ${tag}`;
  await page.route('**/posts/create.php', (route) => route.abort('failed'));
  await box.fill(text);
  await postBtn.click();
  await alert.filter({ hasText: 'Not posted: nothing was saved. You can try again.' }).waitFor({ timeout: 5000 });
  await page.unroute('**/posts/create.php');
  expect((await box.inputValue()) === text && (await countMine(text)) === 0, 'request never arrived: "Not posted: nothing was saved", text kept, nothing on the server');
  await postBtn.click();
  await page.locator('.center .post .post-text', { hasText: text }).waitFor({ timeout: 5000 });
  expect((await countMine(text)) === 1 && (await alert.count()) === 0, 'trying again posts it once');
} catch (e) { failed++; console.log(`✗ never-sent: stopped early: ${firstLine(e)}`); await page.unroute('**/posts/create.php').catch(() => {}); }

// ---------- Answer lost and the check fails too: retry can't duplicate ----------
try {
  const text = `Answer lost ${tag}`;
  await page.route('**/posts/create.php', async (route) => { await route.fetch(); await route.abort('failed'); }); // saved, reply lost
  await page.route('**/posts/get.php?client_token=*', (route) => route.abort('failed'));
  await box.fill(text);
  await postBtn.click();
  await alert.filter({ hasText: "Couldn't confirm whether your post went through. Trying again is safe" }).waitFor({ timeout: 5000 });
  await page.unroute('**/posts/create.php');
  await page.unroute('**/posts/get.php?client_token=*');
  expect((await countMine(text)) === 1, 'unconfirmed: the app says it can\'t tell and that retrying is safe (the post was in fact saved)');
  await composer.screenshot({ path: `${OUT}/c2-unconfirmed.png` });
  await postBtn.click();
  await page.locator('.center .post .post-text', { hasText: text }).waitFor({ timeout: 5000 });
  expect((await countMine(text)) === 1 && (await box.inputValue()) === '', 'retrying returns the saved post: still exactly one on the server');
  // Editing the text makes it a new draft, which posts as a new post.
  await box.fill(`${text} (edited)`);
  await postBtn.click();
  await page.locator('.center .post .post-text', { hasText: `${text} (edited)` }).waitFor({ timeout: 5000 });
  expect((await countMine(`${text} (edited)`)) === 1, 'a changed draft posts normally afterwards');
} catch (e) { failed++; console.log(`✗ answer-lost: stopped early: ${firstLine(e)}`); await page.unroute('**/posts/create.php').catch(() => {}); await page.unroute('**/posts/get.php?client_token=*').catch(() => {}); }

// ---------- Replay of the 2026-09-30 bug: reposts table missing ----------
// Posting reads the new post back with its repost count. With the table gone
// that read fails; the save must be undone, the app must not claim success,
// and retrying once the table is back must post exactly once.
try {
  const text = `my dream ${tag}`;
  await box.fill(text);
  await attachPhoto();
  faultInject('drop-reposts');
  try {
    await postBtn.click();
    await alert.filter({ hasText: "Couldn't confirm whether your post went through. Trying again is safe" }).waitFor({ timeout: 5000 });
  } finally {
    faultInject('restore-reposts');
  }
  expect((await countMine(text)) === 0, 'server error after the save step: the save was undone (nothing on the server)');
  expect((await box.inputValue()) === text && (await composer.locator('.composer-preview img').count()) === 1, 'text and photo kept for a retry');
  await composer.screenshot({ path: `${OUT}/c3-server-error.png` });
  await postBtn.click();
  await page.locator('.center .post', { hasText: text }).locator('.post-image').waitFor({ timeout: 5000 });
  expect((await countMine(text)) === 1 && (await feedCount(text)) === 1, 'once fixed, retrying posts it exactly once (with the photo)');
} catch (e) { failed++; console.log(`✗ missing-table replay: stopped early: ${firstLine(e)}`); try { faultInject('restore-reposts'); } catch { /* already there */ } }

// ---------- Post times are right in any time zone ----------
// The API sends UTC; the app converts. A post made seconds ago must read
// "now" for visitors on both sides of the world, not "13h" or a future time.
try {
  const text = `Time zone check ${tag}`;
  await fetch(`${API}/posts/create.php`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${me.token}` }, body: JSON.stringify({ content: text }) });
  for (const timezoneId of ['Pacific/Auckland', 'America/Los_Angeles', 'Africa/Accra']) {
    const zoned = await browser.newContext({ viewport: { width: 1400, height: 900 }, timezoneId });
    const p = await zoned.newPage();
    await p.goto(`${APP}/`);
    const time = p.locator('.center .post', { hasText: text }).locator('.post-time time');
    await time.waitFor({ timeout: 5000 });
    const shown = await time.innerText();
    const iso = await time.getAttribute('datetime');
    expect(shown === 'now' && Math.abs(Date.now() - Date.parse(iso)) < 120000, `${timezoneId}: a fresh post reads "${shown}" (datetime ${iso})`);
    await zoned.close();
  }
} catch (e) { failed++; console.log(`✗ time zones: stopped early: ${firstLine(e)}`); }

expect(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
console.log(failed ? `== ${failed} FAILED` : '== all composer checks passed');
process.exitCode = failed ? 1 : 0;
