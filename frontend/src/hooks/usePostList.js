import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

// A feed can show the same post more than once: as the original and as
// reposts by different people. This identifies one feed entry.
export const feedKey = (post) => (post.reposted_by ? `r${post.reposted_by.id}-${post.id}` : `p${post.id}`);

// Paged loader for posts/list.php. Resets whenever feed/userId change, and
// ignores responses from a previous feed that arrive late.
export default function usePostList({ feed, userId, enabled = true }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestKey = useRef(0);

  const load = useCallback(
    async (nextPage, key) => {
      setLoading(true);
      setError('');
      try {
        // feed 'saved' is the viewer's bookmarks; the rest come from posts/list.php.
        const data = feed === 'saved'
          ? await api.listBookmarks(nextPage)
          : await api.listPosts({ feed, userId, page: nextPage });
        if (key !== requestKey.current) return;
        setPosts((current) => {
          if (nextPage === 1) return data.posts;
          // Skip anything already shown (e.g. a post we just created shifted the pages).
          const seen = new Set(current.map(feedKey));
          return [...current, ...data.posts.filter((p) => !seen.has(feedKey(p)))];
        });
        setHasMore(data.has_more);
        setPage(nextPage);
      } catch (err) {
        if (key === requestKey.current) setError(err.message);
      } finally {
        if (key === requestKey.current) setLoading(false);
      }
    },
    [feed, userId]
  );

  useEffect(() => {
    if (!enabled) return;
    const key = ++requestKey.current;
    setPosts([]);
    setHasMore(true);
    setPage(0);
    load(1, key);
  }, [load, enabled]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore && !error) load(page + 1, requestKey.current);
  }, [load, loading, hasMore, error, page]);

  const retry = useCallback(() => load(page + 1, requestKey.current), [load, page]);

  // Ignores anything that isn't a real post, so one bad event can't crash the feed.
  const prepend = useCallback((post) => {
    if (post?.id) setPosts((current) => [post, ...current]);
  }, []);
  // update and remove apply to every entry for the post, reposts included.
  const update = useCallback(
    (id, changes) => setPosts((current) => current.map((p) => (p.id === id ? { ...p, ...changes } : p))),
    []
  );
  const remove = useCallback((id) => setPosts((current) => current.filter((p) => p.id !== id)), []);
  // After a profile edit, refresh the author details on posts already loaded.
  const patchAuthor = useCallback(
    (authorId, fields) =>
      setPosts((current) =>
        current.map((p) => (p.author.id === authorId ? { ...p, author: { ...p.author, ...fields } } : p))
      ),
    []
  );

  return { posts, loading, error, hasMore, loadMore, retry, prepend, update, remove, patchAuthor };
}
