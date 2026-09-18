# wavelink

A mini social media app built for the CodeAlpha Full Stack Development internship (Task 2). GitHub repo is named `CodeAlpha_SocialMediaPlatform` per the internship's naming convention; the product itself is branded **wavelink**.

Logo assets: `logo-icon.svg` (mark only), `logo-lockup.svg` (light), `logo-lockup-dark.svg` (dark surfaces).

## Overview

Users can create an account, post updates, follow other users, and like/comment on posts — the core loop of a social feed, built from scratch with a plain PHP REST API and a React frontend.

## Tech Stack

| Layer     | Choice                                   |
|-----------|-------------------------------------------|
| Frontend  | React (Vite) + JavaScript                 |
| Backend   | Vanilla PHP (PDO, no framework)           |
| Database  | MySQL                                     |
| Auth      | JWT (hand-rolled HS256, sent as Bearer token) |

See `requirement.md` for the full feature list and `design.md` for the visual design system and API design.

## Project Structure

```
CodeAlpha_SocialMediaPlatform/
├── backend/
│   ├── config/          # DB connection, CORS headers
│   ├── includes/        # JWT + auth middleware
│   ├── api/
│   │   ├── auth/        # register.php, login.php
│   │   ├── users/       # profile.php, update_profile.php
│   │   ├── posts/       # create.php, list.php, delete.php
│   │   ├── comments/    # create.php, list.php
│   │   ├── likes/       # toggle.php
│   │   └── follow/      # toggle.php, followers.php
│   ├── database/
│   │   └── schema.sql
│   └── uploads/         # avatar + post images
├── frontend/             # React app (Vite)
├── README.md
├── requirement.md
└── design.md
```

## Local Setup

1. Import `backend/database/schema.sql` into MySQL: `mysql -u root -p < backend/database/schema.sql`
2. Update `backend/config/database.php` with your DB credentials and set a real `JWT_SECRET`.
3. Serve the `backend/` folder on port 8000 — `php -S localhost:8000 -t backend` — or point XAMPP/WAMP at it.
   PHP needs the `pdo_mysql` and `mbstring` extensions enabled (both ship with XAMPP).
4. `cd frontend && npm install && npm run dev` → http://localhost:5173

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:8000`, so no API base URL
configuration is needed in development. To point the frontend at a different backend, set
`VITE_API_BASE` (e.g. `VITE_API_BASE=https://api.example.com/api`).

## API

All endpoints live under `backend/api/` and return JSON; errors come back as `{ "error": "message" }`
with a 400/401/403/404/405/500 status. Write endpoints require an `Authorization: Bearer <token>`
header. See `requirement.md` §5 for the full list.

## Internship Submission Checklist

- [ ] Push code to GitHub as `CodeAlpha_SocialMediaPlatform`
- [ ] Record a short video walkthrough, post on LinkedIn tagging @CodeAlpha
- [ ] Submit via the WhatsApp group submission form
