import { chromium } from 'playwright-core';

import { API, APP, LAUNCH, OUT } from './config.mjs';

async function call(path, body, token, method = 'POST') {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}
const likeCount = async () =>
  (await call('posts/list.php?feed=user&user_id=1', null, null, 'GET')).posts.find((p) => p.content.startsWith('Just shipped')).like_count;

// Seed: maya with posts; kofi comments on and likes one; ezekiel exists to log in with.
const maya = await call('auth/register.php', { username: 'maya', email: 'maya@example.com', password: 'password123', display_name: 'Maya Osei' });
await call('users/update_profile.php', { bio: 'Backend dev in Accra.' }, maya.token, 'PUT');
await call('posts/create.php', { content: 'Sunset runs along Labadi beach hit different this week.' }, maya.token);
const { post } = await call('posts/create.php', { content: 'Just shipped my first PHP API with JWT auth.' }, maya.token);
const kofi = await call('auth/register.php', { username: 'kofi', email: 'kofi@example.com', password: 'password123', display_name: 'Kofi Mensah' });
await call('comments/create.php', { post_id: post.id, content: 'Congrats Maya!' }, kofi.token);
await call('likes/toggle.php', { post_id: post.id }, kofi.token);
await call('follow/toggle.php', { user_id: 1 }, kofi.token);
await call('auth/register.php', { username: 'ezekiel', email: 'ez@example.com', password: 'password123', display_name: 'Ezekiel Dunyo' });

const browser = await chromium.launch(LAUNCH);
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();
const errors = [];
const unauthorized = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => r.url().includes('/api/') && r.status() === 401 && unauthorized.push(r.url()));
let failed = 0;
const step = (s) => console.log('✓', s);
const expect = (cond, msg) => { if (cond) step(msg); else { failed++; console.log('✗', msg); } };
const mayaPost = () => page.locator('.post', { hasText: 'Just shipped' });

// 1. Guest opens a profile directly: no redirect, posts visible, read-only chrome.
await page.goto(`${APP}/u/maya`);
await page.getByText('Backend dev in Accra.').waitFor();
expect(page.url() === `${APP}/u/maya`, 'guest stays on /u/maya (no login redirect)');
await mayaPost().waitFor();
expect((await page.locator('.post').count()) === 2, "guest sees both of maya's posts");
expect((await mayaPost().locator('.action.like').innerText()).trim() === '1', 'like count visible (1)');
expect(await page.locator('.profile-stats').getByText('1').first().isVisible(), 'follower count visible');
expect(await page.locator('.guest-banner').isVisible(), 'guest banner shown');
expect((await page.locator('.composer').count()) === 0, 'no composer for guests');
expect((await page.locator('.left-nav .nav-item').count()) === 0, 'no member nav items for guests');
expect((await page.locator('.post .action.danger').count()) === 0, 'no delete buttons for guests');
expect(await page.locator('.right-rail').getByText('New to wavelink?').isVisible(), 'rail shows sign-up card, not suggestions');
await page.screenshot({ path: `${OUT}/g1-guest-profile.png` });

// 2. Read-only thread and followers list.
await mayaPost().locator('.action').first().click();
await mayaPost().locator('.comment', { hasText: 'Congrats Maya!' }).waitFor();
expect(await mayaPost().getByRole('button', { name: 'Log in to reply' }).isVisible(), 'guest reads comments; reply replaced by "Log in to reply"');
await page.locator('.profile-stats button').nth(1).click();
await page.getByRole('dialog').getByText('Kofi Mensah').waitFor();
step('guest can open the followers list');
await page.keyboard.press('Escape');
await page.screenshot({ path: `${OUT}/g2-guest-thread.png` });

// 3. Trying to like is the moment we redirect.
const before = await likeCount();
await mayaPost().locator('.action.like').click();
await page.waitForURL(`${APP}/login`);
await page.getByText('Log in to like posts.').waitFor();
expect((await likeCount()) === before, 'like attempt redirected to /login with reason; no like was recorded');
await page.screenshot({ path: `${OUT}/g3-login-reason.png` });

// 4. Logging in returns to the profile, where liking now works.
await page.getByLabel('Email').fill('ez@example.com');
await page.getByLabel('Password').fill('password123');
await page.getByRole('button', { name: 'Log in' }).click();
await page.waitForURL(`${APP}/u/maya`);
step('after login, returned to /u/maya');
await mayaPost().locator('.action.like').click();
await mayaPost().locator('.action.like.is-liked', { hasText: '2' }).waitFor();
expect((await likeCount()) === 2, 'signed-in like recorded (count 2)');
expect((await page.locator('.guest-banner').count()) === 0, 'guest banner gone once signed in');

// 5. Other gates, in a fresh logged-out context.
const guest = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const g = await guest.newPage();
g.on('response', (r) => r.url().includes('/api/') && r.status() === 401 && unauthorized.push(r.url()));
await g.goto(`${APP}/u/maya`);
await g.locator('.profile-top').getByRole('button', { name: 'Follow', exact: true }).click();
await g.waitForURL(`${APP}/login`);
expect(await g.getByText('Log in to follow people.').isVisible(), 'follow attempt -> /login with reason');
await g.getByRole('link', { name: '← Keep browsing' }).click();
await g.waitForURL(`${APP}/u/maya`);
await g.locator('.post', { hasText: 'Just shipped' }).locator('.action').first().click();
await g.getByRole('button', { name: 'Log in to reply' }).click();
await g.waitForURL(`${APP}/login`);
expect(await g.getByText('Log in to reply to posts.').isVisible(), 'reply attempt -> /login with reason');
// '/' is public now ("For you"); its guest behaviour is covered in feed.mjs.
for (const path of ['/explore', '/notifications']) {
  await g.goto(`${APP}${path}`);
  await g.waitForURL(`${APP}/login`);
  step(`guest visiting ${path} -> /login`);
}
// Sign up from the banner and land back on the profile.
await g.goto(`${APP}/u/maya`);
await g.locator('.guest-banner').getByRole('link', { name: 'Sign up' }).click();
await g.waitForURL(`${APP}/register`);
await g.getByLabel('Name', { exact: true }).fill('Ama Serwaa');
await g.locator('.input-prefix input').fill('amaserwaa');
await g.getByLabel('Email').fill('ama@example.com');
await g.getByLabel('Password').fill('password123');
await g.getByRole('button', { name: 'Sign up' }).click();
await g.waitForURL(`${APP}/u/maya`);
step('sign up from guest banner returns to /u/maya');

// 6. Mobile guest view.
const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await m.newPage();
await mp.goto(`${APP}/u/maya`);
await mp.locator('.post').first().waitFor();
expect(await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile guest: no horizontal scroll');
expect((await mp.locator('.bottom-bar').count()) === 0 && (await mp.locator('.fab').count()) === 0, 'mobile guest: no member tab bar or post button');
await mp.screenshot({ path: `${OUT}/g4-guest-mobile.png`, fullPage: false });

// Guest browsing and the redirects themselves never need to hit an auth-only endpoint.
expect(unauthorized.length === 0, `no 401s during guest browsing${unauthorized.length ? ': ' + unauthorized.join(', ') : ''}`);
expect(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);

await browser.close();
console.log(failed ? `== ${failed} FAILED` : '== all guest checks passed');
process.exitCode = failed ? 1 : 0;
