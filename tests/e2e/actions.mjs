import { chromium } from 'playwright-core';
import { API, APP, LAUNCH, OUT } from './config.mjs';

// Post actions: who sees delete, the "⋯" menu, share (copy link) and
// bookmarks (save, Saved page). Needs an empty test database (run-all.sh).

let failed = 0;
const errors = [];
const expect = (cond, msg) => { if (cond) console.log('✓', msg); else { failed++; console.log('✗', msg); } };
const firstLine = (e) => String(e?.message ?? e).split('\n')[0];
const tag = Date.now().toString(36);

async function register(username, name) {
  const res = await fetch(`${API}/auth/register.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email: `${username}@example.com`, password: 'password123', display_name: name }),
  });
  return res.json();
}
async function createPost(token, content) {
  const res = await fetch(`${API}/posts/create.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content }),
  });
  return (await res.json()).post;
}

const ann = await register(`ann_${tag}`, 'Ann Author');
const ben = await register(`ben_${tag}`, 'Ben Reader');
const annPost = await createPost(ann.token, `Ann's post ${tag}`);
const annPost2 = await createPost(ann.token, `Ann's second post ${tag}`);
const benPost = await createPost(ben.token, `Ben's post ${tag}`);

const browser = await chromium.launch(LAUNCH);
// A logged-in page (session seeded before the app loads).
async function as(user, { viewport = { width: 1400, height: 900 }, clipboard = false } = {}) {
  const ctx = await browser.newContext({ viewport });
  if (clipboard) await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: APP });
  if (user) {
    await ctx.addInitScript(([token, u]) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('wavelink_token', token);
      localStorage.setItem('wavelink_user', JSON.stringify(u));
    }, [user.token, user.user]);
  }
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  return page;
}
const postCard = (page, text) => page.locator('.center .post', { hasText: text });
const actionLabels = (card) => card.locator('.post-actions button').evaluateAll((els) => els.map((b) => b.getAttribute('aria-label')));
const rowOrderOk = (labels) =>
  labels.length === 4 && /comments$/.test(labels[0]) && labels[1] === 'Copy link to post' && /^(Like|Unlike)/.test(labels[2]) && /^(Save post|Remove from saved)$/.test(labels[3]);

// ---------- Delete is visible only to the author ----------
try {
  const b = await as(ben);
  await b.goto(`${APP}/`);
  await postCard(b, `Ann's post ${tag}`).waitFor();
  const annCard = postCard(b, `Ann's post ${tag}`);
  expect((await annCard.getByRole('button', { name: 'More options' }).count()) === 0 && (await annCard.getByText('Delete post').count()) === 0,
    "another user (Ben) sees no ⋯ / delete on Ann's post in the feed");
  expect((await b.locator('.post-actions').getByRole('button', { name: /delete/i }).count()) === 0, 'no delete button in any action row');
  expect((await postCard(b, `Ben's post ${tag}`).getByRole('button', { name: 'More options' }).count()) === 1, "Ben does see ⋯ on his own post");
  await b.goto(`${APP}/post/${annPost.id}`);
  await b.locator('.post-detail').waitFor();
  expect((await b.locator('.post-detail').getByRole('button', { name: 'More options' }).count()) === 0, "no ⋯ on Ann's post page for Ben");
  await b.goto(`${APP}/u/${ann.user.username}`);
  await postCard(b, `Ann's post ${tag}`).waitFor();
  expect((await b.locator('.center').getByRole('button', { name: 'More options' }).count()) === 0, "no ⋯ anywhere on Ann's profile for Ben");
  await b.context().close();

  const g = await as(null);
  await g.goto(`${APP}/`);
  await postCard(g, `Ann's post ${tag}`).waitFor();
  expect((await g.getByRole('button', { name: 'More options' }).count()) === 0 && (await g.getByText('Delete post').count()) === 0, 'guests see no ⋯ / delete on any post');
  const labels = await actionLabels(postCard(g, `Ann's post ${tag}`));
  expect(rowOrderOk(labels), `guest action row: comments, share, likes, bookmark (${labels.join(' | ')})`);
  await g.context().close();
} catch (e) { failed++; console.log(`✗ delete visibility: stopped early: ${firstLine(e)}`); }

// ---------- The "⋯" menu (author) ----------
try {
  const a = await as(ann);
  await a.goto(`${APP}/`);
  const card = postCard(a, `Ann's second post ${tag}`);
  await card.waitFor();
  const labels = await actionLabels(card);
  expect(rowOrderOk(labels), `author action row: comments, share, likes, bookmark, no delete (${labels.join(' | ')})`);
  expect((await postCard(a, `Ben's post ${tag}`).getByRole('button', { name: 'More options' }).count()) === 0, "Ann sees no ⋯ on Ben's post");

  const more = card.getByRole('button', { name: 'More options' });
  await more.click();
  const item = a.getByRole('menuitem', { name: 'Delete post' });
  expect(await item.isVisible() && (await more.getAttribute('aria-expanded')) === 'true', '⋯ opens a menu with "Delete post"');
  await a.screenshot({ path: `${OUT}/a1-post-menu.png`, clip: { x: 360, y: 0, width: 620, height: 360 } });
  await a.keyboard.press('Escape');
  expect((await item.count()) === 0, 'Escape closes the menu');
  await more.click();
  await a.locator('.page-header').click();
  expect((await item.count()) === 0, 'clicking elsewhere closes the menu');

  // Cancelling the confirmation keeps the post.
  let asked = '';
  a.once('dialog', (d) => { asked = d.message(); d.dismiss(); });
  await more.click();
  await item.click();
  await a.waitForTimeout(300);
  expect(asked.includes('Delete this post') && (await card.count()) === 1, 'Delete asks for confirmation; cancelling keeps the post');
  // Confirming deletes it.
  a.once('dialog', (d) => d.accept());
  await more.click();
  await item.click();
  await card.waitFor({ state: 'detached' });
  const gone = await fetch(`${API}/posts/get.php?id=${annPost2.id}`);
  expect(gone.status === 404, 'confirming deletes the post (API 404 afterwards)');
  await a.context().close();
} catch (e) { failed++; console.log(`✗ ⋯ menu: stopped early: ${firstLine(e)}`); }

// ---------- Share (copy link), including guests ----------
for (const [who, user] of [['logged-in user', ben], ['guest', null]]) {
  try {
    const p = await as(user, { clipboard: true });
    await p.goto(`${APP}/`);
    const card = postCard(p, `Ann's post ${tag}`);
    await card.waitFor();
    await card.getByRole('button', { name: 'Copy link to post' }).click();
    const note = card.locator('.copied-note');
    await note.filter({ hasText: 'Link copied' }).waitFor({ timeout: 3000 });
    const copied = await p.evaluate(() => navigator.clipboard.readText());
    expect(copied === `${APP}/post/${annPost.id}`, `${who}: share copies the post link (${copied})`);
    expect(true, `${who}: "Link copied" confirmation shown`);
    if (!user) await p.screenshot({ path: `${OUT}/a2-link-copied.png`, clip: { x: 360, y: 0, width: 620, height: 360 } });
    await note.filter({ hasText: 'Link copied' }).waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
    expect((await note.innerText()) === '', `${who}: confirmation disappears after a moment`);
    await p.goto(copied);
    await p.locator('.post-detail', { hasText: `Ann's post ${tag}` }).waitFor({ timeout: 5000 });
    expect(true, `${who}: the copied link opens the post page`);
    await p.context().close();
  } catch (e) { failed++; console.log(`✗ share (${who}): stopped early: ${firstLine(e)}`); }
}

// ---------- Bookmarks ----------
try {
  // Guests are sent to log in.
  const g = await as(null);
  await g.goto(`${APP}/`);
  await postCard(g, `Ann's post ${tag}`).getByRole('button', { name: 'Save post' }).click();
  await g.getByText('Log in to save posts.').waitFor({ timeout: 5000 }).catch(() => {});
  expect(g.url() === `${APP}/login` && (await g.getByText('Log in to save posts.').isVisible()), 'guest: bookmark -> /login with "Log in to save posts."');
  await g.goto(`${APP}/saved`);
  await g.waitForURL(`${APP}/login`, { timeout: 5000 }).catch(() => {});
  expect(g.url() === `${APP}/login`, 'guest: /saved -> /login');
  await g.context().close();

  const b = await as(ben);
  await b.goto(`${APP}/`);
  const card = postCard(b, `Ann's post ${tag}`);
  await card.waitFor();
  const save = card.locator('.action.bookmark');
  expect((await save.getAttribute('aria-pressed')) === 'false' && (await save.locator('svg').getAttribute('fill')) === 'none', 'bookmark icon is an outline when not saved');
  await save.click();
  await card.locator('.action.bookmark.is-saved').waitFor({ timeout: 5000 });
  expect((await save.getAttribute('aria-pressed')) === 'true' && (await save.locator('svg').getAttribute('fill')) === 'currentColor' && (await save.getAttribute('aria-label')) === 'Remove from saved',
    'bookmark icon fills when saved');
  await b.reload();
  await postCard(b, `Ann's post ${tag}`).locator('.action.bookmark.is-saved').waitFor({ timeout: 5000 });
  expect(true, 'saved state persists after reload');
  await postCard(b, `Ben's post ${tag}`).locator('.action.bookmark').click();
  await postCard(b, `Ben's post ${tag}`).locator('.action.bookmark.is-saved').waitFor();

  // Saved page from the sidebar's More menu.
  await b.locator('.left-nav').getByRole('button', { name: 'More' }).click();
  await b.getByRole('menuitem', { name: 'Saved' }).click();
  await b.waitForURL(`${APP}/saved`);
  // Wait for both saved posts: the first post to appear can still be the previous page's.
  await postCard(b, `Ben's post ${tag}`).waitFor({ timeout: 5000 });
  await postCard(b, `Ann's post ${tag}`).waitFor({ timeout: 5000 });
  const saved = await b.locator('.center .post .post-text').allInnerTexts();
  expect(saved.length === 2 && saved[0] === `Ben's post ${tag}` && saved[1] === `Ann's post ${tag}`, `Saved page (via More menu) lists bookmarks, newest-saved first (${saved.join(' | ')})`);
  await b.screenshot({ path: `${OUT}/a3-saved-page.png` });
  // Un-saving on the Saved page removes it there and on the server.
  await postCard(b, `Ann's post ${tag}`).locator('.action.bookmark').click();
  await postCard(b, `Ann's post ${tag}`).waitFor({ state: 'detached', timeout: 5000 });
  const list = await (await fetch(`${API}/bookmarks/list.php`, { headers: { Authorization: `Bearer ${ben.token}` } })).json();
  expect(list.posts.length === 1 && list.posts[0].id === benPost.id, 'un-saving on the Saved page removes it (also on the server)');

  // Saved page from Profile (the route on phones).
  const phone = await as(ben, { viewport: { width: 390, height: 844 } });
  await phone.goto(`${APP}/u/${ben.user.username}`);
  await phone.getByRole('link', { name: 'Saved' }).click();
  await phone.waitForURL(`${APP}/saved`);
  await postCard(phone, `Ben's post ${tag}`).waitFor({ timeout: 5000 });
  expect(true, 'Saved page reachable from own profile (phone layout)');
  expect(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'phone: no horizontal scroll on Saved');
  await phone.context().close();

  // Someone else's profile has no Saved link.
  await b.goto(`${APP}/u/${ann.user.username}`);
  await b.locator('.profile-info').waitFor();
  expect((await b.locator('.profile-top').getByRole('link', { name: 'Saved' }).count()) === 0, "no Saved link on someone else's profile");
  await b.context().close();
} catch (e) { failed++; console.log(`✗ bookmarks: stopped early: ${firstLine(e)}`); }

// ---------- Action row spans the full width, evenly spaced ----------
// Measures the rendered icons: equal intervals between them, the first lined
// up with the post text, the row reaching the card's right edge, no overflow.
// Checked on the feed, the single post page and the Saved page, at desktop
// and phone widths, with non-zero counts showing.
async function rowLayout(card) {
  return card.evaluate((el) => {
    const text = el.querySelector('.post-text').getBoundingClientRect();
    const body = el.querySelector('.post-body').getBoundingClientRect();
    const row = el.querySelector('.post-actions').getBoundingClientRect();
    const buttons = [...el.querySelectorAll('.post-actions > button')].map((b) => b.getBoundingClientRect());
    const icons = [...el.querySelectorAll('.post-actions > button svg')].map((s) => s.getBoundingClientRect());
    return {
      textLeft: text.left, bodyRight: body.right, rowWidth: row.width, bodyWidth: body.width,
      iconLefts: icons.map((r) => r.left), lastButtonRight: buttons.at(-1).right,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}
function checkRow(label, m) {
  const gaps = m.iconLefts.slice(1).map((x, i) => x - m.iconLefts[i]);
  const even = gaps.length === 3 && Math.max(...gaps) - Math.min(...gaps) <= 2;
  expect(even, `${label}: 4 icons evenly spaced (intervals ${gaps.map((g) => g.toFixed(0)).join(', ')}px)`);
  expect(Math.abs(m.iconLefts[0] - m.textLeft) <= 2, `${label}: first icon lines up with the post text (${(m.iconLefts[0] - m.textLeft).toFixed(1)}px)`);
  expect(m.lastButtonRight >= m.bodyRight - 1 && m.rowWidth >= m.bodyWidth, `${label}: row reaches the right edge of the post (row ${m.rowWidth.toFixed(0)}px of ${m.bodyWidth.toFixed(0)}px)`);
  expect(!m.overflow, `${label}: no horizontal overflow`);
}
try {
  // Give Ann's post a comment and a like so counts are showing.
  await fetch(`${API}/likes/toggle.php`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ann.token}` }, body: JSON.stringify({ post_id: annPost.id }) });
  await fetch(`${API}/comments/create.php`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ann.token}` }, body: JSON.stringify({ post_id: annPost.id, content: 'A comment' }) });
  await fetch(`${API}/bookmarks/toggle.php`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ann.token}` }, body: JSON.stringify({ post_id: annPost.id }) });

  for (const [size, viewport] of [['desktop', { width: 1400, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const p = await as(ann, { viewport });
    for (const [where, path, selector] of [
      ['feed', '/', '.center .post'],
      ['post page', `/post/${annPost.id}`, '.post-detail'],
      ['saved page', '/saved', '.center .post'],
    ]) {
      await p.goto(`${APP}${path}`);
      const card = p.locator(selector, { hasText: `Ann's post ${tag}` }).first();
      await card.waitFor({ timeout: 5000 });
      await card.locator('.action.like', { hasText: '1' }).waitFor({ timeout: 5000 });
      checkRow(`${size} ${where}`, await rowLayout(card));
      await card.screenshot({ path: `${OUT}/r-${size}-${where.replace(' ', '-')}.png` });
    }
    await p.context().close();
  }
} catch (e) { failed++; console.log(`✗ action row layout: stopped early: ${firstLine(e)}`); }

expect(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
console.log(failed ? `== ${failed} FAILED` : '== all post-action checks passed');
process.exitCode = failed ? 1 : 0;
