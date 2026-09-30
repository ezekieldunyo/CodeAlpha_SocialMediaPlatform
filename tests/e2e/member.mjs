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
const seed = [
  ['maya', 'Maya Osei', ['Just shipped my first PHP API with JWT auth. Prepared statements everywhere 🔒', 'Sunset runs along Labadi beach hit different this week.']],
  ['kofi', 'Kofi Mensah', ['Hot take: hairline dividers > card shadows for feeds.', 'Anyone else learning React this month? Share your favourite resources.']],
  ['lina', 'Lina Park', ['Coffee, code, repeat ☕']],
];
const tokens = {};
for (const [u, name, posts] of seed) {
  const r = await call('auth/register.php', { username: u, email: `${u}@example.com`, password: 'password123', display_name: name });
  tokens[u] = r.token;
  for (const content of posts) await call('posts/create.php', { content }, r.token);
}
await call('users/update_profile.php', { bio: 'Backend dev in Accra. Building things with PHP & React.' }, tokens.maya, 'PUT');
await call('follow/toggle.php', { user_id: 1 }, tokens.kofi);
await call('follow/toggle.php', { user_id: 1 }, tokens.lina);

const browser = await chromium.launch(LAUNCH);
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const step = (s) => console.log('✓', s);

// Register
await page.goto(`${APP}/register`);
await page.screenshot({ path: `${OUT}/01-register.png` });
await page.getByLabel('Name', { exact: true }).fill('Ezekiel Dunyo');
await page.locator('.input-prefix input').fill('ezekiel');
await page.getByLabel('Email').fill('ez@example.com');
await page.getByLabel('Password').fill('password123');
await page.getByRole('button', { name: 'Sign up' }).click();
await page.waitForURL(`${APP}/`);
// "For you" is the default tab and already shows other people's posts.
await page.getByRole('tab', { name: 'For you', selected: true }).waitFor();
await page.locator('.post', { hasText: 'Prepared statements everywhere' }).waitFor();
await page.getByRole('tab', { name: 'Following' }).click();
await page.getByText('Your feed is quiet.').waitFor();
step('registered: lands on "For you" (everyone\'s posts); "Following" is empty');

// Follow from right rail
const mayaRow = page.locator('.right-rail .user-row', { hasText: 'Maya Osei' });
await mayaRow.getByRole('button', { name: 'Follow', exact: true }).click();
await mayaRow.getByRole('button', { name: /Following|Unfollow/ }).waitFor();
step('followed Maya from Who to follow');

// Post from composer
await page.getByLabel('Post content').fill('Hello Wavelink! First post from the React frontend.');
await page.locator('.composer').getByRole('button', { name: 'Post' }).click();
await page.locator('.post', { hasText: 'First post from the React frontend' }).waitFor();
step('created a post, it was prepended');

// Reload, switch to Following -> Maya's posts now appear there
await page.reload();
await page.getByRole('tab', { name: 'Following' }).click();
await page.locator('.post', { hasText: 'Prepared statements everywhere' }).waitFor();
step('"Following" shows followed user posts after reload');

// Like
const mayaPost = page.locator('.post', { hasText: 'Prepared statements everywhere' });
await mayaPost.locator('.action.like').click();
await mayaPost.locator('.action.like.is-liked', { hasText: '1' }).waitFor();
step('liked a post (count 1)');

// Comment
await mayaPost.locator('.action').first().click();
await mayaPost.getByPlaceholder('Write a reply…').fill('Nice work, Maya!');
await mayaPost.getByRole('button', { name: 'Reply' }).click();
await mayaPost.locator('.comment', { hasText: 'Nice work, Maya!' }).waitFor();
await mayaPost.locator('.action').first().filter({ hasText: '1' }).waitFor();
step('commented; comment count updated');
await page.screenshot({ path: `${OUT}/02-feed-desktop.png` });

// Post button modal
await page.locator('.left-nav .btn-post').click();
await page.getByRole('dialog').getByLabel('Post content').fill('Posted from the nav modal');
await page.getByRole('dialog').getByRole('button', { name: 'Post' }).click();
await page.getByRole('dialog').waitFor({ state: 'detached' });
await page.locator('.post', { hasText: 'Posted from the nav modal' }).waitFor();
step('Post button modal creates post and closes');

// Delete own post
page.once('dialog', (d) => d.accept());
await page.locator('.post', { hasText: 'Posted from the nav modal' }).getByRole('button', { name: 'More options' }).click();
await page.getByRole('menuitem', { name: 'Delete post' }).click();
await page.locator('.post', { hasText: 'Posted from the nav modal' }).waitFor({ state: 'detached' });
step('deleted own post');

// Other's profile + unfollow
await page.locator('.post .name', { hasText: 'Maya Osei' }).first().click();
await page.waitForURL(`${APP}/u/maya`);
await page.getByText('Backend dev in Accra').waitFor();
await page.locator('.profile-stats').getByText('Followers').waitFor();
const followersBefore = await page.locator('.profile-stats button').nth(1).innerText();
await page.screenshot({ path: `${OUT}/03-profile-other.png` });
await page.locator('.profile-top').getByRole('button', { name: /Following|Unfollow/ }).click();
await page.locator('.profile-top').getByRole('button', { name: 'Follow', exact: true }).waitFor();
const followersAfter = await page.locator('.profile-stats button').nth(1).innerText();
step(`unfollowed on profile: "${followersBefore}" -> "${followersAfter}"`);

// Followers modal
await page.locator('.profile-stats button').nth(1).click();
await page.getByRole('dialog').getByText('Kofi Mensah').waitFor();
await page.keyboard.press('Escape');
step('followers list modal');

// Own profile + edit
await page.goto(`${APP}/u/ezekiel`);
await page.getByRole('button', { name: 'Edit profile' }).click();
await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Ezekiel D.');
await page.getByRole('dialog').getByLabel('Bio').fill('Full stack dev · CodeAlpha intern');
await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
await page.getByRole('dialog').waitFor({ state: 'detached' });
await page.locator('.profile-info h2', { hasText: 'Ezekiel D.' }).waitFor();
await page.locator('.post .name', { hasText: 'Ezekiel D.' }).first().waitFor();
await page.getByText('Full stack dev · CodeAlpha intern').waitFor();
step('edited own profile; name updated on header and posts');
await page.screenshot({ path: `${OUT}/04-profile-own.png` });

// Tablet + mobile
await page.setViewportSize({ width: 1100, height: 850 });
await page.goto(`${APP}/`);
await page.locator('.post').first().waitFor();
await page.screenshot({ path: `${OUT}/05-feed-collapsed-nav.png` });

await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.locator('.post').first().waitFor();
const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
await page.screenshot({ path: `${OUT}/06-feed-mobile.png` });
await page.locator('.bottom-bar').getByRole('link', { name: 'Profile' }).click();
await page.waitForURL(`${APP}/u/ezekiel`);
await page.screenshot({ path: `${OUT}/07-profile-mobile.png` });
step(`mobile layout (no horizontal scroll: ${noHScroll})`);

// Logout + login
await page.locator('.bottom-bar').getByRole('button', { name: 'Log out' }).click();
await page.waitForURL(`${APP}/login`);
await page.screenshot({ path: `${OUT}/08-login-mobile.png` });
await page.getByLabel('Email').fill('ez@example.com');
await page.getByLabel('Password').fill('wrongpass');
await page.getByRole('button', { name: 'Log in' }).click();
await page.getByText('Invalid email or password.').waitFor();
await page.getByLabel('Password').fill('password123');
await page.getByRole('button', { name: 'Log in' }).click();
await page.waitForURL(`${APP}/`);
step('logout, bad-password error, login');

// Expired/garbage token -> the app checks it with the server on start-up,
// signs out and says why on the login page.
// Uses a fresh browser context whose storage holds the bad token before the
// app first loads. (Swapping the token in a page that's still loading lets that
// page sign out first, and a reload would then start already signed out.)
const savedUser = await page.evaluate(() => localStorage.getItem('wavelink_user'));
const staleCtx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await staleCtx.addInitScript((user) => {
  if (sessionStorage.getItem('seeded')) return; // only before the first load
  sessionStorage.setItem('seeded', '1');
  localStorage.setItem('wavelink_token', 'garbage.token.value');
  localStorage.setItem('wavelink_user', user);
}, savedUser);
const stale = await staleCtx.newPage();
stale.on('pageerror', (e) => errors.push(e.message));
await stale.goto(`${APP}/`);
await stale.getByText('Your session has ended. Please log in again.').waitFor();
if (stale.url() !== `${APP}/login`) throw new Error(`expected /login, got ${stale.url()}`);
const tokenLeft = await stale.evaluate(() => localStorage.getItem('wavelink_token'));
if (tokenLeft !== null) throw new Error('invalid token was not cleared');
await staleCtx.close();
step('invalid token signs the user out (sent to login with "Your session has ended", token cleared)');

await page.setViewportSize({ width: 1400, height: 900 });
await page.goto(`${APP}/login`);
await page.screenshot({ path: `${OUT}/09-login-desktop.png` });

console.log('console/page errors:', errors.length ? errors : 'none');
await browser.close();
