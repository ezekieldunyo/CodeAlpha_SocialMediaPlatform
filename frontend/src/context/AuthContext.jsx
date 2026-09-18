import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getAuthToken, setAuthToken } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('wavelink_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(Boolean(getAuthToken()));

  useEffect(() => {
    if (!getAuthToken() || !user) {
      setLoading(false);
      return;
    }
    // Refresh the cached user (and drop an expired token) on first load.
    api
      .profile({ id: user.id })
      .then((data) => setUser((current) => ({ ...current, ...data.user })))
      .catch((error) => {
        if (error.status === 401) logout();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((token, nextUser) => {
    setAuthToken(token);
    setUser(nextUser);
    localStorage.setItem('wavelink_user', JSON.stringify(nextUser));
  }, []);

  const login = useCallback(
    async (credentials) => {
      const data = await api.login(credentials);
      persist(data.token, data.user);
      return data.user;
    },
    [persist],
  );

  const register = useCallback(
    async (payload) => {
      const data = await api.register(payload);
      persist(data.token, data.user);
      return data.user;
    },
    [persist],
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('wavelink_user');
  }, []);

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
    localStorage.setItem('wavelink_user', JSON.stringify(nextUser));
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateUser }),
    [user, loading, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
