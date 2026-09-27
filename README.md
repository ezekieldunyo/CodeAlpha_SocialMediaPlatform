# Wavelink

A mini social media platform built for **Task 2 of the CodeAlpha Full Stack Development internship**.
Users can register, post, like, comment, follow each other, and edit their profile.

- **Backend:** vanilla PHP 8 + PDO (prepared statements) + MySQL, JWT (HS256) Bearer auth
- **Frontend:** React (Vite, plain JavaScript), React Router

## Project structure

```
backend/
  config/      config.php (settings), database.php (PDO), cors.php
  includes/    jwt.php, auth.php (requireAuth / optionalAuth), helpers.php
  api/
    auth/      register.php, login.php
    users/     profile.php, update_profile.php, suggestions.php
    posts/     create.php, list.php, delete.php
    comments/  create.php, list.php, delete.php
    likes/     toggle.php
    follow/    toggle.php, followers.php
  schema.sql
frontend/
  src/
    api.js              fetch wrapper for every endpoint
    context/            AuthContext (JWT + current user in localStorage)
    components/         Layout (3-column shell), PostItem, CommentThread, …
    pages/              Login, Register, Feed, Profile, Explore
```

## Running locally

**1. Database**

```bash
mysql -u root -p < backend/schema.sql
```

**2. Backend config.** Copy `backend/config/local.example.php` to `backend/config/local.php`
and set your MySQL password and a long random `JWT_SECRET`. (Environment variables with the
same names also work.)

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
is needed. To point the frontend at a backend elsewhere (e.g. Herd or Apache), set
`VITE_API_URL` in `frontend/.env` (see `.env.example`) and `CORS_ORIGIN` in `local.php`.

## API

All responses are JSON. Errors are always `{ "error": "message" }` with a matching HTTP status
(400 validation, 401 auth, 403 not the owner, 404 not found, 405 wrong method, 409 conflict).
Authenticated endpoints expect `Authorization: Bearer <token>`.

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
