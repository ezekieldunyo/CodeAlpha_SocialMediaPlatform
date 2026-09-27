import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
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

function useNavItems() {
  const { user } = useAuth();
  return [
    { to: '/', label: 'Home', icon: HomeIcon, end: true },
    { to: '/explore', label: 'Explore', icon: ExploreIcon },
    { to: '/notifications', label: 'Notifications', icon: BellIcon },
    { to: '/messages', label: 'Messages', icon: MailIcon },
    { to: `/u/${user.username}`, label: 'Profile', icon: UserIcon },
  ];
}

function MoreMenu() {
  const { user, logout } = useAuth();
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
        <MoreIcon />
        <span className="nav-label">More</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <Link to={`/u/${user.username}`} className="menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <UserIcon size={18} /> View profile
          </Link>
          <button className="menu-item" role="menuitem" onClick={logout}>
            <LogoutIcon size={18} /> Log out @{user.username}
          </button>
        </div>
      )}
    </div>
  );
}

function LeftNav({ onCompose }) {
  const { user } = useAuth();
  const items = useNavItems();

  return (
    <nav className="left-nav" aria-label="Main">
      <Link to="/" className="brand">
        <LogoMark />
        <span className="brand-name">Wavelink</span>
      </Link>

      <div className="nav-items">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={label} to={to} end={end} className="nav-item">
            <Icon />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
        <MoreMenu />
      </div>

      <button className="btn btn-primary btn-post" onClick={onCompose}>
        <FeatherIcon size={20} className="btn-post-icon" />
        <span className="nav-label">Post</span>
      </button>

      <Link to={`/u/${user.username}`} className="nav-user">
        <Avatar user={user} size={38} />
        <span className="nav-user-text">
          <strong>{user.display_name}</strong>
          <span>@{user.username}</span>
        </span>
      </Link>
    </nav>
  );
}

function BottomBar() {
  const items = useNavItems();
  return (
    <nav className="bottom-bar" aria-label="Main">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={label} to={to} end={end} className="bottom-item" aria-label={label}>
          <Icon size={24} />
        </NavLink>
      ))}
    </nav>
  );
}

function MobileHeader() {
  const { user, logout } = useAuth();
  return (
    <header className="mobile-header">
      <Link to={`/u/${user.username}`} aria-label="Your profile">
        <Avatar user={user} size={32} />
      </Link>
      <LogoMark size={28} />
      <button className="icon-btn" onClick={logout} aria-label="Log out">
        <LogoutIcon size={20} />
      </button>
    </header>
  );
}

export default function Layout() {
  const [composing, setComposing] = useState(false);
  const { pathname } = useLocation();

  // Braces matter: newer browsers return a Promise from scrollTo, and React
  // would treat a returned value as the effect's cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="shell">
      <GradientDefs />
      <LeftNav onCompose={() => setComposing(true)} />
      <MobileHeader />

      <main className="center">
        <Outlet />
      </main>

      <RightRail />

      <button className="fab btn-primary" onClick={() => setComposing(true)} aria-label="New post">
        <FeatherIcon size={24} />
      </button>
      <BottomBar />

      {composing && (
        <Modal title="New post" onClose={() => setComposing(false)}>
          <Composer autoFocus onPosted={() => setComposing(false)} />
        </Modal>
      )}
    </div>
  );
}
