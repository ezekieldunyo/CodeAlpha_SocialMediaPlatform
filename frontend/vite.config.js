import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api/* is forwarded to the PHP server so the browser sees a single
// origin. Start the backend with:  php -S localhost:8000 -t backend
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.WAVELINK_BACKEND || 'http://localhost:8000',
    },
  },
});
