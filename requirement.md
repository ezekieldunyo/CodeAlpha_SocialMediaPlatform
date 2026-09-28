# Requirements — CodeAlpha Social Media Platform

## 1. Functional Requirements

### 1.1 Authentication
- A visitor can register with username, email, password, and display name.
- A registered user can log in with email + password and receive an auth token.
- A logged-in user can log out (token is discarded client-side).
- Passwords are hashed (never stored in plain text).

### 1.2 Profiles
- Every user has a profile: display name, username, bio, avatar, join date.
- A user can view their own profile and edit display name, bio, and avatar.
- A user can view another user's public profile, including their posts and follower/following counts.

### 1.3 Posts
- A logged-in user can create a text post (optionally with one image).
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
| GET    | /api/users/profile.php?id= (or ?username=) | No  | View a profile          |
| PUT    | /api/users/update_profile.php | Yes | Edit own profile        |
| GET    | /api/users/suggestions.php    | Yes | "Who to follow": users the viewer doesn't follow yet, plus whether anyone else has joined ¹ |
| POST   | /api/posts/create.php         | Yes | Create a post           |
| GET    | /api/posts/list.php?feed=home\|user\|all | Home feed: Yes · User and "For you" feeds: No | Home feed, a profile's posts, or "For you" (everyone's posts) ⁴ |
| GET    | /api/posts/get.php?id=        | No  | View a single post (same shape as a feed item) ³ |
| DELETE | /api/posts/delete.php         | Yes | Delete own post         |
| POST   | /api/comments/create.php      | Yes | Add a comment           |
| GET    | /api/comments/list.php        | No  | List comments on a post |
| DELETE | /api/comments/delete.php      | Yes | Delete own comment ² |
| POST   | /api/likes/toggle.php         | Yes | Like / unlike a post    |
| POST   | /api/follow/toggle.php        | Yes | Follow / unfollow a user|
| GET    | /api/follow/followers.php     | No  | List followers/following|

¹ Added during the build, beyond the original endpoint list. Without it a new user has no way to discover anyone to follow, so the home feed stays empty. It powers the "Who to follow" rail and the Explore page.
² Required by §1.4 ("A user can delete their own comments") but missing from the original table.
³ Added for the `/post/:id` page. Public like profiles: guests read it; a logged-in viewer also gets `liked_by_viewer`.
⁴ `feed=all` was added for the "For you" tab (the default on the home page): the most recent posts from everyone, newest first, paginated like the other feeds. It is public, so logged-out visitors can read it; `feed=home` still requires login. Any other `feed` value returns 400.

Full request/response shapes are documented in the API table in `README.md`.
