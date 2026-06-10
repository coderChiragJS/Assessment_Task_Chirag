import { tokenStore } from '../lib/tokenStore.js';

const BASE = '/api';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message || 'Request failed');
    this.status = status;
    this.details = details;
  }
}

let refreshing = null;

async function rawRequest(path, { method = 'GET', body, auth = true, query } = {}) {
  let url = `${BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const { accessToken } = tokenStore.get();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok || (payload && payload.success === false)) {
    const message = payload?.error?.message || res.statusText || 'Request failed';
    throw new ApiError(res.status, message, payload?.error?.details);
  }

  return payload ? payload : { success: true, data: null };
}

async function tryRefresh() {
  const { refreshToken } = tokenStore.get();
  if (!refreshToken) throw new ApiError(401, 'Session expired');
  if (!refreshing) {
    refreshing = rawRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    })
      .then((res) => {
        const { user, accessToken, refreshToken: next } = res.data;
        tokenStore.set({ user, accessToken, refreshToken: next });
        return res.data;
      })
      .catch((err) => {
        tokenStore.clear();
        throw err;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function request(path, opts = {}) {
  try {
    return await rawRequest(path, opts);
  } catch (err) {
    const isAuthCall = path.startsWith('/auth/');
    if (err instanceof ApiError && err.status === 401 && opts.auth !== false && !isAuthCall) {
      await tryRefresh();
      return rawRequest(path, opts);
    }
    throw err;
  }
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};
