import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import useRequireAuth from '../hooks/useRequireAuth.js';
import { parseTimestamp, timeAgo } from '../utils/time.js';
import Avatar from './Avatar.jsx';
import CommentThread from './CommentThread.jsx';
import { CommentIcon, HeartIcon, TrashIcon } from './Icons.jsx';

export default function PostItem({ post, onUpdate, onRemove }) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [showThread, setShowThread] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  // Set only by a click, so already-liked posts don't animate on load.
  const [pop, setPop] = useState(false);
  const [error, setError] = useState('');
  const { author } = post;
  const isOwn = author.id === user?.id;

  // Optimistic like: flip immediately, then reconcile with the server's count.
  async function toggleLike() {
    if (!requireAuth('Log in to like posts.') || likeBusy) return;
    setLikeBusy(true);
    setError('');
    const before = { liked_by_viewer: post.liked_by_viewer, like_count: post.like_count };
    setPop(!before.liked_by_viewer);
    onUpdate(post.id, {
      liked_by_viewer: !before.liked_by_viewer,
      like_count: before.like_count + (before.liked_by_viewer ? -1 : 1),
    });
    try {
      const { liked, like_count } = await api.toggleLike(post.id);
      onUpdate(post.id, { liked_by_viewer: liked, like_count });
    } catch (err) {
      onUpdate(post.id, before);
      setError(err.message);
    } finally {
      setLikeBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await api.deletePost(post.id);
      onRemove(post.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <article className="post">
      <Link to={`/u/${author.username}`} className="post-avatar">
        <Avatar user={author} size={40} />
      </Link>
      <div className="post-body">
        <div className="post-meta">
          <Link to={`/u/${author.username}`} className="name">{author.display_name}</Link>
          <span className="muted truncate">@{author.username}</span>
          <span className="muted">·</span>
          <time className="muted" dateTime={post.created_at} title={parseTimestamp(post.created_at).toLocaleString()}>
            {timeAgo(post.created_at)}
          </time>
        </div>

        <p className="post-text">{post.content}</p>
        {post.image_url && <img className="post-image" src={post.image_url} alt="" loading="lazy" />}

        <div className="post-actions">
          <button
            className={`action ${showThread ? 'is-active' : ''}`}
            onClick={() => setShowThread((v) => !v)}
            aria-expanded={showThread}
            aria-label={`${post.comment_count} comments`}
          >
            <CommentIcon size={18} />
            <span>{post.comment_count || ''}</span>
          </button>
          <button
            className={`action like ${post.liked_by_viewer ? 'is-liked' : ''} ${pop ? 'pop' : ''}`}
            onClick={toggleLike}
            onAnimationEnd={() => setPop(false)}
            aria-pressed={post.liked_by_viewer}
            aria-label={`${post.liked_by_viewer ? 'Unlike' : 'Like'} (${post.like_count})`}
          >
            <HeartIcon size={18} fill={post.liked_by_viewer ? 'url(#wl-grad)' : 'none'} stroke={post.liked_by_viewer ? 'url(#wl-grad)' : 'currentColor'} />
            <span>{post.like_count || ''}</span>
          </button>
          {isOwn && (
            <button className="action danger push-right" onClick={remove} aria-label="Delete post">
              <TrashIcon size={18} />
            </button>
          )}
        </div>
        {error && <p className="form-error">{error}</p>}

        {showThread && (
          <CommentThread
            postId={post.id}
            onCountChange={(delta) => onUpdate(post.id, { comment_count: post.comment_count + delta })}
          />
        )}
      </div>
    </article>
  );
}
