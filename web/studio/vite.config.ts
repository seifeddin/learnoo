import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Loopback only, like the renderer experiment. /preview and /static are proxied
// to the Go renderer so the preview is same-origin and uses the canonical HTML.
const renderer = process.env.LEARNOO_RENDERER_URL ?? 'http://127.0.0.1:8080';
const port = Number(process.env.LEARNOO_STUDIO_PORT ?? 5173);
const proxy = {
  '/preview': { target: renderer, changeOrigin: true },
  '/static': { target: renderer, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port, strictPort: true, proxy, fs: { allow: ['.', '../design', '../../internal/rendering/fixtures'] } },
  preview: { host: '127.0.0.1', port, strictPort: true, proxy },
  test: { environment: 'jsdom', include: ['test/**/*.test.ts'], setupFiles: ['test/setup.ts'] },
});
