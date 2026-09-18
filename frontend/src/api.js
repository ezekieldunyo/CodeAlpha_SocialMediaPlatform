// Thin wrapper around the PHP REST API. Every call returns parsed JSON and
// throws an Error carrying the API's `{ "error": "..." }` message.

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

let authToken = localStorage.getItem('wavelink_token');

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('wavelink_token', token);
  } else {
    localStorage.removeItem('wavelink_token');
  }
}

export function getAuthToken() {
  return authToken;
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error ?? `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register.php', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login.php', { method: 'POST', body: payload, auth: false }),

  profile: ({ id, username }) =>
    request(`/users/profile.php?${id ? `id=${id}` : `username=${encodeURIComponent(username)}`}`),
  updateProfile: (payload) => request('/users/update_profile.php', { method: 'PUT', body: payload }),
  suggestions: () => request('/users/suggestions.php'),

  listPosts: ({ feed = 'home', userId, page = 1 }) =>
    request(`/posts/list.php?feed=${feed}&page=${page}${userId ? `&user_id=${userId}` : ''}`),
  createPost: (payload) => request('/posts/create.php', { method: 'POST', body: payload }),
  deletePost: (postId) => request('/posts/delete.php', { method: 'DELETE', body: { post_id: postId } }),

  listComments: (postId) => request(`/comments/list.php?post_id=${postId}`),
  createComment: (postId, content) =>
    request('/comments/create.php', { method: 'POST', body: { post_id: postId, content } }),
  deleteComment: (commentId) =>
    request('/comments/delete.php', { method: 'DELETE', body: { comment_id: commentId } }),

  toggleLike: (postId) => request('/likes/toggle.php', { method: 'POST', body: { post_id: postId } }),
  toggleFollow: (userId) => request('/follow/toggle.php', { method: 'POST', body: { user_id: userId } }),
  followList: (userId, type) => request(`/follow/followers.php?user_id=${userId}&type=${type}`),
};
