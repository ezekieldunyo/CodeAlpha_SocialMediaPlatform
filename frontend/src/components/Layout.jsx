import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import Composer from './Composer.jsx';
import Modal from './Modal.jsx';
import Logo from './Logo.jsx';
import RightRail from './RightRail.jsx';
import {
  BellIcon,
  BookmarkIcon,
  ExploreIcon,
  GradientDefs,
  HomeIcon,
  LogoutIcon,
  MessageIcon,
  MoreIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
} from './Icons.jsx';

// The active item's icon is stroked with the brand gradient (design.md §1.1).
function NavIcon({ icon: Icon, isActive, size = 20 }) {
  return <Icon size={size} stroke={isActive ? 'url(#wl-grad)' : 'currentColor'} strokeWidth={isActive ? 2.2 : 1.8} />;
}

function Brand({ size = 34 }) {
  return (
    <Link to="/" className="brand" aria-label="wavelink home">
      <Logo size={size} />
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

// Open/close state for a dropdown that closes on any click outside it.
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return { open, setOpen, ref };
}

// Profile, Saved and Log out: the sidebar's More menu on desktop, the header
// avatar's menu on phones.
function AccountMenuItems({ onClose }) {
  const logOut = useLogOut();
  const { user } = useAuth();
  return (
    <div className="menu" role="menu">
      <Link to={`/u/${user.username}`} className="menu-item" role="menuitem" onClick={onClose}>
        <UserIcon size={18} /> View profile
      </Link>
      <Link to="/saved" className="menu-item" role="menuitem" onClick={onClose}>
        <BookmarkIcon size={18} /> Saved
      </Link>
      <button className="menu-item" role="menuitem" onClick={logOut}>
        <LogoutIcon size={18} /> Log out @{user.username}
      </button>
    </div>
  );
}

function MoreMenu() {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div className="more" ref={ref}>
      <button className="nav-item" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <MoreIcon size={20} />
        <span className="nav-label">More</span>
      </button>
      {open && <AccountMenuItems onClose={() => setOpen(false)} />}
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
    { to: '/messages', label: 'Messages', icon: MessageIcon },
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
        <PlusIcon size={22} strokeWidth={2.4} className="btn-post-icon" />
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

// Mobile chrome per design.md §1.3: logo left, avatar right. The avatar opens
// the account menu (profile, Saved, log out), which the bottom bar doesn't carry.
function MobileHeader() {
  const { user } = useAuth();
  const { open, setOpen, ref } = useDropdown();
  return (
    <header className="mobile-header">
      <Brand size={28} />
      {user && (
        <div className="more mobile-account" ref={ref}>
          <button className="mobile-avatar" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Account menu">
            <Avatar user={user} size={32} />
          </button>
          {open && <AccountMenuItems onClose={() => setOpen(false)} />}
        </div>
      )}
    </header>
  );
}

// Unread count for the Notifications badge. Notifications aren't built yet
// (requirement.md §3), so there is never anything unread and no badge shows;
// wire this to the real count once they exist.
const UNREAD_NOTIFICATIONS = 0;

// X-style tab bar: icon-only, evenly spaced edge to edge. The labels are for
// screen readers. Explore keeps the magnifying glass for when it gains search.
function BottomBar() {
  const items = [
    { to: '/', label: 'Home', icon: HomeIcon, end: true },
    { to: '/explore', label: 'Explore', icon: SearchIcon },
    { to: '/notifications', label: 'Notifications', icon: BellIcon, badge: UNREAD_NOTIFICATIONS },
    { to: '/messages', label: 'Messages', icon: MessageIcon },
  ];

  return (
    <nav className="bottom-bar" aria-label="Main">
      {items.map(({ to, label, icon, end, badge }) => (
        <NavLink key={label} to={to} end={end} className="bottom-item" aria-label={badge ? `${label} (${badge} unread)` : label}>
          {({ isActive }) => (
            <span className="bottom-icon">
              <NavIcon icon={icon} isActive={isActive} size={26} />
              {badge > 0 && <span className="bottom-badge" aria-hidden="true">{badge > 99 ? '99+' : badge}</span>}
            </span>
          )}
        </NavLink>
      ))}
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
        <Link to="/login" replace state={{ from: pathname }} className="btn btn-outline-light">Log in</Link>
        <Link to="/register" replace state={{ from: pathname }} className="btn btn-primary">Sign up</Link>
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
          {/* Phones only: the sidebar's Post button, which the phone layout hides. */}
          <button className="fab btn-primary" onClick={() => setComposing(true)} aria-label="New post">
            <PlusIcon size={26} strokeWidth={2.4} />
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
