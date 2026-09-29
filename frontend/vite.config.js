import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api/* (and uploaded images under /uploads/*) are forwarded to the
// PHP server so the browser sees a single origin. Start the backend with:
//   php -d upload_max_filesize=6M -S localhost:8000 -t backend
const backend = process.env.WAVELINK_BACKEND || 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/uploads': backend,
    },
  },
});
