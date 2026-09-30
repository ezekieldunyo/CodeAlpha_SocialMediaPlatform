import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import useRequireAuth from '../hooks/useRequireAuth.js';
import { parseTimestamp, timeAgo } from '../utils/time.js';
import Avatar from './Avatar.jsx';
import CommentThread from './CommentThread.jsx';
import { BookmarkIcon, CommentIcon, HeartIcon, RepostIcon, ShareIcon } from './Icons.jsx';
import PostMenu from './PostMenu.jsx';

// `detail` is the /post/:id page: thread open from the start, and the
// content/timestamp aren't links to the page you're already on.
// Clipboard API where available; the textarea fallback covers browsers or
// pages (e.g. plain http on another host) where it isn't.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

export default function PostItem({ post, onUpdate, onRemove, detail = false }) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();
  const [showThread, setShowThread] = useState(detail);
  const [likeBusy, setLikeBusy] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [repostBusy, setRepostBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);
  // Set only by a click, so already-liked posts don't animate on load.
  const [pop, setPop] = useState(false);
  const [error, setError] = useState('');
  const { author } = post;
  const isOwn = author.id === user?.id;
  const postPath = `/post/${post.id}`;
  // In a feed, a post shown because someone reposted it. A post opened on its
  // own page is just the original.
  const reposter = detail ? null : post.reposted_by;

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

  // Optimistic bookmark, same pattern as likes. Guests are sent to log in.
  async function toggleBookmark() {
    if (!requireAuth('Log in to save posts.') || bookmarkBusy) return;
    setBookmarkBusy(true);
    setError('');
    const before = post.bookmarked_by_viewer;
    onUpdate(post.id, { bookmarked_by_viewer: !before });
    try {
      const { bookmarked } = await api.toggleBookmark(post.id);
      onUpdate(post.id, { bookmarked_by_viewer: bookmarked });
    } catch (err) {
      onUpdate(post.id, { bookmarked_by_viewer: before });
      setError(err.message);
    } finally {
      setBookmarkBusy(false);
    }
  }

  // Optimistic repost toggle, same pattern as likes. Guests are sent to log in.
  async function toggleRepost() {
    if (!requireAuth('Log in to repost.') || repostBusy) return;
    setRepostBusy(true);
    setError('');
    const before = { reposted_by_viewer: post.reposted_by_viewer, repost_count: post.repost_count };
    onUpdate(post.id, {
      reposted_by_viewer: !before.reposted_by_viewer,
      repost_count: before.repost_count + (before.reposted_by_viewer ? -1 : 1),
    });
    try {
      const { reposted, repost_count } = await api.toggleRepost(post.id);
      onUpdate(post.id, { reposted_by_viewer: reposted, repost_count });
    } catch (err) {
      onUpdate(post.id, before);
      setError(err.message);
    } finally {
      setRepostBusy(false);
    }
  }

  // Copies the link to the public /post/:id page. Works for guests too.
  async function share() {
    const url = new URL(postPath, window.location.origin).href;
    setError('');
    if (await copyText(url)) {
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } else {
      setError(`Couldn't copy the link. Here it is: ${url}`);
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
    <article className={`post ${detail ? 'post-detail' : ''} ${reposter ? 'has-repost-label' : ''}`}>
      {reposter && (
        <div className="repost-label">
          <span className="repost-label-icon"><RepostIcon size={15} strokeWidth={2.2} /></span>
          <Link to={`/u/${reposter.username}`}>
            {reposter.id === user?.id ? 'You' : reposter.display_name} reposted
          </Link>
        </div>
      )}
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
          {/* Author only: nobody else gets a delete control, whatever the API allows. */}
          {isOwn && <PostMenu onDelete={remove} />}
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
            className={`action repost ${post.reposted_by_viewer ? 'is-reposted' : ''}`}
            onClick={toggleRepost}
            aria-pressed={Boolean(post.reposted_by_viewer)}
            aria-label={`${post.reposted_by_viewer ? 'Undo repost' : 'Repost'} (${post.repost_count})`}
          >
            <RepostIcon size={18} strokeWidth={post.reposted_by_viewer ? 2.4 : 1.8} />
            <span>{post.repost_count || ''}</span>
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
          <button
            className={`action bookmark ${post.bookmarked_by_viewer ? 'is-saved' : ''}`}
            onClick={toggleBookmark}
            aria-pressed={Boolean(post.bookmarked_by_viewer)}
            aria-label={post.bookmarked_by_viewer ? 'Remove from saved' : 'Save post'}
          >
            <BookmarkIcon size={18} filled={Boolean(post.bookmarked_by_viewer)} />
          </button>
          <button className={`action share ${copied ? 'is-active' : ''}`} onClick={share} aria-label="Copy link to post">
            <ShareIcon size={18} />
          </button>
        </div>
        <p className="copied-note" role="status" aria-live="polite">{copied ? 'Link copied' : ''}</p>
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
