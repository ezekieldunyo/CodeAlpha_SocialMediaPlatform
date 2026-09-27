import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../api.js';

const USER_KEY = 'wavelink_user';
const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // Only trust a stored user if the token is there too.
  const [user, setUser] = useState(() => (tokenStore.get() ? readStoredUser() : null));

  const saveSession = useCallback(({ token, user: nextUser }) => {
    tokenStore.set(token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const login = useCallback(
    async (email, password) => saveSession(await api.login(email, password)),
    [saveSession]
  );

  const register = useCallback(
    async (fields) => saveSession(await api.register(fields)),
    [saveSession]
  );

  // Merge in fields returned by update_profile so the nav and composer
  // pick up a new name or avatar without a reload.
  const updateUser = useCallback((fields) => {
    setUser((current) => {
      const merged = { ...current, ...fields };
      localStorage.setItem(USER_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('wavelink:unauthorized', logout);
    return () => window.removeEventListener('wavelink:unauthorized', logout);
  }, [logout]);

  const value = useMemo(
    () => ({ user, login, register, logout, updateUser }),
    [user, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
