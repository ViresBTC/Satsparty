import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // SPA fallback: /onboard/:code → index.html
  appType: 'mpa',
  plugins: [
    {
      name: 'spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Routes starting with /onboard/ should serve index.html
          if (req.url && req.url.startsWith('/onboard/')) {
            req.url = '/index.html';
          }
          next();
        });
      },
    },
  ],
});
