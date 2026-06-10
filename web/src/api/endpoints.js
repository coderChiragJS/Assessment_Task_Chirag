import { api } from './client.js';

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }, { auth: false }),
  signup: (name, email, password) =>
    api.post('/auth/signup', { name, email, password }, { auth: false }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }, { auth: false }),
  me: () => api.get('/auth/me'),
};

export const usersApi = {
  list: () => api.get('/users'),
  get: (id) => api.get(`/users/${id}`),
  create: (payload) => api.post('/users', payload),
  changeRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  assignTeam: (id, teamId) => api.patch(`/users/${id}/team`, { teamId }),
};

export const teamsApi = {
  list: () => api.get('/teams'),
  get: (id) => api.get(`/teams/${id}`),
  create: (payload) => api.post('/teams', payload),
};

export const tasksApi = {
  list: (query) => api.get('/tasks', { query }),
  get: (id) => api.get(`/tasks/${id}`),
  create: (payload) => api.post('/tasks', payload),
  update: (id, patch) => api.patch(`/tasks/${id}`, patch),
  assign: (id, assigneeId) => api.patch(`/tasks/${id}/assign`, { assigneeId }),
  changeStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  remove: (id) => api.del(`/tasks/${id}`),
};

export const commentsApi = {
  list: (taskId, cursor) => api.get(`/tasks/${taskId}/comments`, { query: { cursor } }),
  add: (taskId, body) => api.post(`/tasks/${taskId}/comments`, { body }),
};

export const activityApi = {
  mine: (cursor) => api.get('/activity/me', { query: { cursor } }),
  forTask: (taskId, cursor) => api.get(`/activity/task/${taskId}`, { query: { cursor } }),
  forUser: (userId, cursor) => api.get(`/activity/user/${userId}`, { query: { cursor } }),
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export const insightsApi = {
  bottlenecks: (teamId) => api.get('/insights/bottlenecks', { query: { teamId } }),
};
