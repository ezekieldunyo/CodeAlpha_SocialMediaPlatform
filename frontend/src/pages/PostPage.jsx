import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import PostItem from '../components/PostItem.jsx';
import { BackIcon } from '../components/Icons.jsx';

// /post/:id — one post with its full comment thread. Public like profile
// pages: guests read it, and liking or replying sends them to log in.
export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setPost(null);
    setError(null);
    api
      .getPost(id)
      .then((data) => !cancelled && setPost(data.post))
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const update = useCallback((_, changes) => setPost((p) => ({ ...p, ...changes })), []);

  // After deleting from here there's nothing left to show; go to the author.
  const remove = useCallback(() => navigate(`/u/${post.author.username}`, { replace: true }), [navigate, post]);

  function back() {
    // history.state.idx is set by React Router; 0 means this is the first page.
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(post ? `/u/${post.author.username}` : '/');
  }

  return (
    <>
      <header className="page-header sticky page-header-back">
        <button className="icon-btn" onClick={back} aria-label="Back">
          <BackIcon size={20} />
        </button>
        <h1>Post</h1>
      </header>

      {error && (
        <div className="empty">
          <strong>{error.status === 404 ? 'This post doesn’t exist' : 'Couldn’t load this post'}</strong>
          <p>
            {error.status === 404 ? 'It may have been deleted. ' : `${error.message} `}
            <Link to="/">Go home</Link>
          </p>
        </div>
      )}
      {!post && !error && <div className="list-status"><span className="spinner" aria-label="Loading" /></div>}
      {post && <PostItem post={post} onUpdate={update} onRemove={remove} detail />}
    </>
  );
}
