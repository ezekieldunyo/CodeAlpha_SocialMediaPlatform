import { chromium } from 'playwright-core';

// Login, posting and liking through the real UI, with the frontend calling
// the backend in API_URL. Checks every API request goes there (e.g. Herd).
import { API, APP, LAUNCH, OUT } from './config.mjs';
const stamp = Date.now().toString(36);

// A second account whose post we'll like, created straight through the API.
const other = await (await fetch(`${API}/auth/register.php`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: `maya_${stamp}`, email: `maya_${stamp}@example.com`, password: 'password123', display_name: 'Maya Osei' }),
})).json();
const { post: mayaPost } = await (await fetch(`${API}/posts/create.php`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${other.token}` },
  body: JSON.stringify({ content: `Hello from Maya via Herd ${stamp}` }),
})).json();

const browser = await chromium.launch(LAUNCH);
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const apiCalls = [];
const errors = [];
page.on('request', (r) => r.url().includes('/api/') && apiCalls.push(`${r.method()} ${r.url()}`));
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/status of 40[14]/.test(m.text()) && errors.push(m.text()));
let failed = 0;
const expect = (cond, msg) => { if (cond) console.log('✓', msg); else { failed++; console.log('✗', msg); } };

// Register through the UI, then log out and log back in.
const email = `ez_${stamp}@example.com`;
await page.goto(`${APP}/register`);
await page.getByLabel('Name', { exact: true }).fill('Ezekiel Dunyo');
await page.locator('.input-prefix input').fill(`ez_${stamp}`);
await page.getByLabel('Email').fill(email);
await page.getByLabel('Password').fill('password123');
await page.getByRole('button', { name: 'Sign up' }).click();
await page.waitForURL(`${APP}/`);
expect(true, 'register via UI');
await page.locator('.left-nav button.nav-item', { hasText: 'More' }).click();
await page.getByRole('menuitem', { name: /Log out/ }).click();
await page.waitForURL(`${APP}/login`);
await page.getByLabel('Email').fill(email);
await page.getByLabel('Password').fill('wrong-password');
await page.getByRole('button', { name: 'Log in' }).click();
await page.getByText('Invalid email or password.').waitFor();
expect(true, 'wrong password shows the API error');
await page.getByLabel('Password').fill('password123');
await page.getByRole('button', { name: 'Log in' }).click();
await page.waitForURL(`${APP}/`);
expect(true, 'login via UI');

// Post.
const text = `First post through Herd ${stamp}`;
await page.getByLabel('Post content').fill(text);
await page.locator('.composer').getByRole('button', { name: 'Post' }).click();
await page.locator('.post', { hasText: text }).waitFor();
expect(true, 'create post via UI');

// Like someone else's post (on their profile), and our own from the feed.
await page.goto(`${APP}/u/maya_${stamp}`);
const card = page.locator('.post', { hasText: mayaPost.content });
await card.locator('.action.like').click();
await card.locator('.action.like.is-liked', { hasText: '1' }).waitFor();
await page.goto(`${APP}/`);
const mine = page.locator('.post', { hasText: text });
await mine.locator('.action.like').click();
await mine.locator('.action.like.is-liked', { hasText: '1' }).waitFor();
expect(true, 'like via UI (own post and another user\'s)');

// Persistence: reload and check the server's view.
await page.reload();
await page.locator('.post', { hasText: text }).locator('.action.like.is-liked', { hasText: '1' }).waitFor();
const token = await page.evaluate(() => localStorage.getItem('wavelink_token'));
const check = await (await fetch(`${API}/posts/get.php?id=${mayaPost.id}`, { headers: { Authorization: `Bearer ${token}` } })).json();
expect(check.post.like_count === 1 && check.post.liked_by_viewer === true, 'like persisted in MySQL via Herd (reload + get.php)');
await page.screenshot({ path: `${OUT}/h1-herd-feed.png` });

// Where did the requests actually go?
const offTarget = apiCalls.filter((c) => !c.split(' ')[1].startsWith(`${API}/`));
expect(apiCalls.length > 0 && offTarget.length === 0, `all ${apiCalls.length} API requests went to ${API}${offTarget.length ? '; off-target: ' + offTarget.join(', ') : ''}`);
expect(apiCalls.some((c) => c.startsWith('OPTIONS') === false && c.includes('likes/toggle.php')), 'likes/toggle.php was called on the configured API');
expect(errors.length === 0, `no page/CORS errors${errors.length ? ': ' + errors.join(' | ') : ''}`);

await browser.close();
console.log(`sample requests:\n  ${[...new Set(apiCalls.map((c) => c.replace(/\?.*/, '')))].slice(0, 8).join('\n  ')}`);
console.log(failed ? `== ${failed} FAILED` : '== all smoke checks passed');
process.exitCode = failed ? 1 : 0;
