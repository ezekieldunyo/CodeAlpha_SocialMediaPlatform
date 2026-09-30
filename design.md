# Design — CodeAlpha Social Media Platform

## 1. Visual Design System

**Direction (updated):** the brand mark is a teal→blue gradient "W" with wifi arcs on a dark navy rounded tile (the app tile, `frontend/public/wavelink-logo-512.png` and `wavelink-logo-128.png`), so the app moves from pure monochrome to a **dark navy base with a teal/blue gradient accent**, rather than a flat black/white system. Gradient is reserved for the logo, primary actions, and active/selected states — everything else stays neutral so the accent still reads as deliberate, not decorative noise everywhere.

### 1.1 Color Tokens

| Token                | Hex / Value                          | Usage                                      |
|-----------------------|----------------------------------------|-----------------------------------------------|
| `--color-navy-900`     | `#0A1A33`                              | App background (dark surfaces), header/nav bg |
| `--color-navy-700`     | `#123A52`                              | Card / composer background on dark surfaces   |
| `--gradient-brand`     | `linear-gradient(135deg,#2DD4BF,#2563EB)` | Logo, primary buttons, active nav icon, links |
| `--color-teal`         | `#2DD4BF`                              | Gradient start, success/positive accents      |
| `--color-blue`         | `#2563EB`                              | Gradient end, focus rings                     |
| `--color-paper`        | `#FFFFFF`                              | Light-mode background, text on dark surfaces  |
| `--color-ink`          | `#0F172A`                              | Primary text on light surfaces                |
| `--color-muted`        | `#9FB3C8`                              | Secondary text — usernames, timestamps, tagline |
| `--color-line`         | `#1F2E42` (dark) / `#E1E6EC` (light)   | Borders, dividers between posts               |

Light mode is the default for the feed itself (readability for a text-dense UI); the dark navy/gradient treatment is used for the header, nav, splash/auth screens, and marketing surfaces (see the navy brand panel on the login and sign-up pages).

### 1.2 Typography

- **Display / wordmark:** *Poppins* (Bold/700), tight tracking — used for the "WAVELINK" wordmark and section headers, matching the geometric rounded feel of the logo's dot accents.
- **Body / UI:** *Inter* — for post content, buttons, and form fields, at 15–16px base size for readability in a dense feed.
- Tagline / eyebrow text (e.g. "Connect. Share. Discover."): Poppins Medium, all-caps, wide letter-spacing (~4px), `--color-muted`.
- Line length for post content capped around 65–70 characters on desktop via a max-width column, not full-bleed text.

### 1.3 Layout Concept

Three-column shell on desktop (nav / feed / context), collapsing to a single scrollable column with a bottom tab bar on mobile:

```
Desktop (>1024px)
┌───────────┬─────────────────────────┬───────────────┐
│  Nav       │        Feed             │   Suggestions  │
│  logo      │  [composer]             │   who to follow│
│  Home      │  ─────────────          │                │
│  Profile   │  post card              │                │
│  Logout    │  post card              │                │
│            │  post card              │                │
└───────────┴─────────────────────────┴───────────────┘

Mobile (<640px)
┌─────────────────────────┐
│  logo            avatar  │  ← avatar opens: profile, Saved, log out
├─────────────────────────┤
│  [composer]               │
│  post card                 │
│  post card            (+) │  ← floating "New post" button
├─────────────────────────┤
│  🏠     🔍     🔔     ✉   │  ← bottom bar
└─────────────────────────┘
```

The bottom bar is icon-only, like X's: Home, Explore (a magnifying glass), Notifications
and Messages, in four equal cells across the full width. Notifications shows a small
count badge when something is unread. The floating (+) button is the phone's version
of the sidebar's Post button and opens the same composer.

- Left-aligned content throughout (no centered text blocks) — matches a scanning, feed-based reading pattern.
- Post cards separated by a single 1px `--color-line` rule rather than boxed cards with shadows — keeps the feed calm and print-like rather than "SaaS card kit."
- Buttons: solid gradient-fill pill for primary actions (Post, Follow), outline pill (`--color-ink` / `--color-muted` border) for secondary (Edit profile, Unfollow).

### 1.4 Principles

1. **Gradient is a signal, not a background.** It appears on the logo, primary CTAs, and active states only — the feed itself stays neutral (white/navy + ink/muted text) so the accent still means something.
2. **Flat over floating.** Hairline dividers instead of drop-shadowed cards.
3. **State through fill, not just hue.** A liked post shows a filled icon *and* the gradient; a followed user shows a filled gradient pill — so state is still legible for anyone who can't distinguish the hues.
4. **One deliberate motion moment:** the like icon does a small scale pop on click; nothing else animates on load.

## 2. Database Design

Five tables (see `backend/database/schema.sql` for full DDL):

```
users ──┬─< posts ──┬─< comments
        │           └─< likes
        └─< follows >── users (self-referencing: follower_id / following_id)
```

- `posts.user_id`, `comments.post_id`/`user_id`, `likes.post_id`/`user_id` all cascade-delete with their parent.
- `likes` and `follows` each have a UNIQUE constraint on their pair of foreign keys so a toggle endpoint can just check existence rather than tracking state elsewhere.

## 3. API Design Notes

- All responses are JSON. Errors: `{ "error": "message" }` with a non-2xx status.
- Auth: client stores the JWT (localStorage in dev is fine for an internship project) and sends `Authorization: Bearer <token>` on every write request.
- **POST /api/auth/register.php** → `{ username, email, password, display_name }` → `{ token, user }`
- **POST /api/auth/login.php** → `{ email, password }` → `{ token, user }`
- **GET /api/posts/list.php?feed=home|user&user_id=&page=** → `{ posts: [...], has_more }`
- **POST /api/posts/create.php** (auth) → `{ content, image? }` → `{ post }`
- **POST /api/likes/toggle.php** (auth) → `{ post_id }` → `{ liked: true|false, like_count }`
- **POST /api/follow/toggle.php** (auth) → `{ user_id }` → `{ following: true|false }`

Full field-level validation rules to be added alongside each endpoint as it's built.

## 4. Open Questions

- Image uploads: store on disk under `backend/uploads/` with a generated filename, or skip images for v1 and add later?
- Pagination: offset-based (`page=`) vs. cursor-based (`before_id=`) — offset is simpler and fine at this scale.
