import { useRef, useState } from 'react';
import { api } from '../api.js';
import { Avatar } from './Avatar.jsx';
import { readFileAsDataUrl } from '../utils/readFile.js';

export function EditProfile({ profile, onClose, onSaved }) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatar, setAvatar] = useState(profile.avatar_url);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  const pickAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setAvatar(await readFileAsDataUrl(file));
    } catch (readError) {
      setError(readError.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api.updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar: avatar ?? '',
      });
      onSaved(data.user);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit profile">
      <div className="modal">
        <h2>Edit profile</h2>
        <form onSubmit={submit}>
          <div className="avatar-picker">
            <Avatar user={{ ...profile, avatar_url: avatar }} size={72} linked={false} />
            <button type="button" className="outline-btn" onClick={() => fileInput.current?.click()}>
              Change avatar
            </button>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickAvatar} />
          </div>
          <label>
            Display name
            <input required maxLength={60} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label>
            Bio
            <textarea maxLength={280} rows={3} value={bio} onChange={(event) => setBio(event.target.value)} />
            <small>{bio.length}/280</small>
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="outline-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="post-cta" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
