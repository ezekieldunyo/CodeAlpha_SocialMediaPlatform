import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The PHP API runs on its own port; proxying keeps the frontend on one origin
// in dev and makes /uploads images resolve without absolute URLs.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
});
