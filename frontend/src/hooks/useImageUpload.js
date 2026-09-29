import { useCallback, useEffect, useRef, useState } from 'react';

// Mirrors backend/includes/uploads.php. The server is the real check (it looks
// at the file's contents); these just give instant feedback before uploading.
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',');
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const IDLE = { status: 'idle', preview: null, url: null, error: '' };

// Picks → previews (local object URL) → uploads straight away with `upload`
// (e.g. api.uploadPostImage), exposing the server URL once it's done.
// Removing or re-picking mid-upload discards the older upload's result.
export default function useImageUpload(upload) {
  const [state, setState] = useState(IDLE);
  const attempt = useRef(0);
  const previewUrl = useRef(null);

  const revokePreview = useCallback(() => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
  }, []);

  useEffect(() => revokePreview, [revokePreview]);

  const pick = useCallback(
    async (file) => {
      if (!file) return;
      const id = ++attempt.current;
      revokePreview();

      // Some systems report no type for unusual files; let the server decide those.
      if (file.type && !IMAGE_TYPES.includes(file.type)) {
        setState({ ...IDLE, error: "That file isn't a supported image. Please choose a JPEG, PNG, GIF or WebP." });
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setState({ ...IDLE, error: 'That image is too large. The maximum size is 5 MB.' });
        return;
      }

      previewUrl.current = URL.createObjectURL(file);
      setState({ status: 'uploading', preview: previewUrl.current, url: null, error: '' });
      try {
        const { url } = await upload(file);
        if (id !== attempt.current) return;
        setState((s) => ({ ...s, status: 'done', url }));
      } catch (err) {
        if (id !== attempt.current) return;
        revokePreview();
        setState({ ...IDLE, error: err.message });
      }
    },
    [upload, revokePreview]
  );

  const clear = useCallback(() => {
    attempt.current++;
    revokePreview();
    setState(IDLE);
  }, [revokePreview]);

  return { ...state, uploading: state.status === 'uploading', pick, clear };
}
