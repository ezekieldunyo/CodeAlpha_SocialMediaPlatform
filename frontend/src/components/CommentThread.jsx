import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { timeAgo } from '../utils/time.js';
import Avatar from './Avatar.jsx';
import { TrashIcon } from './Icons.jsx';

export default function CommentThread({ postId, onCountChange }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .listComments(postId)
      .then((data) => !cancelled && setComments(data.comments))
      .catch((err) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setError('');
    try {
      const { comment } = await api.createComment(postId, text);
      setComments((current) => [...(current || []), comment]);
      setDraft('');
      onCountChange(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.deleteComment(id);
      setComments((current) => current.filter((c) => c.id !== id));
      onCountChange(-1);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="thread">
      {loadError && <p className="form-error">{loadError}</p>}
      {!comments && !loadError && <p className="muted small">Loading comments…</p>}

      {comments?.map((c) => (
        <div className="comment" key={c.id}>
          <Link to={`/u/${c.author.username}`}>
            <Avatar user={c.author} size={32} />
          </Link>
          <div className="comment-body">
            <div className="post-meta">
              <Link to={`/u/${c.author.username}`} className="name">{c.author.display_name}</Link>
              <span className="muted">@{c.author.username} · {timeAgo(c.created_at)}</span>
              {c.author.id === user.id && (
                <button className="icon-btn danger push-right" onClick={() => remove(c.id)} aria-label="Delete comment">
                  <TrashIcon size={16} />
                </button>
              )}
            </div>
            <p className="post-text">{c.content}</p>
          </div>
        </div>
      ))}

      <form className="comment-form" onSubmit={submit}>
        <Avatar user={user} size={32} />
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a reply…"
          maxLength={500}
          aria-label="Write a reply"
        />
        <button className="btn btn-primary btn-sm" disabled={!draft.trim() || busy}>
          Reply
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
