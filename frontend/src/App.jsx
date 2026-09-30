import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Feed from './pages/Feed.jsx';
import Explore from './pages/Explore.jsx';
import Profile from './pages/Profile.jsx';
import PostPage from './pages/PostPage.jsx';
import Saved from './pages/Saved.jsx';
import ComingSoon from './pages/ComingSoon.jsx';

// Pages that only make sense for a signed-in user (the home feed is "people
// you follow"). Guests are sent to log in and brought back afterwards.
function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

// Login/Register: once signed in, return to wherever the guest came from.
function GuestOnly({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  return user ? <Navigate to={location.state?.from || '/'} replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

      <Route element={<Layout />}>
        {/* Public, read-only for guests (requirement.md §4). */}
        <Route path="u/:username" element={<Profile />} />
        <Route path="post/:id" element={<PostPage />} />

        {/* Home: "For you" is public; the "Following" tab asks guests to log in. */}
        <Route index element={<Feed />} />
        <Route path="explore" element={<RequireAuth><Explore /></RequireAuth>} />
        <Route path="saved" element={<RequireAuth><Saved /></RequireAuth>} />
        <Route path="notifications" element={<RequireAuth><ComingSoon title="Notifications" /></RequireAuth>} />
        <Route path="messages" element={<RequireAuth><ComingSoon title="Messages" /></RequireAuth>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
