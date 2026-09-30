import { useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import useImageUpload from '../hooks/useImageUpload.js';
import Avatar from './Avatar.jsx';
import ImagePicker from './ImagePicker.jsx';
import { CloseIcon, ImageIcon } from './Icons.jsx';

const MAX_LENGTH = 1000;

// Fired after any successful post so every mounted list (feed, own profile)
// can prepend it — the left-nav Post button's modal lives outside those pages.
export const POST_CREATED_EVENT = 'wavelink:post-created';

export default function Composer({ autoFocus = false, onPosted }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const image = useImageUpload(api.uploadPostImage);
  const textRef = useRef(null);

  const trimmed = content.trim();
  const remaining = MAX_LENGTH - content.length;
  // A post needs text or an uploaded photo (a photo on its own is fine).
  const hasContent = trimmed.length > 0 || Boolean(image.url);
  const canPost = hasContent && remaining >= 0 && !busy && !image.uploading;

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
      // The image is already uploaded; the post just references its URL.
      const { post } = await api.createPost(trimmed, image.url);
      // Only a returned post counts as success; never announce or close on anything less.
      if (!post?.id) throw new Error("Your post couldn't be saved. Please try again.");
      setContent('');
      image.clear();
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
        {image.preview && (
          <div className={`composer-preview ${image.uploading ? 'is-uploading' : ''}`}>
            <img src={image.preview} alt="Selected image preview" />
            {image.uploading && (
              <div className="upload-overlay" role="status">
                <span className="spinner" aria-hidden="true" /> Uploading…
              </div>
            )}
            <button type="button" className="preview-remove" onClick={image.clear} aria-label="Remove image">
              <CloseIcon size={18} />
            </button>
          </div>
        )}
        {(error || image.error) && <p className="form-error" role="alert">{error || image.error}</p>}
        <div className="composer-actions">
          <ImagePicker className="icon-btn accent" label="Add a photo" onPick={image.pick} disabled={busy}>
            <ImageIcon size={20} />
          </ImagePicker>
          <span className={`char-count ${remaining < 0 ? 'over' : remaining < 50 ? 'near' : ''}`}>
            {content.length > 0 && remaining}
          </span>
          <button className="btn btn-primary" type="submit" disabled={!canPost}>
            {busy ? 'Posting…' : image.uploading ? 'Uploading…' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  );
}
