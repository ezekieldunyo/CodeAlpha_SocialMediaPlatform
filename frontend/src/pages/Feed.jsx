import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import usePostList from '../hooks/usePostList.js';
import Composer, { POST_CREATED_EVENT } from '../components/Composer.jsx';
import PostList from '../components/PostList.jsx';

// The mockup's feed opens straight onto sticky tabs. Its "For you" / topic
// tabs would need a global or tagged feed the API doesn't have, so the tabs
// map to the two feeds posts/list.php supports.
const TABS = [
  { id: 'home', label: 'Following' },
  { id: 'mine', label: 'Your posts' },
];

export default function Feed() {
  const { user } = useAuth();
  const [tab, setTab] = useState('home');
  const list = usePostList(tab === 'home' ? { feed: 'home' } : { feed: 'user', userId: user.id });
  const { prepend } = list;

  // Both feeds include the viewer's own posts, so new posts always belong here.
  useEffect(() => {
    const onCreated = (e) => prepend(e.detail);
    window.addEventListener(POST_CREATED_EVENT, onCreated);
    return () => window.removeEventListener(POST_CREATED_EVENT, onCreated);
  }, [prepend]);

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
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <Composer />

      <PostList
        list={list}
        empty={
          tab === 'home' ? (
            <>
              <strong>Your feed is quiet.</strong>
              <p>Follow people to see their posts here. <Link to="/explore">Find people to follow</Link></p>
            </>
          ) : (
            <>
              <strong>No posts yet.</strong>
              <p>Say something. It'll show up here.</p>
            </>
          )
        }
      />
    </>
  );
}
