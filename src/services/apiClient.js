// Authenticated API Client for BreatheBetter AI Express / Vercel Serverless Backend

const TOKEN_KEY = 'bb_auth_token';
const CLIENT_ID_KEY = 'bb_client_id';

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage failures
  }
}

export function getClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return 'guest-browser';
  }
}

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'X-Client-Id': getClientId(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const resp = await fetch(path, {
    ...options,
    headers,
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(data?.error || `Request failed (${resp.status})`);
    err.status = resp.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export const authApi = {
  register: (payload) => apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => apiRequest('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (payload) => apiRequest('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => apiRequest('/api/auth/me'),
  updateProfile: (payload) => apiRequest('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
  addLocation: (payload) => apiRequest('/api/auth/locations', { method: 'POST', body: JSON.stringify(payload) }),
  removeLocation: (id) => apiRequest(`/api/auth/locations/${id}`, { method: 'DELETE' }),
};

export const plannerApi = {
  list: () => apiRequest('/api/planner'),
  create: (payload) => apiRequest('/api/planner', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => apiRequest(`/api/planner/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id) => apiRequest(`/api/planner/${id}`, { method: 'DELETE' }),
};

export const communityApi = {
  listPosts: (category = 'All') =>
    apiRequest(`/api/community/posts${category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : ''}`),
  createPost: (payload) => apiRequest('/api/community/posts', { method: 'POST', body: JSON.stringify(payload) }),
  editPost: (id, payload) => apiRequest(`/api/community/posts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deletePost: (id) => apiRequest(`/api/community/posts/${id}`, { method: 'DELETE' }),
  toggleLike: (id) => apiRequest(`/api/community/posts/${id}/like`, { method: 'POST' }),
  addComment: (id, payload) => apiRequest(`/api/community/posts/${id}/comments`, { method: 'POST', body: JSON.stringify(payload) }),
  reportPost: (id) => apiRequest(`/api/community/posts/${id}/report`, { method: 'POST' }),
};

export const notificationsApi = {
  list: () => apiRequest('/api/notifications'),
  create: (payload) => apiRequest('/api/notifications', { method: 'POST', body: JSON.stringify(payload) }),
  markRead: (id) => apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => apiRequest('/api/notifications/read-all', { method: 'PATCH' }),
  clearAll: () => apiRequest('/api/notifications', { method: 'DELETE' }),
};

export const ecoApi = {
  list: () => apiRequest('/api/eco'),
  create: (payload) => apiRequest('/api/eco', { method: 'POST', body: JSON.stringify(payload) }),
  remove: (id) => apiRequest(`/api/eco/${id}`, { method: 'DELETE' }),
};

export const aiApi = {
  chat: (payload) => apiRequest('/api/ai/chat', { method: 'POST', body: JSON.stringify(payload) }),
};

export const analyticsApi = {
  history: (city = '', days = 30) =>
    apiRequest(`/api/analytics/history?city=${encodeURIComponent(city)}&days=${days}`),
  compare: (cities) =>
    apiRequest(`/api/air-quality/compare?cities=${encodeURIComponent(cities.join('|'))}`),
  stations: () => apiRequest('/api/air-quality/stations'),
  health: () => apiRequest('/api/health'),
};
