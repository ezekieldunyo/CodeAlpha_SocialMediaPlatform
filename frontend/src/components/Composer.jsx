import { useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import { ImageIcon } from './Icons.jsx';

const MAX_LENGTH = 1000;

// Fired after any successful post so every mounted list (feed, own profile)
// can prepend it — the left-nav Post button's modal lives outside those pages.
export const POST_CREATED_EVENT = 'wavelink:post-created';

export default function Composer({ autoFocus = false, onPosted }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImage, setShowImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const textRef = useRef(null);

  const trimmed = content.trim();
  const remaining = MAX_LENGTH - content.length;
  const canPost = trimmed.length > 0 && remaining >= 0 && !busy;

  function autoSize(el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  async function submit(e) {
    e.preventDefault();
    if (!canPost) return;
    setBusy(true);
    setError('');
    try {
      const { post } = await api.createPost(trimmed, showImage ? imageUrl.trim() : '');
      setContent('');
      setImageUrl('');
      setShowImage(false);
      if (textRef.current) textRef.current.style.height = 'auto';
      window.dispatchEvent(new CustomEvent(POST_CREATED_EVENT, { detail: post }));
      onPosted?.(post);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <Avatar user={user} />
      <div className="composer-main">
        <textarea
          ref={textRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            autoSize(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
          }}
          placeholder="What's flowing?"
          rows={1}
          autoFocus={autoFocus}
          aria-label="Post content"
        />
        {showImage && (
          <input
            className="input composer-image-input"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Paste an image URL (https://…)"
            aria-label="Image URL"
          />
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="composer-actions">
          <button
            type="button"
            className={`icon-btn accent ${showImage ? 'is-on' : ''}`}
            onClick={() => setShowImage((v) => !v)}
            aria-label="Attach image link"
            aria-pressed={showImage}
          >
            <ImageIcon size={20} />
          </button>
          <span className={`char-count ${remaining < 0 ? 'over' : remaining < 50 ? 'near' : ''}`}>
            {content.length > 0 && remaining}
          </span>
          <button className="btn btn-primary" type="submit" disabled={!canPost}>
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  );
}
