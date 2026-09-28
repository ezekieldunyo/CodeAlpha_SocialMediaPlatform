import { chromium } from 'playwright-core';
import { API, APP, LAUNCH, OUT } from './config.mjs';

// Home feed tabs ("For you" = feed=all, "Following" = feed=home), the
// "Who to follow" empty states and the right-rail footer. Needs an empty DB.

async function call(path, body, token, method = 'POST') {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}
const register = (username, name) =>
  call('auth/register.php', { username, email: `${username}@example.com`, password: 'password123', display_name: name });

let failed = 0;
const errors = [];
const expect = (cond, msg) => { if (cond) console.log('✓', msg); else { failed++; console.log('✗', msg); } };
const browser = await chromium.launch(LAUNCH);

async function logIn(page, email) {
  await page.goto(`${APP}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(`${APP}/`);
}

// ---------- 1. Only one user on wavelink ----------
await register('solo', 'Solo Founder');
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
await logIn(page, 'solo@example.com');

const rail = page.locator('.right-rail');
await rail.getByText('No one else has joined yet.').waitFor();
expect(!(await rail.getByText("You're following everyone here").count()), 'only user: "Who to follow" says "No one else has joined yet."');
const footer = (await rail.locator('.rail-footer').innerText()).trim();
expect(footer === `wavelink · ${new Date().getFullYear()}`, `footer reads exactly "wavelink · ${new Date().getFullYear()}" (got "${footer}")`);
expect(await page.getByRole('tab', { name: 'For you', selected: true }).isVisible(), '"For you" is the default tab');
const tabNames = await page.getByRole('tab').allInnerTexts();
expect(tabNames.join('|') === 'For you|Following', `tab order is For you, Following (got ${tabNames.join(', ')})`);
expect(await page.getByText('Nothing here yet.').isVisible(), '"For you" empty state when nobody has posted');
await page.goto(`${APP}/explore`);
await page.locator('.center').getByText('No one else has joined yet.').waitFor();
expect(true, 'only user: Explore also says "No one else has joined yet."');
await page.screenshot({ path: `${OUT}/f1-solo.png` });

// ---------- 2. Others join and post ----------
const maya = await register('maya', 'Maya Osei');
const kofi = await register('kofi', 'Kofi Mensah');
for (let i = 1; i <= 25; i++) await call('posts/create.php', { content: `Maya post #${i}` }, maya.token);
await call('posts/create.php', { content: 'Kofi here, newest post on wavelink' }, kofi.token);

await page.goto(`${APP}/`);
const posts = page.locator('.center .post');
await posts.first().waitFor();
const firstTwo = (await posts.locator('.post-text').allInnerTexts()).slice(0, 2);
expect(firstTwo[0] === 'Kofi here, newest post on wavelink' && firstTwo[1] === 'Maya post #25', `"For you" shows everyone's posts, newest first (got: ${firstTwo.join(' / ')})`);
expect((await posts.count()) === 20, `"For you" first page has 20 posts (got ${await posts.count()})`);
await page.locator('.center .post').nth(19).scrollIntoViewIfNeeded();
await page.getByText("You're all caught up.").waitFor();
expect((await posts.count()) === 26, `"For you" loads the next page on scroll: 26 posts total (got ${await posts.count()})`);
const texts = await posts.locator('.post-text').allInnerTexts();
expect(new Set(texts).size === 26 && texts.at(-1) === 'Maya post #1', 'no duplicates across pages; oldest post last');

// The rail loads suggestions once per page load, so reload to pick up the new users.
await page.reload();
await rail.locator('.user-row', { hasText: 'Kofi Mensah' }).waitFor();
expect(!(await rail.getByText('No one else has joined yet.').count()), 'with other users: "Who to follow" lists them instead of the message');

// "Following" still works as before: nothing until you follow someone.
await page.getByRole('tab', { name: 'Following' }).click();
await page.getByText('Your feed is quiet.').waitFor();
expect(true, '"Following" is empty before following anyone');
await rail.locator('.user-row', { hasText: 'Kofi Mensah' }).getByRole('button', { name: 'Follow', exact: true }).click();
await rail.locator('.user-row', { hasText: 'Kofi Mensah' }).getByRole('button', { name: /Following|Unfollow/ }).waitFor();
await page.getByRole('tab', { name: 'For you' }).click();
await page.getByRole('tab', { name: 'Following' }).click();
await page.locator('.center .post').first().waitFor();
const followingTexts = await page.locator('.center .post .post-text').allInnerTexts();
expect(followingTexts.length === 1 && followingTexts[0].startsWith('Kofi here'), `"Following" shows only followed users' posts (got ${followingTexts.length})`);

// Posting from "For you" prepends there; liking persists across reloads.
await page.getByRole('tab', { name: 'For you' }).click();
await page.getByLabel('Post content').fill('Solo posting into For you');
await page.locator('.composer').getByRole('button', { name: 'Post' }).click();
await page.locator('.center .post').first().filter({ hasText: 'Solo posting into For you' }).waitFor();
expect(true, 'new post is prepended to "For you"');
const kofiPost = page.locator('.center .post', { hasText: 'Kofi here' });
await kofiPost.locator('.action.like').click();
await kofiPost.locator('.action.like.is-liked', { hasText: '1' }).waitFor();
await page.reload();
await page.locator('.center .post', { hasText: 'Kofi here' }).locator('.action.like.is-liked', { hasText: '1' }).waitFor();
expect(true, 'like on "For you" persists after reload (liked_by_viewer)');
await page.screenshot({ path: `${OUT}/f2-for-you.png` });

// ---------- 3. Guests ----------
const gctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const g = await gctx.newPage();
g.on('pageerror', (e) => errors.push(e.message));
const unauthorized = [];
g.on('response', (r) => r.url().includes('/api/') && r.status() === 401 && unauthorized.push(r.url()));
await g.goto(`${APP}/`);
await g.locator('.center .post').first().waitFor();
expect(g.url() === `${APP}/`, 'guest: "/" shows the "For you" feed instead of redirecting');
expect(await g.getByRole('tab', { name: 'For you', selected: true }).isVisible(), 'guest: "For you" selected');
expect((await g.locator('.composer').count()) === 0 && (await g.locator('.guest-banner').isVisible()), 'guest: read-only (no composer, guest banner shown)');
expect((await g.locator('.center .post', { hasText: 'Kofi here' }).locator('.action.like').innerText()).trim() === '1', 'guest: like counts visible');
await g.screenshot({ path: `${OUT}/f3-guest-for-you.png` });
await g.getByRole('tab', { name: 'Following' }).click();
await g.waitForURL(`${APP}/login`);
expect(await g.getByText('Log in to see posts from people you follow.').isVisible(), 'guest: "Following" -> /login with reason');
await g.getByRole('link', { name: '← Keep browsing' }).click();
await g.waitForURL(`${APP}/`);
await g.locator('.center .post').first().waitFor();
expect(true, 'guest: "Keep browsing" returns to "For you"');
expect(unauthorized.length === 0, `guest: no 401s while browsing "For you"${unauthorized.length ? ': ' + unauthorized.join(', ') : ''}`);

expect(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
console.log(failed ? `== ${failed} FAILED` : '== all feed checks passed');
process.exitCode = failed ? 1 : 0;
