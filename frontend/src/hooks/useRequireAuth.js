import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Guests can browse profiles read-only (requirement.md §4). Actions that need
// an account call this first: it returns true for a signed-in user, otherwise
// sends the guest to /login with a reason and the page to come back to.
export default function useRequireAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (reason) => {
      if (user) return true;
      navigate('/login', { state: { from: location.pathname + location.search, reason } });
      return false;
    },
    [user, navigate, location.pathname, location.search]
  );
}
