import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { tokenStore } from '../lib/tokenStore.js';
import { authApi } from '../api/endpoints.js';

const AuthContext = createContext(null);

function normalize(user) {
  if (!user) return null;
  return {
    ...user,
    id: user.userId || user.id,
    userId: user.userId || user.id,
  };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => tokenStore.get());

  useEffect(() => tokenStore.subscribe(setState), []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    tokenStore.set(res.data);
    return res.data;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const res = await authApi.signup(name, email, password);
    tokenStore.set(res.data);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    const { refreshToken } = tokenStore.get();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
    }
    tokenStore.clear();
  }, []);

  const value = {
    user: normalize(state.user),
    isAuthenticated: Boolean(state.accessToken),
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
