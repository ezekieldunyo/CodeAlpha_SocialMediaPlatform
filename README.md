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

## Local Setup (once we build it)

1. Import `backend/database/schema.sql` into MySQL.
2. Update `backend/config/database.php` with your DB credentials.
3. Serve the `backend/` folder with PHP's built-in server or XAMPP/WAMP.
4. `cd frontend && npm install && npm run dev`
5. Update the API base URL in the frontend to match your PHP server's address.

## Internship Submission Checklist

- [ ] Push code to GitHub as `CodeAlpha_SocialMediaPlatform`
- [ ] Record a short video walkthrough, post on LinkedIn tagging @CodeAlpha
- [ ] Submit via the WhatsApp group submission form
