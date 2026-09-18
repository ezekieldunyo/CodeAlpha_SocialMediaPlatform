import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from './Avatar.jsx';
import { Wordmark } from './Logo.jsx';
import { HomeIcon, LogoutIcon, ProfileIcon, SearchIcon } from './Icons.jsx';
import { Suggestions } from './Suggestions.jsx';

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/', label: 'Home', Icon: HomeIcon, end: true },
    { to: '/explore', label: 'Explore', Icon: SearchIcon },
    { to: user ? `/u/${user.username}` : '/login', label: 'Profile', Icon: ProfileIcon },
  ];

  return (
    <div className="shell">
      <nav className="nav">
        <Wordmark />
        {links.map(({ to, label, Icon, end }) => (
          <NavLink key={label} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon />
            {label}
          </NavLink>
        ))}
        <button type="button" className="nav-logout" onClick={handleLogout}>
          <LogoutIcon />
          Logout
        </button>

        {user && (
          <div className="me">
            <Avatar user={user} size={36} />
            <div>
              <div className="name">{user.display_name}</div>
              <div className="handle">@{user.username}</div>
            </div>
          </div>
        )}
      </nav>

      <main className="feed">{children}</main>

      <aside className="rail">
        <Suggestions />
      </aside>

      <nav className="tabbar">
        {links.map(({ to, label, Icon, end }) => (
          <NavLink key={label} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
        <button type="button" onClick={handleLogout}>
          <LogoutIcon />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
