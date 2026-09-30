# Requirements — CodeAlpha Social Media Platform

## 1. Functional Requirements

### 1.1 Authentication
- A visitor can register with username, email, password, and display name.
- A registered user can log in with email + password and receive an auth token.
- A logged-in user can log out (token is discarded client-side).
- Passwords are hashed (never stored in plain text).

### 1.2 Profiles
- Every user has a profile: display name, username, bio, avatar, join date.
- A user can view their own profile and edit display name, bio, and avatar (a photo uploaded from their device).
- A user can view another user's public profile, including their posts and follower/following counts.

### 1.3 Posts
- A logged-in user can create a post with text, one image, or both (images are uploaded from their device: JPEG, PNG, GIF or WebP, up to 5 MB).
- Posts show author, content, timestamp, like count, and comment count.
- A user can delete their own posts.
- The home feed shows posts from users the current user follows, newest first.
- A user's profile page shows all of that user's posts.

### 1.4 Comments
- A logged-in user can comment on any post.
- Comments display under the post with author and timestamp.
- A user can delete their own comments.

### 1.5 Likes
- A logged-in user can like or unlike a post (toggle).
- The post shows the current like count and whether the current user has liked it.

### 1.5a Bookmarks, sharing and post options
- A logged-in user can bookmark (save) or un-save any post (toggle); the bookmark icon is filled when saved.
- A "Saved" page (sidebar More menu, or the user's own profile) lists their saved posts, most recently saved first. Guests are asked to log in.
- Anyone, including guests, can share a post: the share icon copies the link to its `/post/:id` page and shows "Link copied".
- A post's delete control lives in a "⋯" menu that only the post's author ever sees; deleting asks for confirmation.
- Action row on every post, spread evenly across its width: comments, repost, likes, bookmark, share.

### 1.5b Reposts
- A logged-in user can repost or un-repost any post, including their own (toggle, no added text). The repost icon is highlighted when reposted, with the repost count beside it. Guests are asked to log in.
- A repost puts the post in the reposter's followers' home feeds (and the reposter's own) and in "For you", ordered by when it was reposted, with a label above it such as "Maya reposted" (or "You reposted") linking to the reposter's profile. The post itself (content, author, counts) is always the original's.
- A post opened on its own page shows no repost label. Profile pages list only the user's own posts.

### 1.6 Follow System
- A logged-in user can follow or unfollow another user (toggle).
- A user cannot follow themselves.
- Profile pages show follower count and following count.

## 2. Non-Functional Requirements

- **Security:** all write endpoints require a valid auth token; SQL access goes through PDO prepared statements only (no string-concatenated queries).
- **Validation:** all API inputs are validated server-side (required fields, length limits, email format) regardless of frontend validation.
- **Responsiveness:** the frontend is usable on both desktop and mobile widths.
- **Performance:** the feed query is paginated rather than loading all posts at once.
- **Error handling:** API errors return a JSON `{ "error": "message" }` body with an appropriate HTTP status code (400/401/403/404/500).

## 3. Out of Scope (for the internship submission)

- Direct messaging
- Push notifications
- Real-time feed updates (nice-to-have if time allows, not required)
- Email verification / password reset flow

## 4. User Roles

| Role   | Capabilities                                              |
|--------|-------------------------------------------------------------|
| Guest  | View public profiles and posts (read-only), register, log in |
| User   | All guest capabilities + post, comment, like, follow, edit own profile |

## 5. Core API Endpoints (summary)

| Method | Endpoint                     | Auth required | Purpose               |
|--------|-------------------------------|:---:|------------------------|
| POST   | /api/auth/register.php        | No  | Create account          |
| POST   | /api/auth/login.php           | No  | Log in, get token       |
| GET    | /api/auth/me.php              | Yes | Current user; confirms a saved login is still valid ⁶ |
| GET    | /api/users/profile.php?id= (or ?username=) | No  | View a profile          |
| PUT    | /api/users/update_profile.php | Yes | Edit own profile        |
| GET    | /api/users/suggestions.php    | Yes | "Who to follow": users the viewer doesn't follow yet, plus whether anyone else has joined ¹ |
| POST   | /api/users/upload_avatar.php  | Yes | Upload a profile photo, returns its URL ⁵ |
| POST   | /api/posts/create.php         | Yes | Create a post; a retried draft is never saved twice ⁹ |
| POST   | /api/posts/upload_image.php   | Yes | Upload an image for a post, returns its URL ⁵ |
| GET    | /api/posts/list.php?feed=home\|user\|all | Home feed: Yes · User and "For you" feeds: No | Home feed, a profile's posts, or "For you" (everyone's posts); home and "For you" include reposts ⁴ ⁸ |
| GET    | /api/posts/get.php?id=        | No  | View a single post (same shape as a feed item) ³ |
| GET    | /api/posts/get.php?client_token= | Yes | Whether a draft was posted: the viewer's post for it, or 404 ⁹ |
| DELETE | /api/posts/delete.php         | Yes | Delete own post         |
| POST   | /api/comments/create.php      | Yes | Add a comment           |
| GET    | /api/comments/list.php        | No  | List comments on a post |
| DELETE | /api/comments/delete.php      | Yes | Delete own comment ² |
| POST   | /api/likes/toggle.php         | Yes | Like / unlike a post    |
| POST   | /api/bookmarks/toggle.php     | Yes | Save / un-save a post; returns `{ bookmarked, bookmark_count }` ⁷ |
| GET    | /api/bookmarks/list.php?page= | Yes | The user's saved posts, paginated, same shape as feed items ⁷ |
| POST   | /api/reposts/toggle.php       | Yes | Repost / undo a repost; returns `{ reposted, repost_count }` ⁸ |
| POST   | /api/follow/toggle.php        | Yes | Follow / unfollow a user|
| GET    | /api/follow/followers.php     | No  | List followers/following|

¹ Added during the build, beyond the original endpoint list. Without it a new user has no way to discover anyone to follow, so the home feed stays empty. It powers the "Who to follow" rail and the Explore page.
² Required by §1.4 ("A user can delete their own comments") but missing from the original table.
³ Added for the `/post/:id` page. Public like profiles: guests read it; a logged-in viewer also gets `liked_by_viewer`.
⁴ `feed=all` was added for the "For you" tab (the default on the home page): the most recent posts from everyone, newest first, paginated like the other feeds. It is public, so logged-out visitors can read it; `feed=home` still requires login. Any other `feed` value returns 400.
⁵ Image uploads replace pasting an image URL. Both endpoints take one file (`multipart/form-data`, field `image`) and accept only real JPEG, PNG, GIF or WebP images: the type is detected from the file's contents and the image must fully decode, so extensions are never trusted. Maximum 5 MB (413 over that), 415 for anything that isn't a supported image. Files get a random name in `backend/uploads/posts/` or `backend/uploads/avatars/`; the returned URL is then sent as `image_url` to `posts/create.php` or `avatar_url` to `users/update_profile.php`.
⁶ Added after a bug where a browser stayed logged in after its account was deleted: the profile showed "This account doesn't exist" and posts silently failed. Every endpoint that requires login now also checks the account still exists (401 otherwise), and the app calls `auth/me.php` on start-up and sends the user to log in again with a message if their session has ended.
⁷ Bookmarks were added with the `bookmarks` table (`id`, `user_id`, `post_id`, `created_at`, `UNIQUE(user_id, post_id)`, both foreign keys `ON DELETE CASCADE`). The toggle works like likes: remove if present, otherwise `INSERT IGNORE`, so simultaneous clicks can't create duplicates. Feed items gained `bookmarked_by_viewer`.
⁸ Reposts were added with the `reposts` table (`id`, `user_id`, `post_id`, `created_at`, `UNIQUE(user_id, post_id)`, both foreign keys `ON DELETE CASCADE`). The toggle works like likes and bookmarks (remove if present, otherwise `INSERT IGNORE`). Every post gained `repost_count`, `reposted_by_viewer` and `reposted_by`. The home feed (reposts by the viewer and people they follow) and "For you" (all reposts) list each repost as its own entry, ordered by the repost's `created_at`, with `reposted_by: { id, username, display_name }`; the post's content, author and counts stay the original's. So one post can appear more than once in a feed: as the original and once per repost. `reposted_by` is `null` for original posts, profile feeds, single posts and saved posts.
⁹ Added after a post was saved but reported as failed (a table the read-back needed was missing), so retrying would have posted it twice. `create.php` now saves and reads back in one transaction, so an error means nothing was saved. Each draft carries a random `client_token` (column `posts.client_token`, `UNIQUE(user_id, client_token)`, added to existing databases by `database/migrations/001_posts_client_token.sql`); sending the same draft again returns the post already saved. When an attempt fails without a clear rejection, the composer asks `get.php?client_token=` and says either "Your post went through", "Not posted: nothing was saved", or that it couldn't confirm and retrying is safe.

Full request/response shapes are documented in the API table in `README.md`.
