import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import usePostList from '../hooks/usePostList.js';
import useImageUpload from '../hooks/useImageUpload.js';
import { compactNumber, monthYear } from '../utils/time.js';
import Avatar from '../components/Avatar.jsx';
import FollowButton from '../components/FollowButton.jsx';
import ImagePicker from '../components/ImagePicker.jsx';
import Modal from '../components/Modal.jsx';
import PostList from '../components/PostList.jsx';
import UserRow from '../components/UserRow.jsx';
import { CalendarIcon } from '../components/Icons.jsx';
import { POST_CREATED_EVENT } from '../components/Composer.jsx';

function EditProfileModal({ profileUser, onClose, onSaved }) {
  const [fields, setFields] = useState({
    display_name: profileUser.display_name,
    bio: profileUser.bio || '',
    avatar_url: profileUser.avatar_url || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // A newly picked photo is uploaded straight away; it only becomes the
  // avatar when the form is saved.
  const photo = useImageUpload(api.uploadAvatar);
  const set = (name) => (e) => setFields((f) => ({ ...f, [name]: e.target.value }));
  const shownAvatar = photo.preview || fields.avatar_url || null;

  function removePhoto() {
    photo.clear();
    setFields((f) => ({ ...f, avatar_url: '' }));
  }

  async function submit(e) {
    e.preventDefault();
    if (photo.uploading) return;
    setBusy(true);
    setError('');
    try {
      const { user } = await api.updateProfile({
        display_name: fields.display_name.trim(),
        bio: fields.bio.trim(),
        avatar_url: photo.url || fields.avatar_url,
      });
      onSaved(user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Edit profile" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="edit-avatar">
          <div className={`edit-avatar-preview ${photo.uploading ? 'is-uploading' : ''}`}>
            <Avatar user={{ ...profileUser, ...fields, avatar_url: shownAvatar }} size={72} />
            {photo.uploading && (
              <span className="upload-overlay round" role="status" aria-label="Uploading photo">
                <span className="spinner" aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="edit-avatar-actions">
            <ImagePicker className="btn btn-outline btn-sm" label={shownAvatar ? 'Change photo' : 'Upload photo'} onPick={photo.pick} disabled={busy}>
              {shownAvatar ? 'Change photo' : 'Upload photo'}
            </ImagePicker>
            {shownAvatar && (
              <button type="button" className="btn btn-outline btn-sm" onClick={removePhoto} disabled={busy}>
                Remove photo
              </button>
            )}
          </div>
          {photo.error && <p className="form-error" role="alert">{photo.error}</p>}
        </div>
        <label className="field">
          <span>Name</span>
          <input className="input" value={fields.display_name} onChange={set('display_name')} maxLength={60} required />
        </label>
        <label className="field">
          <span>Bio</span>
          <textarea className="input" rows={3} value={fields.bio} onChange={set('bio')} maxLength={280} />
          <small className="muted">{280 - fields.bio.length} characters left</small>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy || photo.uploading}>
          {busy ? 'Saving…' : photo.uploading ? 'Uploading photo…' : 'Save'}
        </button>
      </form>
    </Modal>
  );
}

function ConnectionsModal({ userId, type, onClose }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listFollowers(userId, type)
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message));
  }, [userId, type]);

  function setFollowing(id, following) {
    setUsers((current) => current.map((u) => (u.id === id ? { ...u, is_following: following } : u)));
  }

  return (
    <Modal title={type === 'followers' ? 'Followers' : 'Following'} onClose={onClose}>
      {error && <p className="form-error">{error}</p>}
      {!users && !error && <div className="list-status"><span className="spinner" aria-label="Loading" /></div>}
      {users?.length === 0 && <p className="muted pad">Nobody here yet.</p>}
      <div className="user-list">
        {users?.map((u) => (
          <UserRow key={u.id} user={u} onFollowChange={setFollowing} onNavigate={onClose} />
        ))}
      </div>
    </Modal>
  );
}

export default function Profile() {
  const { username } = useParams();
  const { user: me, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [connections, setConnections] = useState(null); // 'followers' | 'following' | null

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError('');
    setConnections(null);
    api
      .getProfile(username)
      .then((data) => !cancelled && setProfile(data))
      .catch((err) => !cancelled && setError(err.status === 404 ? 'This account doesn’t exist.' : err.message));
    return () => {
      cancelled = true;
    };
  }, [username]);

  const profileUser = profile?.user;
  const isSelf = Boolean(me) && profileUser?.id === me.id;
  const list = usePostList({ feed: 'user', userId: profileUser?.id, enabled: Boolean(profileUser) });
  const { prepend, patchAuthor } = list;

  useEffect(() => {
    if (!isSelf) return;
    const onCreated = (e) => {
      prepend(e.detail);
      setProfile((p) => ({ ...p, post_count: p.post_count + 1 }));
    };
    window.addEventListener(POST_CREATED_EVENT, onCreated);
    return () => window.removeEventListener(POST_CREATED_EVENT, onCreated);
  }, [isSelf, prepend]);

  function handleSaved(updated) {
    const fields = {
      display_name: updated.display_name,
      bio: updated.bio,
      avatar_url: updated.avatar_url,
    };
    setProfile((p) => ({ ...p, user: { ...p.user, ...fields } }));
    updateUser(fields);
    patchAuthor(me.id, fields);
    setEditing(false);
  }

  if (error) {
    return (
      <>
        <header className="page-header sticky"><h1>Profile</h1></header>
        <div className="empty"><strong>{error}</strong><p>Check the username and try again.</p></div>
      </>
    );
  }

  if (!profile) {
    return <div className="list-status"><span className="spinner" aria-label="Loading" /></div>;
  }

  return (
    <>
      <header className="page-header sticky">
        <h1>{profileUser.display_name}</h1>
        <p className="page-sub muted">{compactNumber(profile.post_count)} posts</p>
      </header>

      <section className="profile">
        <div className="profile-banner" />
        <div className="profile-top">
          <div className="profile-avatar">
            <Avatar user={profileUser} size={112} />
          </div>
          {isSelf ? (
            <button className="btn btn-outline" onClick={() => setEditing(true)}>Edit profile</button>
          ) : (
            <FollowButton
              size="md"
              userId={profileUser.id}
              following={profile.is_following}
              onChange={({ following, follower_count }) =>
                setProfile((p) => ({ ...p, is_following: following, follower_count }))
              }
            />
          )}
        </div>

        <div className="profile-info">
          <h2>{profileUser.display_name}</h2>
          <p className="muted">@{profileUser.username}</p>
          {profileUser.bio && <p className="profile-bio">{profileUser.bio}</p>}
          <p className="muted profile-joined">
            <CalendarIcon size={16} /> Joined {monthYear(profileUser.joined_at)}
          </p>
          <div className="profile-stats">
            <button onClick={() => setConnections('following')}>
              <strong>{compactNumber(profile.following_count)}</strong> <span className="muted">Following</span>
            </button>
            <button onClick={() => setConnections('followers')}>
              <strong>{compactNumber(profile.follower_count)}</strong>{' '}
              <span className="muted">{profile.follower_count === 1 ? 'Follower' : 'Followers'}</span>
            </button>
          </div>
        </div>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected="true" className="tab is-active">Posts</button>
        </div>
      </section>

      <PostList
        list={{
          ...list,
          remove: (id) => {
            list.remove(id);
            setProfile((p) => ({ ...p, post_count: p.post_count - 1 }));
          },
        }}
        empty={
          <>
            <strong>{isSelf ? "You haven't posted yet" : `@${profileUser.username} hasn't posted yet`}</strong>
            <p>{isSelf ? 'Your posts will show up here.' : 'When they do, their posts will show up here.'}</p>
          </>
        }
      />

      {editing && <EditProfileModal profileUser={profileUser} onClose={() => setEditing(false)} onSaved={handleSaved} />}
      {connections && (
        <ConnectionsModal userId={profileUser.id} type={connections} onClose={() => setConnections(null)} />
      )}
    </>
  );
}
