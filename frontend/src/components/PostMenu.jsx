import { useEffect, useRef, useState } from 'react';
import { DotsIcon, TrashIcon } from './Icons.jsx';

// The "⋯" options menu on a post. Only rendered for the post's author (see
// PostItem), so nobody else ever sees a delete control.
export default function PostMenu({ onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="post-menu" ref={ref}>
      <button
        type="button"
        className="icon-btn post-menu-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <DotsIcon size={18} />
      </button>
      {open && (
        <div className="menu post-menu-list" role="menu">
          <button
            type="button"
            role="menuitem"
            className="menu-item danger"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <TrashIcon size={18} /> Delete post
          </button>
        </div>
      )}
    </div>
  );
}
