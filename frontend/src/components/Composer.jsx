import { useRef, useState } from 'react';
import { api, ApiError } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import useImageUpload from '../hooks/useImageUpload.js';
import Avatar from './Avatar.jsx';
import ImagePicker from './ImagePicker.jsx';
import { CloseIcon, ImageIcon } from './Icons.jsx';

const MAX_LENGTH = 1000;

// Fired after any successful post so every mounted list (feed, own profile)
// can prepend it — the left-nav Post button's modal lives outside those pages.
export const POST_CREATED_EVENT = 'wavelink:post-created';

// Characters as the server counts them: after trimming spaces and line
// breaks, one per character (an emoji counts once).
const countChars = (text) => [...text.trim()].length;

// Random id for one draft, sent with every attempt to post it: the server
// returns the post it already saved for it instead of saving it twice.
function newDraftToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

// After a post attempt fails without a clear "rejected" answer, asks the
// server whether it was saved. { post } if it was, { saved: false } if not,
// otherwise { saved: null, retrySafe } (retrying is safe unless the server
// can't recognise the draft yet).
async function checkSaved(token) {
  try {
    const { post } = await api.findDraftPost(token);
    if (post?.id) return { post };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { saved: false };
    return { saved: null, retrySafe: !(err instanceof ApiError && err.status === 503) };
  }
  return { saved: null, retrySafe: true };
}

export default function Composer({ autoFocus = false, onPosted }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  // { kind: 'error' | 'note', text }
  const [notice, setNotice] = useState(null);
  const image = useImageUpload(api.uploadPostImage);
  const textRef = useRef(null);
  // The same draft (text + photo) keeps its token across retries; any change makes a new one.
  const draft = useRef({ key: null, token: null });

  const trimmed = content.trim();
  const remaining = MAX_LENGTH - countChars(content);
  // A post needs text or an uploaded photo (a photo on its own is fine).
  const hasContent = trimmed.length > 0 || Boolean(image.url);
  const canPost = hasContent && remaining >= 0 && !busy && !image.uploading;

  function autoSize(el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  function draftToken() {
    const key = `${trimmed}\n${image.url || ''}`;
    if (draft.current.key !== key) draft.current = { key, token: newDraftToken() };
    return draft.current.token;
  }

  function posted(post, note) {
    setContent('');
    image.clear();
    draft.current = { key: null, token: null };
    if (textRef.current) textRef.current.style.height = 'auto';
    setNotice(note ? { kind: 'note', text: note } : null);
    window.dispatchEvent(new CustomEvent(POST_CREATED_EVENT, { detail: post }));
    onPosted?.(post);
  }

  async function submit(e) {
    e.preventDefault();
    if (!canPost) return;
    setBusy(true);
    setNotice(null);
    const token = draftToken();
    try {
      // The image is already uploaded; the post just references its URL.
      const { post } = await api.createPost(trimmed, image.url, token);
      // Only a returned post counts as success; anything less is checked below.
      if (!post?.id) throw new Error('No post in the response.');
      posted(post);
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        // Rejected before saving (e.g. too long, not logged in): nothing was posted.
        setNotice({ kind: 'error', text: `Not posted: ${err.message}` });
      } else {
        // A server error, no answer, or an odd response: find out whether it was saved.
        setNotice({ kind: 'note', text: 'Checking whether your post went through…' });
        const outcome = await checkSaved(token);
        if (outcome.post) posted(outcome.post, 'Your post went through.');
        else if (outcome.saved === false) setNotice({ kind: 'error', text: 'Not posted: nothing was saved. You can try again.' });
        else if (outcome.retrySafe) setNotice({ kind: 'error', text: "Couldn't confirm whether your post went through. Trying again is safe: it won't be posted twice." });
        else setNotice({ kind: 'error', text: "Couldn't confirm whether your post went through. Check your profile before trying again." });
      }
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
        {image.error && <p className="form-error" role="alert">{image.error}</p>}
        {!image.error && notice?.kind === 'error' && <p className="form-error" role="alert">{notice.text}</p>}
        {!image.error && notice?.kind === 'note' && <p className="form-note" role="status">{notice.text}</p>}
        <div className="composer-actions">
          <ImagePicker className="icon-btn accent" label="Add a photo" onPick={image.pick} disabled={busy}>
            <ImageIcon size={20} />
          </ImagePicker>
          <span className={`char-count ${remaining < 0 ? 'over' : remaining < 50 ? 'near' : ''}`}>
            {trimmed.length > 0 && remaining}
          </span>
          <button className="btn btn-primary" type="submit" disabled={!canPost}>
            {busy ? 'Posting…' : image.uploading ? 'Uploading…' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  );
}
