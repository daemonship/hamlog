import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // During development, /api/* → backend (unused if api.js uses absolute URL)
      // Left here for future use; frontend uses http://localhost:8000 directly
    },
  },
});
