# wavelink

A mini social media app built for the CodeAlpha Full Stack Development internship (Task 2). The GitHub repo is named `CodeAlpha_SocialMediaPlatform` per the internship's naming convention; the product itself is branded **wavelink**.

Users can create an account, post updates, follow other users, and like/comment on posts: the core loop of a social feed, built from scratch with a plain PHP REST API and a React frontend.

See `requirement.md` for the feature list, `design.md` for the design system, and `mockups/feed-mockup.html` for the target layout.

Brand assets are PNGs in `frontend/public/`: the app tile `wavelink-logo-512.png` / `wavelink-logo-128.png` (a teal-and-blue "W" with wifi arcs on a dark navy rounded tile, used in the sidebar, mobile header and login/sign-up pages), plus the favicons and app icons (`favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-*.png`).

## Tech Stack

| Layer     | Choice                                        |
|-----------|-----------------------------------------------|
| Frontend  | React (Vite) + plain JavaScript, React Router |
| Backend   | Vanilla PHP 8 (PDO prepared statements, no framework) |
| Database  | MySQL 8                                       |
| Auth      | JWT (hand-rolled HS256, sent as Bearer token) |

## Project Structure

```
CodeAlpha_SocialMediaPlatform/
├── backend/
│   ├── config/          # config.php (settings), database.php (PDO), cors.php
│   ├── includes/        # jwt.php, auth.php (requireAuth / optionalAuth), helpers.php
│   ├── api/
│   │   ├── auth/        # register.php, login.php
│   │   ├── users/       # profile.php, update_profile.php, suggestions.php, upload_avatar.php
│   │   ├── posts/       # create.php, list.php, get.php, delete.php, upload_image.php
│   │   ├── comments/    # create.php, list.php, delete.php
│   │   ├── likes/       # toggle.php
│   │   ├── bookmarks/   # toggle.php, list.php
│   │   └── follow/      # toggle.php, followers.php
│   ├── database/
│   │   └── schema.sql
│   └── uploads/         # uploaded images (posts/, avatars/); gitignored
├── frontend/            # React app (Vite)
│   └── src/
│       ├── api.js       # fetch wrapper for every endpoint
│       ├── context/     # AuthContext (JWT + current user in localStorage)
│       ├── components/  # Layout (3-column shell), PostItem, CommentThread, …
│       └── pages/       # Login, Register, Feed, Profile, PostPage, Explore
├── mockups/feed-mockup.html
├── tests/               # API (curl) + browser suites, see "Tests" below
├── README.md
├── requirement.md
└── design.md
```

## Local Setup

**1. Database**

```bash
mysql -u root -p < backend/database/schema.sql
```

This creates the `codealpha_social` database and its six tables. Every statement is
`CREATE … IF NOT EXISTS`, so re-running it on an existing database only adds tables that
are missing (e.g. `bookmarks`) and never touches existing data.

**2. Backend config.** Copy `backend/config/local.example.php` to `backend/config/local.php`
and set your MySQL password and a long random `JWT_SECRET`. `local.php` is gitignored, so
credentials never get committed. (Environment variables with the same names also work.)

**3. Backend server** (from the repo root):

```bash
php -d upload_max_filesize=6M -d post_max_size=8M -S localhost:8000 -t backend
```

Image uploads allow up to 5 MB, but PHP's default upload limit is 2 MB. `backend/.user.ini`
raises it on servers that read that file (PHP-FPM / FastCGI on most hosts); `php -S`
ignores it, hence the `-d` flags above. **Laravel Herd on Windows doesn't apply
`.user.ini` either:** raise `upload_max_filesize` to 6M or more in Herd's PHP settings.
Until then, uploads over PHP's limit are rejected with a message stating the actual limit.

**4. Frontend** (in a second terminal):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. In dev, Vite proxies `/api/*` to `localhost:8000`, so no CORS setup
is needed. To point the frontend at a backend elsewhere (e.g. Herd, XAMPP or Apache), set
`VITE_API_URL` in `frontend/.env` (see `.env.example`) and add the frontend's origin to
`CORS_ORIGINS` in `local.php`.

## API

All responses are JSON. Errors are always `{ "error": "message" }` with a matching HTTP status
(400 validation, 401 auth, 403 not the owner, 404 not found, 405 wrong method, 409 conflict,
413 upload too large, 415 not a supported image, 500 server). Authenticated endpoints expect `Authorization: Bearer <token>`;
they return 401 if the token is invalid or expired, **or if its account no longer exists**. Server
errors are always JSON too, never an HTML error page.

Every post in a response has the same shape: `{ id, content, image_url, created_at,
like_count, comment_count, liked_by_viewer, bookmarked_by_viewer, author: { id, username,
display_name, avatar_url } }`. The two `_by_viewer` flags are `false` for guests.

| Method | Endpoint | Auth | Returns |
|---|---|---|---|
| POST | `auth/register.php` | – | `{ token, user }` |
| POST | `auth/login.php` | – | `{ token, user }` |
| GET | `auth/me.php` | ✓ | `{ user }`: the logged-in user, fresh from the database. The app calls it on start-up; 401 if the session ended or the account no longer exists |
| GET | `users/profile.php?username=` or `?id=` | optional | `{ user, post_count, follower_count, following_count, is_following, is_self }` |
| PUT | `users/update_profile.php` | ✓ | `{ user }` |
| POST | `users/upload_avatar.php` (multipart, field `image`) | ✓ | `{ url }`: save it as `avatar_url` via `update_profile.php`. Same rules as `upload_image.php` |
| GET | `users/suggestions.php?limit=` | ✓ | `{ users, has_other_users }`: people you don't follow yet, and whether anyone else has joined |
| POST | `posts/create.php` | ✓ | `{ post }`. Needs `content` (up to 1000 chars), an `image_url` (http(s), up to 500 chars), or both |
| POST | `posts/upload_image.php` (multipart, field `image`) | ✓ | `201 { url }` for a real JPEG, PNG, GIF or WebP up to 5 MB (type checked from the contents, full decode); 413 if larger, 415 if not a supported image. Saved with a random name in `backend/uploads/posts/`; send the URL as `image_url` to `posts/create.php` |
| GET | `posts/list.php?feed=home\|user\|all&user_id=&page=` | home: ✓ | `{ posts, has_more }`. `all` = everyone's posts ("For you", public); `user` needs `user_id`; other values → 400 |
| GET | `posts/get.php?id=` | optional | `{ post }`: same shape as a `posts/list.php` item |
| DELETE | `posts/delete.php?id=` | ✓ owner | `{ deleted }` |
| POST | `comments/create.php` | ✓ | `{ comment }` |
| GET | `comments/list.php?post_id=` | – | `{ comments }` |
| DELETE | `comments/delete.php?id=` | ✓ owner | `{ deleted }` |
| POST | `likes/toggle.php` | ✓ | `{ liked, like_count }` |
| POST | `bookmarks/toggle.php` | ✓ | `{ bookmarked, bookmark_count }`. Takes `post_id`; 404 if the post doesn't exist |
| GET | `bookmarks/list.php?page=` | ✓ | `{ posts, has_more }`: your saved posts, most recently saved first, 20 per page, same shape as feed items |
| POST | `follow/toggle.php` | ✓ | `{ following, follower_count }` |
| GET | `follow/followers.php?user_id=&type=followers\|following` | optional | `{ users }` |

## Tests

Tests run against an **isolated copy of the app** and never touch your own database or
uploaded images. `tests/run-all.sh` starts everything it needs and stops it afterwards:

| | Your app | Tests |
|---|---|---|
| Database | `codealpha_social` | `codealpha_social_test` (reset before each suite) |
| Uploads | `backend/uploads/` | `backend/uploads-test/` |
| Backend | e.g. Herd at `http://backend.test` | `php -S 127.0.0.1:8090` |
| Frontend | your `npm run dev` (5173…) | Vite on `http://localhost:5199`, own cache |

```bash
cd frontend && npm install && cd ../tests/e2e && npm install && cd ../..
PHP=php bash tests/run-all.sh          # e.g. PHP=~/.config/herd/bin/php84/php.exe on Herd
```

Your own dev servers can keep running. `tests/reset-db.php` and `tests/delete-test-user.php`
refuse any database whose name doesn't end in `_test`, so they can't wipe real data.
Always run the suites through `run-all.sh`; pointing a suite at your own backend would
create test users and posts in your real database.

- `tests/api/run.sh`: every endpoint, status codes, ownership (403), pagination, length
  limits, CORS, the `feed=all` / `has_other_users` behaviour, and image uploads (real images
  in every format, a 4.7 MB image, over-5 MB, non-images, fake headers, SVG, disguised PHP).
  Upload fixtures are generated by `tests/api/make-fixtures.php`.
- `tests/e2e/*.mjs`: browser flows via `playwright-core`, driving the installed Edge
  (`BROWSER_CHANNEL=chrome` for Chrome): `member` (including the phone layout: the bottom
  bar's four items, their order and even spacing, the + post button and the header account
  menu), `guest`, `post` (single-post page),
  `feed` (For you / Following tabs, Who to follow), `smoke` (login, post, like), `logo`
  (the app tile in the sidebar, mobile header and auth pages: alt, size, sharpness at 1x-3x),
  `upload` (photo picker, preview, uploading state, remove, post and profile photo, and
  rejection of non-images and files over 5 MB), `regressions` (the profile, composer,
  sidebar-post and profile-photo bugs, including a session whose account was deleted), and
  `actions` (delete only visible to a post's author, the "⋯" menu, share / copy link, and
  bookmarks with the Saved page, and the action row evenly spaced across the full width on
  the feed, post page and Saved page at desktop and phone widths).

## Internship Submission Checklist

- [ ] Push code to GitHub as `CodeAlpha_SocialMediaPlatform`
- [ ] Record a short video walkthrough, post on LinkedIn tagging @CodeAlpha
- [ ] Submit via the WhatsApp group submission form
