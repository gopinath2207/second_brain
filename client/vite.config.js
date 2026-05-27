import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Dev proxy: forward /api requests to local backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-tiptap';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('@dnd-kit')) return 'vendor-dnd';
            if (id.includes('@reduxjs') || id.includes('react-redux')) return 'vendor-redux';
            if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
          }
        },
      },
    },
  },
});
