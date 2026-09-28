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

// Seed
const maya = await call('auth/register.php', { username: 'maya', email: 'maya@example.com', password: 'password123', display_name: 'Maya Osei' });
await call('posts/create.php', { content: 'Sunset runs along Labadi beach hit different this week.' }, maya.token);
const { post } = await call('posts/create.php', { content: 'Just shipped my first PHP API with JWT auth.' }, maya.token);
const kofi = await call('auth/register.php', { username: 'kofi', email: 'kofi@example.com', password: 'password123', display_name: 'Kofi Mensah' });
await call('comments/create.php', { post_id: post.id, content: 'Congrats Maya!' }, kofi.token);
await call('likes/toggle.php', { post_id: post.id }, kofi.token);
const ez = await call('auth/register.php', { username: 'ezekiel', email: 'ez@example.com', password: 'password123', display_name: 'Ezekiel Dunyo' });
await call('follow/toggle.php', { user_id: maya.user.id }, ez.token);
const POST_URL = `${APP}/post/${post.id}`;

const browser = await chromium.launch(LAUNCH);
let failed = 0;
const errors = [];
const expect = (cond, msg) => { if (cond) console.log('✓', msg); else { failed++; console.log('✗', msg); } };
const watch = (p) => p.on('pageerror', (e) => errors.push(e.message));

// ---------- Guest ----------
const guest = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const g = await guest.newPage();
watch(g);
await g.goto(`${APP}/u/maya`);
const card = g.locator('.post', { hasText: 'Just shipped' });
await card.locator('a.post-time').click();
await g.waitForURL(POST_URL);
expect(true, 'guest: timestamp on profile links to /post/:id');
const detail = g.locator('.post-detail');
await detail.locator('.comment', { hasText: 'Congrats Maya!' }).waitFor();
expect(true, 'guest: full comment thread shown without clicking');
expect((await detail.locator('.action.like').innerText()).trim() === '1', 'guest: like count shown (1)');
expect(await detail.getByRole('button', { name: 'Log in to reply' }).isVisible(), 'guest: reply replaced by "Log in to reply"');
expect((await detail.locator('.action.danger').count()) === 0, 'guest: no delete button');
expect((await g.locator('.post-detail a.post-time').count()) === 0, 'detail view: timestamp is not a self-link');
await g.screenshot({ path: `${OUT}/p1-post-guest.png` });

// Reply attempt -> login with reason, then back.
await detail.getByRole('button', { name: 'Log in to reply' }).click();
await g.waitForURL(`${APP}/login`);
expect(await g.getByText('Log in to reply to posts.').isVisible(), 'guest: reply attempt -> /login with reason');
await g.getByRole('link', { name: '← Keep browsing' }).click();
await g.waitForURL(POST_URL);
expect(true, 'login page "Keep browsing" returns to the post');
await g.locator('.post-detail').waitFor();

// Like attempt -> login with reason -> log in -> back on the post, like works.
await g.locator('.post-detail .action.like').click();
await g.waitForURL(`${APP}/login`);
expect(await g.getByText('Log in to like posts.').isVisible(), 'guest: like attempt -> /login with reason');
const afterGuest = await call(`posts/get.php?id=${post.id}`, null, null, 'GET');
expect(afterGuest.post.like_count === 1, 'guest: no like recorded by the redirect');
await g.getByLabel('Email').fill('ez@example.com');
await g.getByLabel('Password').fill('password123');
await g.getByRole('button', { name: 'Log in' }).click();
await g.waitForURL(POST_URL);
expect(true, 'after login: returned to /post/:id');
const d = g.locator('.post-detail');
await d.locator('.action.like').click();
await d.locator('.action.like.is-liked', { hasText: '2' }).waitFor();
await d.getByPlaceholder('Write a reply…').fill('Great write-up!');
await d.getByRole('button', { name: 'Reply' }).click();
await d.locator('.comment', { hasText: 'Great write-up!' }).waitFor();
await d.locator('.action').first().filter({ hasText: '2' }).waitFor();
const server = (await call(`posts/get.php?id=${post.id}`, null, ez.token, 'GET')).post;
expect(server.like_count === 2 && server.liked_by_viewer && server.comment_count === 2, 'signed in on post page: like + reply saved (2 likes, 2 comments)');
await g.screenshot({ path: `${OUT}/p2-post-member.png` });

// Back returns to the profile the guest came from; counts there match.
await g.getByRole('button', { name: 'Back' }).click();
await g.waitForURL(`${APP}/u/maya`);
expect(true, 'after login round-trip, one Back press returns to the profile (no duplicate history entry)');
await g.locator('.post', { hasText: 'Just shipped' }).waitFor();
const again = g.locator('.post', { hasText: 'Just shipped' });
expect((await again.locator('.action.like.is-liked').innerText()).trim() === '2', 'profile shows the new like (2, liked)');
expect((await again.locator('.action').first().innerText()).trim() === '2', 'profile shows the new comment count (2)');

// ---------- Member flows ----------
const member = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const m = await member.newPage();
watch(m);
await m.goto(`${APP}/login`);
await m.getByLabel('Email').fill('ez@example.com');
await m.getByLabel('Password').fill('password123');
await m.getByRole('button', { name: 'Log in' }).click();
await m.waitForURL(`${APP}/`);
// Clicking post content in the home feed opens the post.
await m.locator('.post .post-text', { hasText: 'Sunset runs' }).click();
await m.waitForURL(/\/post\/\d+$/);
expect(true, 'member: clicking content in the home feed opens /post/:id');
await m.locator('.post-detail .post-text').click();
await m.waitForTimeout(300);
expect(/\/post\/\d+$/.test(m.url()), 'detail view: clicking content stays put');
// Back from a post returns to the feed.
await m.getByRole('button', { name: 'Back' }).click();
await m.waitForURL(`${APP}/`);
expect(true, 'member: Back from post returns to the feed');

// Own post: open from own profile, delete from the detail page.
const { post: mine } = await call('posts/create.php', { content: 'Temporary post to delete' }, ez.token);
await m.goto(`${APP}/u/ezekiel`);
await m.locator('.post', { hasText: 'Temporary post' }).locator('a.post-time').click();
await m.waitForURL(`${APP}/post/${mine.id}`);
m.once('dialog', (dlg) => dlg.accept());
await m.locator('.post-detail').getByLabel('Delete post').click();
await m.waitForURL(`${APP}/u/ezekiel`);
// navigate() changes the URL before React renders the new route; wait for the profile.
await m.locator('.profile-info').waitFor();
await m.locator('.post, .empty').first().waitFor();
expect((await m.locator('.post', { hasText: 'Temporary post' }).count()) === 0, 'member: deleting from the post page returns to own profile, post gone');
await m.goto(`${APP}/post/${mine.id}`);
await m.getByText('This post doesn’t exist').waitFor();
expect(true, 'deleted post URL shows "This post doesn’t exist"');

// Mobile guest view of a post.
const mob = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await mob.newPage();
watch(mp);
await mp.goto(POST_URL);
await mp.locator('.post-detail .comment').first().waitFor();
expect(await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile: post page has no horizontal scroll');
await mp.screenshot({ path: `${OUT}/p3-post-mobile.png` });

expect(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
console.log(failed ? `== ${failed} FAILED` : '== all post-page checks passed');
process.exitCode = failed ? 1 : 0;
