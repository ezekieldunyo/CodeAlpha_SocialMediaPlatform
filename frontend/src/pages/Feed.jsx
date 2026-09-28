import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import useRequireAuth from '../hooks/useRequireAuth.js';
import usePostList from '../hooks/usePostList.js';
import Composer, { POST_CREATED_EVENT } from '../components/Composer.jsx';
import PostList from '../components/PostList.jsx';

// "For you" is everyone's posts (feed=all) and is public, so guests land here
// read-only. "Following" is the viewer's follows plus their own posts.
const TABS = [
  { id: 'all', label: 'For you' },
  { id: 'home', label: 'Following' },
];

export default function Feed() {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [tab, setTab] = useState('all');
  const list = usePostList({ feed: tab });
  const { prepend } = list;

  // Both feeds include the viewer's own posts, so new posts always belong here.
  useEffect(() => {
    const onCreated = (e) => prepend(e.detail);
    window.addEventListener(POST_CREATED_EVENT, onCreated);
    return () => window.removeEventListener(POST_CREATED_EVENT, onCreated);
  }, [prepend]);

  function selectTab(id) {
    if (id === 'home' && !requireAuth('Log in to see posts from people you follow.')) return;
    setTab(id);
  }

  return (
    <>
      <header className="page-header sticky">
        <h1 className="sr-only">Home</h1>
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => selectTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {user && <Composer />}

      <PostList
        list={list}
        empty={
          tab === 'all' ? (
            <>
              <strong>Nothing here yet.</strong>
              <p>{user ? 'Be the first to post something.' : 'No one has posted yet.'}</p>
            </>
          ) : (
            <>
              <strong>Your feed is quiet.</strong>
              <p>Follow people to see their posts here. <Link to="/explore">Find people to follow</Link></p>
            </>
          )
        }
      />
    </>
  );
}
