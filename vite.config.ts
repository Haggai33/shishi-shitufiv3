import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // ההגדרה פועלת רק על תהליך הבנייה (build)
  build: {
    esbuild: {
      drop: ['console', 'debugger'],
    },
  },
});