const KEY = 'smartops.auth';

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { user: null, accessToken: null, refreshToken: null };
    return JSON.parse(raw);
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

function persist() {
  if (state.accessToken) localStorage.setItem(KEY, JSON.stringify(state));
  else localStorage.removeItem(KEY);
  listeners.forEach((fn) => fn(state));
}

export const tokenStore = {
  get() {
    return state;
  },
  set({ user, accessToken, refreshToken }) {
    state = { user, accessToken, refreshToken };
    persist();
  },
  setTokens({ accessToken, refreshToken }) {
    state = { ...state, accessToken, refreshToken };
    persist();
  },
  clear() {
    state = { user: null, accessToken: null, refreshToken: null };
    persist();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
