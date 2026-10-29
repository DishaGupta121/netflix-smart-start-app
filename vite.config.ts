import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/netflix-smart-start-app/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
