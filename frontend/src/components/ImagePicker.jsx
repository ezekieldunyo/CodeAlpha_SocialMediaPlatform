import { useRef } from 'react';
import { IMAGE_ACCEPT } from '../hooks/useImageUpload.js';

// A button that opens the device's own file picker (on phones: photo library,
// camera and files). Renders `children` as the button's content.
export default function ImagePicker({ onPick, className, label, disabled, children }) {
  const input = useRef(null);

  return (
    <>
      <button type="button" className={className} onClick={() => input.current.click()} aria-label={label} disabled={disabled}>
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        data-testid="image-input"
        onChange={(e) => {
          onPick(e.target.files[0]);
          e.target.value = ''; // allow picking the same file again after removing it
        }}
      />
    </>
  );
}
