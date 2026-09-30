import { Link } from 'react-router-dom';
import usePostList from '../hooks/usePostList.js';
import PostList from '../components/PostList.jsx';

// /saved: the logged-in user's bookmarked posts (login required, see App.jsx).
export default function Saved() {
  const list = usePostList({ feed: 'saved' });

  // Un-saving a post here takes it off the list straight away.
  const update = (id, changes) => {
    if (changes.bookmarked_by_viewer === false) list.remove(id);
    else list.update(id, changes);
  };

  return (
    <>
      <header className="page-header sticky">
        <h1>Saved</h1>
        <p className="page-sub muted">Posts you've bookmarked</p>
      </header>
      <PostList
        list={{ ...list, update }}
        empty={
          <>
            <strong>No saved posts yet.</strong>
            <p>Tap the bookmark on any post to keep it here. <Link to="/">Browse posts</Link></p>
          </>
        }
      />
    </>
  );
}
