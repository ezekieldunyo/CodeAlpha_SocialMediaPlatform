import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import useRequireAuth from '../hooks/useRequireAuth.js';
import { parseTimestamp, timeAgo } from '../utils/time.js';
import Avatar from './Avatar.jsx';
import CommentThread from './CommentThread.jsx';
import { CommentIcon, HeartIcon, TrashIcon } from './Icons.jsx';

// `detail` is the /post/:id page: thread open from the start, and the
// content/timestamp aren't links to the page you're already on.
export default function PostItem({ post, onUpdate, onRemove, detail = false }) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();
  const [showThread, setShowThread] = useState(detail);
  const [likeBusy, setLikeBusy] = useState(false);
  // Set only by a click, so already-liked posts don't animate on load.
  const [pop, setPop] = useState(false);
  const [error, setError] = useState('');
  const { author } = post;
  const isOwn = author.id === user?.id;
  const postPath = `/post/${post.id}`;

  // Clicking the text/image opens the post, unless the reader is selecting
  // text. The timestamp is the real <Link> for keyboard and screen readers.
  function openPost() {
    if (detail || window.getSelection()?.toString()) return;
    navigate(postPath);
  }

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
    <article className={`post ${detail ? 'post-detail' : ''}`}>
      <Link to={`/u/${author.username}`} className="post-avatar">
        <Avatar user={author} size={40} />
      </Link>
      <div className="post-body">
        <div className="post-meta">
          <Link to={`/u/${author.username}`} className="name">{author.display_name}</Link>
          <span className="muted truncate">@{author.username}</span>
          <span className="muted">·</span>
          {detail ? (
            <time className="muted" dateTime={post.created_at}>
              {parseTimestamp(post.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </time>
          ) : (
            <Link to={postPath} className="post-time muted">
              <time dateTime={post.created_at} title={parseTimestamp(post.created_at).toLocaleString()}>
                {timeAgo(post.created_at)}
              </time>
            </Link>
          )}
        </div>

        <p className={`post-text ${detail ? '' : 'is-link'}`} onClick={openPost}>{post.content}</p>
        {post.image_url && (
          <img className={`post-image ${detail ? '' : 'is-link'}`} src={post.image_url} alt="" loading="lazy" onClick={openPost} />
        )}

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
