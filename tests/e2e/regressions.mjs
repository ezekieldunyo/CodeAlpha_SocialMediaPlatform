import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { API, APP, LAUNCH, OUT, UPLOADS } from './config.mjs';

// Each bug's section runs independently: if one stops early, the rest still run.
// Regression tests for four reported bugs. All shared one root cause: a browser
// stayed logged in after its account was deleted, the server kept trusting the
// token, and PHP errors came back as HTML with status 200 that the app took as
// success. Each check below fails on the code before the fix.
//
// Needs the isolated test setup from tests/run-all.sh (DB_NAME=*_test, PHP).

const PHP = process.env.PHP || 'php';
const here = dirname(fileURLToPath(import.meta.url));
// Deletes a user from the *test* database; the script refuses any other database.
const deleteAccount = (username) =>
  execFileSync(PHP, [join(here, '..', 'delete-test-user.php'), username], { env: process.env }).toString().trim();

const dir = mkdtempSync(join(tmpdir(), 'wavelink-regress-'));
const photo = join(dir, 'me.png');
writeFileSync(photo, Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAVUlEQVRoge3PSQ3AMADAsB6/QhiN8edWGFElWyGQeb5/rP1uazzOQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1A7QJKFwHyx+uV5QAAAABJRU5ErkJggg==',
  'base64'
));

let failed = 0;
const firstLine = (e) => String(e?.message ?? e).split('\n')[0];
const expect =(cond, msg) => { if (cond) console.log('✓', msg); else { failed++; console.log('✗', msg); } };
const browser = await chromium.launch(LAUNCH);
let n = 0;
const tag = Date.now().toString(36); // keeps post texts unique to this run

// A fresh user, logged in through the real login form.
async function freshUser() {
  const username = `dunyo_${Date.now().toString(36)}${n++}`;
  const res = await fetch(`${API}/auth/register.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email: `${username}@example.com`, password: 'password123', display_name: 'Ezekiel Dunyo' }),
  });
  const { token } = await res.json();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${APP}/login`);
  await page.getByLabel('Email').fill(`${username}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(`${APP}/`);
  return { page, ctx, username, token, errors };
}
const postsBy = async (token) => (await (await fetch(`${API}/posts/list.php?feed=all`, { headers: { Authorization: `Bearer ${token}` } })).json()).posts ?? [];
async function expectSessionEnded(page, label) {
  // Wait for the message itself: the in-app redirect may land before or after
  // any navigation this test could wait for.
  const text = page.getByText('Your session has ended. Please log in again.');
  await text.waitFor({ timeout: 8000 }).catch(() => {});
  const onLogin = page.url() === `${APP}/login`;
  const message = onLogin && (await text.isVisible());
  const token = await page.evaluate(() => localStorage.getItem('wavelink_token'));
  expect(onLogin && message && token === null, `${label}: sent to login with "Your session has ended", saved login cleared`);
}

// ---------- Bug 1: sidebar "Profile" said "This account doesn't exist" ----------
try {
  const { page, ctx, username, errors } = await freshUser();
  await page.locator('.left-nav a.nav-item', { hasText: 'Profile' }).click();
  await page.waitForURL(`${APP}/u/${username}`);
  await page.locator('.profile-info h2', { hasText: 'Ezekiel Dunyo' }).waitFor({ timeout: 5000 }).catch(() => {});
  expect(await page.locator('.profile-info h2', { hasText: 'Ezekiel Dunyo' }).isVisible() && !(await page.getByText("This account doesn’t exist").count()),
    'bug 1: sidebar Profile opens /u/<own username> and shows the real profile');

  // The reported case: the account is gone but the browser is still logged in.
  expect(deleteAccount(username) === '1', 'bug 1: (setup) account deleted while the browser stays logged in');
  await page.reload();
  await expectSessionEnded(page, 'bug 1: next visit after the account is deleted');
  expect(errors.length === 0, `bug 1: no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await ctx.close();
} catch (e) {
  failed++;
  console.log(`✗ bug 1: stopped early: ${firstLine(e)}`);
}

// ---------- Bug 2: "For you" composer's Post button never enabled ----------
try {
  const { page, ctx, token, errors } = await freshUser();
  const composer = page.locator('.center .composer');
  const post = composer.getByRole('button', { name: /^(Post|Uploading…|Posting…)$/ });
  await page.getByRole('tab', { name: 'For you', selected: true }).waitFor({ timeout: 5000 }).catch(() => {});
  expect(await page.getByRole('tab', { name: 'For you', selected: true }).isVisible(), 'bug 2: on the "For you" tab');
  expect(await post.isDisabled(), 'bug 2: Post disabled while the composer is empty');
  await composer.getByLabel('Post content').pressSequentially(`Typed into What’s flowing? ${tag}`);
  expect(await post.isEnabled(), 'bug 2: typing enables Post');
  await post.click();
  await page.locator('.center .post', { hasText: `Typed into What’s flowing? ${tag}` }).waitFor({ timeout: 5000 });
  expect(true, 'bug 2: the typed post is published and shown');

  // A photo with no text is a valid post (it used to leave Post disabled).
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), composer.getByRole('button', { name: 'Add a photo' }).click()]);
  await chooser.setFiles(photo);
  await composer.getByRole('status').waitFor({ state: 'detached' });
  expect(await post.isEnabled(), 'bug 2: a photo alone enables Post');
  await post.click();
  const photoPost = page.locator('.center .post').first().locator('img.post-image');
  await photoPost.waitFor({ timeout: 5000 });
  expect(new RegExp(`/${UPLOADS}/posts/`).test(await photoPost.getAttribute('src')), 'bug 2: the photo-only post is published with its image');
  expect((await postsBy(token)).some((p) => p.content === '' && p.image_url), 'bug 2: photo-only post saved in the database');
  expect(errors.length === 0, `bug 2: no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await ctx.close();
} catch (e) {
  failed++;
  console.log(`✗ bug 2: stopped early: ${firstLine(e)}`);
}

// ---------- Bug 3: sidebar "Post" seemed to succeed but nothing appeared ----------
try {
  const { page, ctx, username, token, errors } = await freshUser();
  const dialog = page.getByRole('dialog');

  // Normal case: saved, and shown in the feed and on the profile.
  await page.locator('.left-nav .btn-post').click();
  await dialog.getByLabel('Post content').fill(`From the sidebar Post button ${tag}`);
  await dialog.getByRole('button', { name: 'Post', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.locator('.center .post', { hasText: `From the sidebar Post button ${tag}` }).waitFor({ timeout: 5000 });
  expect((await postsBy(token)).some((p) => p.content === `From the sidebar Post button ${tag}`), 'bug 3: sidebar post is saved in the database');
  await page.goto(`${APP}/u/${username}`);
  await page.locator('.center .post', { hasText: `From the sidebar Post button ${tag}` }).waitFor({ timeout: 5000 });
  expect(true, 'bug 3: sidebar post shows in the feed and on the profile');

  // A failure disguised as success (PHP error page with status 200) must not
  // close the composer, announce a post, or crash the page. The app then asks
  // the server whether the post was saved; this fake reply never reached it,
  // so the answer is a definite "not posted".
  await page.goto(`${APP}/`);
  await page.route('**/posts/create.php', (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<br />\n<b>Fatal error</b>:  Uncaught PDOException: SQLSTATE[23000]: Integrity constraint violation',
  }));
  await page.locator('.left-nav .btn-post').click();
  await dialog.getByLabel('Post content').fill(`Should not vanish ${tag}`);
  await dialog.getByRole('button', { name: 'Post', exact: true }).click();
  await dialog.getByRole('alert').filter({ hasText: 'Not posted: nothing was saved' }).waitFor({ timeout: 5000 }).catch(() => {});
  const stillOpen = (await dialog.count()) > 0;
  expect(stillOpen && (await dialog.getByRole('alert').innerText()).includes('Not posted: nothing was saved'),
    'bug 3: a 200 HTML error page is not taken as success: checked, "Not posted: nothing was saved", composer stays open');
  expect(stillOpen && (await dialog.getByLabel('Post content').inputValue()) === `Should not vanish ${tag}`, 'bug 3: the typed text is kept');
  expect(await page.locator('.left-nav').isVisible(), 'bug 3: page did not crash');
  await page.unroute('**/posts/create.php');
  await page.keyboard.press('Escape');

  // The reported case: account deleted mid-session. Nothing saved, clear outcome.
  await page.locator('.left-nav .btn-post').click();
  await dialog.getByLabel('Post content').fill(`Posted after the account was deleted ${tag}`);
  expect(deleteAccount(username) === '1', 'bug 3: (setup) account deleted with the composer open');
  await dialog.getByRole('button', { name: 'Post', exact: true }).click();
  await expectSessionEnded(page, 'bug 3: posting after the account is deleted');
  const all = await (await fetch(`${API}/posts/list.php?feed=all`)).json();
  expect(!all.posts.some((p) => p.content === `Posted after the account was deleted ${tag}`), 'bug 3: nothing saved for the deleted account');
  expect(errors.length === 0, `bug 3: no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await ctx.close();
} catch (e) {
  failed++;
  console.log(`✗ bug 3: stopped early: ${firstLine(e)}`);
}

// ---------- Bug 4: changing the profile photo didn't work end to end ----------
try {
  const { page, ctx, username, errors } = await freshUser();
  await page.goto(`${APP}/u/${username}`);
  await page.getByRole('button', { name: 'Edit profile' }).click();
  const dialog = page.getByRole('dialog');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
    dialog.getByRole('button', { name: 'Upload photo' }).click(),
  ]);
  expect(!!chooser, 'bug 4: "Upload photo" opens the file picker');
  await chooser.setFiles(photo);
  await dialog.locator('.edit-avatar img.avatar[src^="blob:"]').waitFor();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await dialog.waitFor({ state: 'detached' });
  const header = page.locator('.profile-avatar img.avatar');
  await header.waitFor();
  const src = await header.getAttribute('src');
  expect(new RegExp(`/${UPLOADS}/avatars/[0-9a-f]{32}\\.png$`).test(src), 'bug 4: photo uploaded and shown on the profile');
  expect((await page.locator('.left-nav .nav-user img.avatar').getAttribute('src')) === src, 'bug 4: sidebar shows the new photo too');
  await page.reload();
  await page.locator('.profile-avatar img.avatar').waitFor();
  expect((await page.locator('.profile-avatar img.avatar').getAttribute('src')) === src, 'bug 4: new photo still there after reload (saved)');

  // Account deleted while editing: clear outcome instead of a silent failure.
  await page.getByRole('button', { name: 'Edit profile' }).click();
  expect(deleteAccount(username) === '1', 'bug 4: (setup) account deleted with the editor open');
  const [again] = await Promise.all([page.waitForEvent('filechooser'), dialog.getByRole('button', { name: 'Change photo' }).click()]);
  await again.setFiles(photo);
  await expectSessionEnded(page, 'bug 4: changing the photo after the account is deleted');
  expect(errors.length === 0, `bug 4: no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await ctx.close();
} catch (e) {
  failed++;
  console.log(`✗ bug 4: stopped early: ${firstLine(e)}`);
}

await browser.close();
console.log(failed ? `== ${failed} FAILED` : '== all regression checks passed');
process.exitCode = failed ? 1 : 0;
