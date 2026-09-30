import { useEffect, useRef } from 'react';
import { feedKey } from '../hooks/usePostList.js';
import PostItem from './PostItem.jsx';

// Renders a usePostList() result and loads the next page when the sentinel
// scrolls into view.
export default function PostList({ list, empty }) {
  const { posts, loading, error, hasMore, loadMore, retry, update, remove } = list;
  const sentinel = useRef(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="post-list">
      {posts.map((post) => (
        <PostItem key={feedKey(post)} post={post} onUpdate={update} onRemove={remove} />
      ))}

      {!loading && !error && posts.length === 0 && <div className="empty">{empty}</div>}

      {error && (
        <div className="list-status">
          <p className="form-error">{error}</p>
          <button className="btn btn-outline btn-sm" onClick={retry}>Try again</button>
        </div>
      )}
      {loading && <div className="list-status"><span className="spinner" aria-label="Loading" /></div>}
      {!loading && !error && !hasMore && posts.length > 0 && (
        <div className="list-status muted small">You're all caught up.</div>
      )}

      <div ref={sentinel} />
    </div>
  );
}
