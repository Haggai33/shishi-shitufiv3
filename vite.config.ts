import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    terserOptions: {
      compress: {
        drop_console: true, // מסיר את כל קריאות ה-console.*
        drop_debugger: true, // מסיר את כל קריאות ה-debugger
      },
    },
  },
  // -------------------------
});