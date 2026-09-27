// Thin fetch wrapper for the PHP API. Every endpoint returns JSON, and
// errors always come back as { "error": "message" } with a real status code.

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'wavelink_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`${BASE_URL}/${path}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, value);
    });
  }

  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Is the backend running?');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // A 401 while we hold a token means it expired or was revoked;
    // AuthContext listens for this and signs the user out.
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event('wavelink:unauthorized'));
    }
    throw new ApiError(response.status, data.error || `Request failed (${response.status}).`);
  }

  return data;
}

export const api = {
  register: (fields) => request('auth/register.php', { method: 'POST', body: fields }),
  login: (email, password) => request('auth/login.php', { method: 'POST', body: { email, password } }),

  getProfile: (username) => request('users/profile.php', { query: { username } }),
  updateProfile: (fields) => request('users/update_profile.php', { method: 'PUT', body: fields }),
  getSuggestions: (limit = 5) => request('users/suggestions.php', { query: { limit } }),

  getPost: (id) => request('posts/get.php', { query: { id } }),
  listPosts: ({ feed, userId, page }) =>
    request('posts/list.php', { query: { feed, user_id: userId, page } }),
  createPost: (content, imageUrl) =>
    request('posts/create.php', { method: 'POST', body: { content, image_url: imageUrl || undefined } }),
  deletePost: (id) => request('posts/delete.php', { method: 'DELETE', query: { id } }),

  listComments: (postId) => request('comments/list.php', { query: { post_id: postId } }),
  createComment: (postId, content) =>
    request('comments/create.php', { method: 'POST', body: { post_id: postId, content } }),
  deleteComment: (id) => request('comments/delete.php', { method: 'DELETE', query: { id } }),

  toggleLike: (postId) => request('likes/toggle.php', { method: 'POST', body: { post_id: postId } }),
  toggleFollow: (userId) => request('follow/toggle.php', { method: 'POST', body: { user_id: userId } }),
  listFollowers: (userId, type = 'followers') =>
    request('follow/followers.php', { query: { user_id: userId, type } }),
};
