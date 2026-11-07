import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const envBasePath = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env?.VITE_BASE_PATH;

export default defineConfig({
  base: envBasePath || '/rubiks-cube-academy/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
