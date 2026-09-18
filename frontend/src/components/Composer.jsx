import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from './Avatar.jsx';
import { ImageIcon } from './Icons.jsx';
import { readFileAsDataUrl } from '../utils/readFile.js';
import { api } from '../api.js';

const MAX_LENGTH = 1000;

export function Composer({ onPosted }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  const pickImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImage(await readFileAsDataUrl(file));
    } catch (readError) {
      setError(readError.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!content.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await api.createPost({ content: content.trim(), image: image ?? undefined });
      setContent('');
      setImage(null);
      if (fileInput.current) fileInput.current.value = '';
      onPosted(data.post);
    } catch (postError) {
      setError(postError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <Avatar user={user} size={40} linked={false} />
      <div className="composer-main">
        <textarea
          value={content}
          maxLength={MAX_LENGTH}
          placeholder="What's flowing?"
          rows={2}
          onChange={(event) => setContent(event.target.value)}
        />
        {image && (
          <div className="composer-preview">
            <img src={image} alt="Selected attachment" />
            <button type="button" onClick={() => setImage(null)}>
              Remove
            </button>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="composer-row">
          <div className="composer-icons">
            <button type="button" onClick={() => fileInput.current?.click()} aria-label="Add image">
              <ImageIcon />
            </button>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickImage} />
            {content.length > 0 && (
              <span className="counter">
                {content.length}/{MAX_LENGTH}
              </span>
            )}
          </div>
          <button type="submit" className="post-cta" disabled={busy || !content.trim()}>
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  );
}
