import { chromium } from 'playwright-core';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { API, APP, LAUNCH, OUT } from './config.mjs';

// Image uploads from the device: the post composer and the profile photo.
// Uses the real file chooser, holds the upload request to see the loading
// state, and checks a real image works while a non-image and an over-5 MB
// file are rejected with clear messages.

// Fixtures, generated here so nothing binary is committed.
const dir = mkdtempSync(join(tmpdir(), 'wavelink-upload-'));
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAVUlEQVRoge3PSQ3AMADAsB6/QhiN8edWGFElWyGQeb5/rP1uazzOQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1AzUDNQM1A7QJKFwHyx+uV5QAAAABJRU5ErkJggg==',
  'base64'
); // a real 64x48 PNG
const files = {
  photo: join(dir, 'photo.png'),
  tooLarge: join(dir, 'huge-photo.png'), // real PNG padded past 5 MB
  text: join(dir, 'notes.txt'),
  disguised: join(dir, 'holiday.png'), // text with an image extension
};
writeFileSync(files.photo, PNG);
writeFileSync(files.tooLarge, Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024 + 1024)]));
writeFileSync(files.text, 'Just some notes, not a picture.\n');
writeFileSync(files.disguised, 'This is text pretending to be a PNG.\n');

let failed = 0;
const errors = [];
const expect = (cond, msg) => { if (cond) console.log('✓', msg); else { failed++; console.log('✗', msg); } };

const stamp = Date.now().toString(36);
const reg = await (await fetch(`${API}/auth/register.php`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: `up_${stamp}`, email: `up_${stamp}@example.com`, password: 'password123', display_name: 'Upload Tester' }),
})).json();

const browser = await chromium.launch(LAUNCH);
async function signedIn(viewport = { width: 1400, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript(([token, user]) => {
    localStorage.setItem('wavelink_token', token);
    localStorage.setItem('wavelink_user', JSON.stringify(user));
  }, [reg.token, reg.user]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  return page;
}
// Clicks `button` and returns the native file chooser it opened.
async function chooser(page, button) {
  const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }), button.click()]);
  return fc;
}

// ---------- Post composer ----------
const page = await signedIn();
const uploads = [];
page.on('request', (r) => r.url().includes('upload_image.php') && uploads.push(r.url()));
await page.goto(`${APP}/`);
const composer = page.locator('.center .composer');
const addPhoto = composer.getByRole('button', { name: 'Add a photo' });
expect((await page.getByPlaceholder(/image URL/i).count()) === 0, 'the old "Paste an image URL" box is gone');

let fc = await chooser(page, addPhoto);
expect(!fc.isMultiple(), '"Add a photo" opens the device file picker (single file)');
const accept = await fc.element().getAttribute('accept');
expect(/image\/jpeg/.test(accept) && /image\/png/.test(accept), `picker filters to images (accept="${accept}")`);

// Hold the upload so the loading state is observable.
let release;
const held = new Promise((r) => (release = r));
await page.route('**/posts/upload_image.php', async (route) => { await held; await route.continue(); });
await composer.getByLabel('Post content').fill('A photo from my device');
await fc.setFiles(files.photo);
const preview = composer.getByRole('img', { name: 'Selected image preview' });
await preview.waitFor();
expect((await preview.getAttribute('src')).startsWith('blob:'), 'preview shows the picked file straight away');
expect(await composer.getByRole('status').filter({ hasText: 'Uploading…' }).isVisible(), 'loading state shown while uploading');
const postBtn = composer.getByRole('button', { name: /^(Post|Uploading…|Posting…)$/ });
expect((await postBtn.innerText()) === 'Uploading…' && (await postBtn.isDisabled()), 'Post is disabled (shows "Uploading…") until the upload finishes');
await page.screenshot({ path: `${OUT}/u1-uploading.png`, clip: { x: 360, y: 0, width: 620, height: 420 } });

// Remove before posting.
await composer.getByRole('button', { name: 'Remove image' }).click();
expect((await preview.count()) === 0, 'picked image can be removed before posting');
// Let the held (now discarded) upload finish before removing the hold.
const heldDone = page.waitForResponse("**/posts/upload_image.php");
release();
await heldDone;
await page.unroute("**/posts/upload_image.php");

// Pick again, let it upload, post.
fc = await chooser(page, addPhoto);
await fc.setFiles(files.photo);
await composer.getByRole('status').waitFor({ state: 'detached' });
expect(await postBtn.isEnabled() && (await postBtn.innerText()) === 'Post', 'Post re-enabled once the upload is done');
await page.screenshot({ path: `${OUT}/u2-preview-ready.png`, clip: { x: 360, y: 0, width: 620, height: 420 } });
await postBtn.click();
const posted = page.locator('.center .post', { hasText: 'A photo from my device' }).first();
await posted.waitFor();
const img = posted.locator('img.post-image');
await img.waitFor();
await page.waitForFunction((el) => el.complete && el.naturalWidth > 0, await img.elementHandle());
const src = await img.getAttribute('src');
expect(/\/uploads\/posts\/[0-9a-f]{32}\.png$/.test(src), `post shows the uploaded image (${src})`);
expect((await preview.count()) === 0, 'composer cleared after posting');
const listed = await (await fetch(`${API}/posts/list.php?feed=all`)).json();
expect(listed.posts[0].image_url === src, 'post saved with the uploaded image URL (image_url)');

// Non-image files.
const before = uploads.length;
fc = await chooser(page, addPhoto);
await fc.setFiles(files.text);
await composer.getByRole('alert').filter({ hasText: "isn't a supported image" }).waitFor();
expect((await preview.count()) === 0 && uploads.length === before, 'a .txt file is rejected with a clear message (no upload sent)');
fc = await chooser(page, addPhoto);
await fc.setFiles(files.disguised);
await composer.getByRole('alert').filter({ hasText: "That file isn't a supported image. Please upload a JPEG, PNG, GIF or WebP." }).waitFor();
expect((await preview.count()) === 0 && uploads.length === before + 1, 'text disguised as .png reaches the server and its rejection is shown');

// Over the size limit.
fc = await chooser(page, addPhoto);
await fc.setFiles(files.tooLarge);
await composer.getByRole('alert').filter({ hasText: 'That image is too large. The maximum size is 5 MB.' }).waitFor();
expect((await preview.count()) === 0 && uploads.length === before + 1, 'a file over 5 MB is rejected with a clear message');
await page.screenshot({ path: `${OUT}/u3-too-large.png`, clip: { x: 360, y: 0, width: 620, height: 300 } });

// ---------- Profile photo ----------
await page.goto(`${APP}/u/${reg.user.username}`);
await page.getByRole('button', { name: 'Edit profile' }).click();
const dialog = page.getByRole('dialog');
expect((await dialog.getByLabel(/avatar image url/i).count()) === 0, 'the avatar URL box is gone');
fc = await chooser(page, dialog.getByRole('button', { name: 'Upload photo' }));
await fc.setFiles(files.photo);
await dialog.locator('.edit-avatar img.avatar[src^="blob:"]').waitFor();
expect(true, 'profile photo preview shown immediately');
await dialog.getByRole('button', { name: 'Save' }).waitFor(); // enabled label once uploaded
await page.screenshot({ path: `${OUT}/u4-avatar-modal.png` });
await dialog.getByRole('button', { name: 'Save' }).click();
await dialog.waitFor({ state: 'detached' });
const headerAvatar = page.locator('.profile-avatar img.avatar');
await headerAvatar.waitFor();
const avatarSrc = await headerAvatar.getAttribute('src');
expect(/\/uploads\/avatars\/[0-9a-f]{32}\.png$/.test(avatarSrc), `saved profile shows the uploaded photo (${avatarSrc})`);

await page.getByRole('button', { name: 'Edit profile' }).click();
fc = await chooser(page, dialog.getByRole('button', { name: 'Change photo' }));
await fc.setFiles(files.tooLarge);
await dialog.getByRole('alert').filter({ hasText: 'maximum size is 5 MB' }).waitFor();
fc = await chooser(page, dialog.getByRole('button', { name: 'Change photo' }));
await fc.setFiles(files.disguised);
await dialog.getByRole('alert').filter({ hasText: "isn't a supported image" }).waitFor();
expect(true, 'profile photo: over-5 MB and non-image files rejected with clear messages');
await dialog.getByRole('button', { name: 'Remove photo' }).click();
await dialog.getByRole('button', { name: 'Save' }).click();
await dialog.waitFor({ state: 'detached' });
await page.locator('.profile-avatar .avatar-initials').waitFor();
expect(true, 'profile photo can be removed (back to initials)');

// ---------- Phone ----------
const phone = await signedIn({ width: 390, height: 844 });
await phone.goto(`${APP}/`);
const pfc = await chooser(phone, phone.locator('.center .composer').getByRole('button', { name: 'Add a photo' }));
expect(!!pfc, 'phone layout: "Add a photo" opens the device picker');
await phone.context().close();

expect(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
console.log(failed ? `== ${failed} FAILED` : '== all upload checks passed');
process.exitCode = failed ? 1 : 0;
