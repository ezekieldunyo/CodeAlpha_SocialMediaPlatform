import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from './Avatar.jsx';
import { Comments } from './Comments.jsx';
import { CommentIcon, HeartIcon, TrashIcon } from './Icons.jsx';
import { timeAgo } from '../utils/time.js';

export function PostCard({ post, onDeleted }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [showComments, setShowComments] = useState(false);
  const [popping, setPopping] = useState(false);
  const [error, setError] = useState('');

  const toggleLike = async () => {
    if (!user) return;
    setPopping(true);
    try {
      const data = await api.toggleLike(post.id);
      setLiked(data.liked);
      setLikeCount(data.like_count);
    } catch (likeError) {
      setError(likeError.message);
    } finally {
      setTimeout(() => setPopping(false), 200);
    }
  };

  const remove = async () => {
    try {
      await api.deletePost(post.id);
      onDeleted(post.id);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <article className="post">
      <Avatar user={post.author} size={40} />
      <div className="post-body">
        <div className="post-head">
          <Link to={`/u/${post.author.username}`} className="name">
            {post.author.display_name}
          </Link>
          <span className="handle">@{post.author.username}</span>
          <span className="dot">·</span>
          <span className="time">{timeAgo(post.created_at)}</span>
          {user?.id === post.author.id && (
            <button type="button" className="icon-btn" onClick={remove} aria-label="Delete post">
              <TrashIcon />
            </button>
          )}
        </div>

        <p className="post-text">{post.content}</p>
        {post.image_url && <img className="post-image" src={post.image_url} alt="" />}

        <div className="post-actions">
          <button type="button" className="action" onClick={() => setShowComments((open) => !open)}>
            <CommentIcon />
            {commentCount}
          </button>
          <button
            type="button"
            className={`action${liked ? ' liked' : ''}${popping ? ' pop' : ''}`}
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <HeartIcon filled={liked} />
            {likeCount}
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}
        {showComments && <Comments postId={post.id} onCountChange={setCommentCount} />}
      </div>
    </article>
  );
}
