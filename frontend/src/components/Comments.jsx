import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from './Avatar.jsx';
import { TrashIcon } from './Icons.jsx';
import { timeAgo } from '../utils/time.js';

export function Comments({ postId, onCountChange }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .listComments(postId)
      .then((data) => setComments(data.comments))
      .catch((listError) => setError(listError.message));
  }, [postId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await api.createComment(postId, draft.trim());
      setComments((current) => [...current, data.comment]);
      setDraft('');
      onCountChange(data.comment_count);
    } catch (createError) {
      setError(createError.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (commentId) => {
    try {
      const data = await api.deleteComment(commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      onCountChange(data.comment_count);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <div className="comments">
      {comments.map((comment) => (
        <div className="comment" key={comment.id}>
          <Avatar user={comment.author} size={28} />
          <div className="comment-body">
            <div className="comment-head">
              <Link to={`/u/${comment.author.username}`} className="name">
                {comment.author.display_name}
              </Link>
              <span className="handle">@{comment.author.username}</span>
              <span className="dot">·</span>
              <span className="time">{timeAgo(comment.created_at)}</span>
              {user?.id === comment.author.id && (
                <button type="button" className="icon-btn" onClick={() => remove(comment.id)} aria-label="Delete comment">
                  <TrashIcon />
                </button>
              )}
            </div>
            <p>{comment.content}</p>
          </div>
        </div>
      ))}

      {user && (
        <form className="comment-form" onSubmit={submit}>
          <Avatar user={user} size={28} linked={false} />
          <input
            value={draft}
            maxLength={500}
            placeholder="Write a comment…"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="post-cta small" disabled={busy || !draft.trim()}>
            Reply
          </button>
        </form>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
