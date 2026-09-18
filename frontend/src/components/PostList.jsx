import { PostCard } from './PostCard.jsx';

export function PostList({ posts, loading, hasMore, onLoadMore, onDeleted, emptyMessage }) {
  if (loading && posts.length === 0) {
    return <p className="empty">Loading…</p>;
  }
  if (posts.length === 0) {
    return <p className="empty">{emptyMessage}</p>;
  }
  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onDeleted={onDeleted} />
      ))}
      {hasMore && (
        <button type="button" className="load-more" onClick={onLoadMore} disabled={loading}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </>
  );
}
