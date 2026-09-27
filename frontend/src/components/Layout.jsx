import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import Composer from './Composer.jsx';
import Modal from './Modal.jsx';
import RightRail from './RightRail.jsx';
import {
  BellIcon,
  ExploreIcon,
  FeatherIcon,
  GradientDefs,
  HomeIcon,
  LogoMark,
  LogoutIcon,
  MailIcon,
  MoreIcon,
  UserIcon,
} from './Icons.jsx';

// The active item's icon is stroked with the brand gradient (design.md §1.1).
function NavIcon({ icon: Icon, isActive, size = 20 }) {
  return <Icon size={size} stroke={isActive ? 'url(#wl-grad)' : 'currentColor'} strokeWidth={isActive ? 2.2 : 1.8} />;
}

function Brand({ size = 26 }) {
  return (
    <Link to="/" className="brand" aria-label="wavelink home">
      <LogoMark size={size} />
      <span className="wordmark">wavelink</span>
    </Link>
  );
}

// An explicit "Log out" goes to the login page. (A token that expires mid-session
// only clears the session, so public pages stay readable.)
function useLogOut() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return () => {
    logout();
    navigate('/login', { replace: true });
  };
}

function MoreMenu() {
  const logOut = useLogOut();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="more" ref={ref}>
      <button className="nav-item" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <MoreIcon size={20} />
        <span className="nav-label">More</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <Link to={`/u/${user.username}`} className="menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <UserIcon size={18} /> View profile
          </Link>
          <button className="menu-item" role="menuitem" onClick={logOut}>
            <LogoutIcon size={18} /> Log out @{user.username}
          </button>
        </div>
      )}
    </div>
  );
}

// Left nav as in mockups/feed-mockup.html. Notifications and Messages are out
// of scope (requirement.md §3) and link to placeholder pages.
function LeftNav({ onCompose }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <nav className="left-nav" aria-label="Main">
        <Brand />
      </nav>
    );
  }

  const items = [
    { to: '/', label: 'Home', icon: HomeIcon, end: true },
    { to: '/explore', label: 'Explore', icon: ExploreIcon },
    { to: '/notifications', label: 'Notifications', icon: BellIcon },
    { to: '/messages', label: 'Messages', icon: MailIcon },
    { to: `/u/${user.username}`, label: 'Profile', icon: UserIcon },
  ];

  return (
    <nav className="left-nav" aria-label="Main">
      <Brand />

      {items.map(({ to, label, icon, end }) => (
        <NavLink key={label} to={to} end={end} className="nav-item">
          {({ isActive }) => (
            <>
              <NavIcon icon={icon} isActive={isActive} />
              <span className="nav-label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
      <MoreMenu />

      <button className="btn btn-primary btn-post" onClick={onCompose}>
        <FeatherIcon size={20} className="btn-post-icon" />
        <span className="nav-label">Post</span>
      </button>

      <Link to={`/u/${user.username}`} className="nav-user">
        <Avatar user={user} size={36} />
        <span className="nav-user-text">
          <strong>{user.display_name}</strong>
          <span>@{user.username}</span>
        </span>
      </Link>
    </nav>
  );
}

// Mobile chrome per design.md §1.3: logo left / avatar right, bottom bar with
// Home, Explore (the only way to find people once the rail is hidden),
// Profile and Log out.
function MobileHeader() {
  const { user } = useAuth();
  return (
    <header className="mobile-header">
      <Brand size={22} />
      {user && (
        <Link to={`/u/${user.username}`} aria-label="Your profile">
          <Avatar user={user} size={32} />
        </Link>
      )}
    </header>
  );
}

function BottomBar() {
  const { user } = useAuth();
  const logOut = useLogOut();
  const items = [
    { to: '/', label: 'Home', icon: HomeIcon, end: true },
    { to: '/explore', label: 'Explore', icon: ExploreIcon },
    { to: `/u/${user.username}`, label: 'Profile', icon: UserIcon },
  ];

  return (
    <nav className="bottom-bar" aria-label="Main">
      {items.map(({ to, label, icon, end }) => (
        <NavLink key={label} to={to} end={end} className="bottom-item">
          {({ isActive }) => (
            <>
              <NavIcon icon={icon} isActive={isActive} size={22} />
              {label}
            </>
          )}
        </NavLink>
      ))}
      <button className="bottom-item" onClick={logOut}>
        <LogoutIcon size={22} />
        Log out
      </button>
    </nav>
  );
}

// Shown to logged-out visitors on every screen size, in place of the member
// chrome. Carries the current page so login/sign-up can return here.
function GuestBanner() {
  const { pathname } = useLocation();
  return (
    <aside className="guest-banner" aria-label="Join wavelink">
      <div className="guest-banner-text">
        <strong>Don't miss what's flowing</strong>
        <span>Join wavelink to post, like, comment and follow.</span>
      </div>
      <div className="guest-banner-actions">
        <Link to="/login" state={{ from: pathname }} className="btn btn-outline-light">Log in</Link>
        <Link to="/register" state={{ from: pathname }} className="btn btn-primary">Sign up</Link>
      </div>
    </aside>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const [composing, setComposing] = useState(false);
  const { pathname } = useLocation();

  // Braces matter: newer browsers return a Promise from scrollTo, and React
  // would treat a returned value as the effect's cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={`shell ${user ? '' : 'is-guest'}`}>
      <GradientDefs />
      <LeftNav onCompose={() => setComposing(true)} />

      <main className="center">
        <MobileHeader />
        <Outlet />
      </main>

      <RightRail />

      {user ? (
        <>
          <button className="fab btn-primary" onClick={() => setComposing(true)} aria-label="New post">
            <FeatherIcon size={24} />
          </button>
          <BottomBar />
        </>
      ) : (
        <GuestBanner />
      )}

      {composing && (
        <Modal title="New post" onClose={() => setComposing(false)}>
          <Composer autoFocus onPosted={() => setComposing(false)} />
        </Modal>
      )}
    </div>
  );
}
