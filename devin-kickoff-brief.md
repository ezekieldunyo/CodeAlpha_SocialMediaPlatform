# Devin Kickoff Brief — Wavelink (CodeAlpha_SocialMediaPlatform)

## Context
This is Task 2 of the CodeAlpha Full Stack Development internship — a mini social media app. The repo already contains planning docs and design assets; **read these first before writing any code**, they are the source of truth, not suggestions to reinterpret:

- `README.md` — project overview, folder structure, setup steps
- `requirement.md` — full functional/non-functional requirements and API endpoint list
- `design.md` — color tokens, typography, layout system
- `backend/database/schema.sql` — finalized DB schema (users, posts, comments, likes, follows)
- `backend/config/database.php`, `backend/config/cors.php`, `backend/includes/jwt.php` — already-written config and auth helpers, reuse them, don't rewrite from scratch
- `wavelink-icon.svg`, `wavelink-lockup-light.svg`, `wavelink-hero.svg`, `frontend/public/*` (favicons) — brand assets, already final
- `mockups/feed-mockup.html` — static HTML mockup of the target UI (three-column layout). Match this visually; it's not just a rough sketch, it reflects the agreed design direction.

## Hard constraints — do not deviate
- **Backend: vanilla PHP (PDO), no framework.** Not Laravel, not Slim, not Node/Express, not Django. Plain `.php` files under `backend/api/`, following the structure already scaffolded (`api/auth/`, `api/users/`, `api/posts/`, `api/comments/`, `api/likes/`, `api/follow/`).
- **Frontend: React + Vite + plain JavaScript** (not TypeScript unless you ask me first).
- **Database: MySQL**, using the schema already defined in `backend/database/schema.sql` — extend it only if a feature genuinely needs a new column/table, and flag what you changed.
- **Auth: JWT**, using the hand-rolled implementation in `backend/includes/jwt.php` (HS256, no Composer dependency — Composer/Packagist isn't reachable in some dev environments, so don't introduce `firebase/php-jwt`).
- **All SQL via PDO prepared statements only.** No string-concatenated queries.

## Design system to follow
- Colors, type (Poppins for headings, Inter for body), and layout rules are defined in `design.md`. Use CSS custom properties matching the tokens there.
- Reference `mockups/feed-mockup.html` for the actual three-column layout (nav / feed / suggestions), component spacing, and visual style (dark navy nav, gradient accents on primary actions only, hairline dividers between posts — not shadowed cards).

## Feature scope (build in this order)
1. **Auth** — register, login, JWT issuance, auth middleware for protected routes
2. **Profiles** — view own/other profiles, edit display name/bio/avatar
3. **Posts** — create, list (home feed + profile feed), delete own posts
4. **Comments** — add/list/delete on a post
5. **Likes** — toggle like/unlike, return updated count
6. **Follow system** — toggle follow/unfollow, follower/following counts

Full endpoint list and request/response shapes are in `requirement.md` section 5 — implement exactly those routes and payload shapes so the frontend integration is predictable.

## Non-functional requirements
- Server-side validation on every endpoint (required fields, length limits, email format) — don't rely on frontend validation alone.
- Paginate the feed query (`page=` param), don't load all posts at once.
- JSON error responses: `{ "error": "message" }` with correct HTTP status codes (400/401/403/404/500).
- CORS restricted to the local Vite dev origin, per `backend/config/cors.php` (already written — extend the allowed-origins list if needed for deployment, don't switch to `Access-Control-Allow-Origin: *`).

## What "done" looks like for this task
A working local setup where:
- `backend/database/schema.sql` imports cleanly into MySQL
- PHP built-in server (or XAMPP) serves `backend/` and all endpoints in `requirement.md` §5 work end-to-end
- `npm run dev` in `frontend/` runs a React app that can register, log in, post, comment, like, and follow against that backend
- The UI visually matches `mockups/feed-mockup.html` and the tokens in `design.md`

Please start by confirming you've read the existing docs/schema/assets and summarizing your build plan before writing code, so I can catch any misunderstanding early.
