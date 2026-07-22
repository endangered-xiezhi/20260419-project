import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig, loadEnv} from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // GitHub Pages uses a project subpath; full-stack hosts can override it with VITE_BASE_PATH=/.
    base: env.VITE_BASE_PATH || (mode === 'production' ? '/20260419-project/' : '/'),
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/react/') || id.includes('/react-dom/')) return 'react-vendor';
            if (id.includes('/docx/') || id.includes('/jszip/')) return 'document-vendor';
            if (id.includes('/lucide-react/')) return 'icons-vendor';
            if (id.includes('/framer-motion/') || id.includes('/motion/')) return 'motion-vendor';
            return 'vendor';
          },
        },
      },
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/yuanqi': {
          target: 'https://open.hunyuan.tencent.com',
          changeOrigin: true,
          timeout: 60000,
          rewrite: (path) => path.replace(/^\/api\/yuanqi/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('X-Source', 'openapi');
            });
          }
        }
      }
    },
  };
});
