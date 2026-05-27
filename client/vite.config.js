import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  // Pre-bundle ALL heavy deps so the optimizer doesn't hang on Vercel
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      '@reduxjs/toolkit', 'react-redux',
      'axios', 'react-hot-toast',
      'lucide-react', 'recharts',
      'framer-motion',
      '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', '@dnd-kit/modifiers',
      '@tiptap/react', '@tiptap/starter-kit',
      '@tiptap/extension-placeholder', '@tiptap/extension-task-list',
      '@tiptap/extension-task-item', '@tiptap/extension-text-style',
      'date-fns',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Increase chunk size warning limit (TipTap is legitimately large)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-tiptap';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('@dnd-kit')) return 'vendor-dnd';
            if (id.includes('@reduxjs') || id.includes('react-redux')) return 'vendor-redux';
            if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
          }
        },
      },
    },
  },
});
