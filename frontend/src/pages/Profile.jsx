import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { PostList } from '../components/PostList.jsx';
import { EditProfile } from '../components/EditProfile.jsx';
import { joinedDate } from '../utils/time.js';

export function Profile() {
  const { username } = useParams();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const loadPosts = useCallback(async (userId, nextPage) => {
    setLoading(true);
    try {
      const data = await api.listPosts({ feed: 'user', userId, page: nextPage });
      setPosts((current) => (nextPage === 1 ? data.posts : [...current, ...data.posts]));
      setHasMore(data.has_more);
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .profile({ username })
      .then((data) => {
        if (!active) return;
        setProfile(data.user);
        return loadPosts(data.user.id, 1);
      })
      .catch((profileError) => {
        if (active) {
          setError(profileError.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [username, loadPosts]);

  const toggleFollow = async () => {
    const data = await api.toggleFollow(profile.id);
    setProfile((current) => ({
      ...current,
      is_following: data.following,
      follower_count: data.follower_count,
    }));
  };

  if (error) return <p className="empty">{error}</p>;
  if (!profile) return <p className="empty">Loading…</p>;

  return (
    <>
      <header className="feed-head">
        <h1>{profile.display_name}</h1>
        <span className="sub">{profile.post_count} posts</span>
      </header>

      <section className="profile-head">
        <Avatar user={profile} size={88} linked={false} />
        <div className="profile-meta">
          <div className="profile-top">
            <div>
              <h2>{profile.display_name}</h2>
              <p className="handle">@{profile.username}</p>
            </div>
            {profile.is_self ? (
              <button type="button" className="outline-btn" onClick={() => setEditing(true)}>
                Edit profile
              </button>
            ) : (
              <button
                type="button"
                className={profile.is_following ? 'outline-btn' : 'post-cta'}
                onClick={toggleFollow}
              >
                {profile.is_following ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>
          {profile.bio && <p className="bio">{profile.bio}</p>}
          <p className="joined">Joined {joinedDate(profile.created_at)}</p>
          <p className="counts">
            <strong>{profile.following_count}</strong> Following <strong>{profile.follower_count}</strong> Followers
          </p>
        </div>
      </section>

      <PostList
        posts={posts}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={() => loadPosts(profile.id, page + 1)}
        onDeleted={(id) => {
          setPosts((current) => current.filter((post) => post.id !== id));
          setProfile((current) => ({ ...current, post_count: current.post_count - 1 }));
        }}
        emptyMessage="No posts yet."
      />

      {editing && (
        <EditProfile
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setProfile((current) => ({ ...current, ...saved }));
            if (user?.id === saved.id) updateUser({ ...user, ...saved });
            setEditing(false);
          }}
        />
      )}
    </>
  );
}
