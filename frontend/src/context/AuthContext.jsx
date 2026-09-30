import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

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

  // The server rejected our token (expired, or the account no longer exists):
  // sign out and say so on the login page, rather than carrying on as a ghost
  // user whose profile "doesn't exist" and whose posts can't be saved.
  const endSession = useCallback(() => {
    const hadSession = Boolean(tokenStore.get());
    logout();
    if (hadSession) {
      navigate('/login', { replace: true, state: { reason: 'Your session has ended. Please log in again.' } });
    }
  }, [logout, navigate]);

  useEffect(() => {
    window.addEventListener('wavelink:unauthorized', endSession);
    return () => window.removeEventListener('wavelink:unauthorized', endSession);
  }, [endSession]);

  // On start-up, confirm the saved login with the server and refresh the
  // cached user details. A 401 here goes through endSession above.
  useEffect(() => {
    if (!tokenStore.get()) return undefined;
    let cancelled = false;
    api
      .me()
      .then(({ user: fresh }) => !cancelled && updateUser(fresh))
      .catch(() => {}); // network trouble: keep the saved session; 401 is handled via the event
    return () => {
      cancelled = true;
    };
  }, [updateUser]);

  const value = useMemo(
    () => ({ user, login, register, logout, updateUser }),
    [user, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
