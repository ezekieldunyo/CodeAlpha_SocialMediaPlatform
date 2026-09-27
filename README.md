# wavelink

A mini social media app built for the CodeAlpha Full Stack Development internship (Task 2). The GitHub repo is named `CodeAlpha_SocialMediaPlatform` per the internship's naming convention; the product itself is branded **wavelink**.

Users can create an account, post updates, follow other users, and like/comment on posts: the core loop of a social feed, built from scratch with a plain PHP REST API and a React frontend.

See `requirement.md` for the feature list, `design.md` for the design system, and `mockups/feed-mockup.html` for the target layout.

Brand assets: `wavelink-icon.svg` (mark only), `wavelink-lockup-light.svg` (mark + wordmark), `wavelink-hero.svg` (marketing/auth hero), and favicons in `frontend/public/`.

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
│   │   ├── users/       # profile.php, update_profile.php, suggestions.php
│   │   ├── posts/       # create.php, list.php, delete.php
│   │   ├── comments/    # create.php, list.php, delete.php
│   │   ├── likes/       # toggle.php
│   │   └── follow/      # toggle.php, followers.php
│   └── database/
│       └── schema.sql
├── frontend/            # React app (Vite)
│   └── src/
│       ├── api.js       # fetch wrapper for every endpoint
│       ├── context/     # AuthContext (JWT + current user in localStorage)
│       ├── components/  # Layout (3-column shell), PostItem, CommentThread, …
│       └── pages/       # Login, Register, Feed, Profile, Explore
├── mockups/feed-mockup.html
├── README.md
├── requirement.md
└── design.md
```

## Local Setup

**1. Database**

```bash
mysql -u root -p < backend/database/schema.sql
```

This creates the `codealpha_social` database and its five tables.

**2. Backend config.** Copy `backend/config/local.example.php` to `backend/config/local.php`
and set your MySQL password and a long random `JWT_SECRET`. `local.php` is gitignored, so
credentials never get committed. (Environment variables with the same names also work.)

**3. Backend server** (from the repo root):

```bash
php -S localhost:8000 -t backend
```

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
500 server). Authenticated endpoints expect `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Returns |
|---|---|---|---|
| POST | `auth/register.php` | – | `{ token, user }` |
| POST | `auth/login.php` | – | `{ token, user }` |
| GET | `users/profile.php?username=` or `?id=` | optional | `{ user, post_count, follower_count, following_count, is_following, is_self }` |
| PUT | `users/update_profile.php` | ✓ | `{ user }` |
| GET | `users/suggestions.php?limit=` | ✓ | `{ users }`: people you don't follow yet |
| POST | `posts/create.php` | ✓ | `{ post }` |
| GET | `posts/list.php?feed=home\|user&user_id=&page=` | home: ✓ | `{ posts, has_more }` |
| DELETE | `posts/delete.php?id=` | ✓ owner | `{ deleted }` |
| POST | `comments/create.php` | ✓ | `{ comment }` |
| GET | `comments/list.php?post_id=` | – | `{ comments }` |
| DELETE | `comments/delete.php?id=` | ✓ owner | `{ deleted }` |
| POST | `likes/toggle.php` | ✓ | `{ liked, like_count }` |
| POST | `follow/toggle.php` | ✓ | `{ following, follower_count }` |
| GET | `follow/followers.php?user_id=&type=followers\|following` | optional | `{ users }` |

## Internship Submission Checklist

- [ ] Push code to GitHub as `CodeAlpha_SocialMediaPlatform`
- [ ] Record a short video walkthrough, post on LinkedIn tagging @CodeAlpha
- [ ] Submit via the WhatsApp group submission form
