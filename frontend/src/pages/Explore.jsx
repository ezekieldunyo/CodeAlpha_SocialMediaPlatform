import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { PostList } from '../components/PostList.jsx';

// Everything on the platform, newest first — how you find people to follow.
export function Explore() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (nextPage) => {
    setLoading(true);
    try {
      const data = await api.listPosts({ feed: 'explore', page: nextPage });
      setPosts((current) => (nextPage === 1 ? data.posts : [...current, ...data.posts]));
      setHasMore(data.has_more);
      setPage(nextPage);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <>
      <header className="feed-head">
        <h1>Explore</h1>
      </header>
      {error && <p className="form-error padded">{error}</p>}
      <PostList
        posts={posts}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={() => load(page + 1)}
        onDeleted={(id) => setPosts((current) => current.filter((post) => post.id !== id))}
        emptyMessage="Nothing here yet."
      />
    </>
  );
}
