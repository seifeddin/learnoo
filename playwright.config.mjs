import { defineConfig } from '@playwright/test';
const port = Number(process.env.LEARNOO_TEST_PORT || 18080);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('LEARNOO_TEST_PORT must be an integer from 1024 to 65535');
const studioPort = Number(process.env.LEARNOO_STUDIO_TEST_PORT || 18180);
if (!Number.isInteger(studioPort) || studioPort < 1024 || studioPort > 65535 || studioPort === port) throw new Error('LEARNOO_STUDIO_TEST_PORT must be another integer from 1024 to 65535');
const baseURL = `http://127.0.0.1:${port}`;
export const studioURL = `http://127.0.0.1:${studioPort}`;
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, fullyParallel: false,
  use: { baseURL, browserName: 'chromium' },
  webServer: [
    {
      command: `go run ./cmd/renderer -port ${port}`,
      url: `${baseURL}/lesson`, reuseExistingServer: false, timeout: 60000,
    },
    {
      // Built Studio (web/studio) served by vite preview, proxying /preview and /static to the renderer above.
      command: 'npm --prefix web/studio run preview:test',
      env: { LEARNOO_STUDIO_PORT: String(studioPort), LEARNOO_RENDERER_URL: baseURL },
      url: studioURL, reuseExistingServer: false, timeout: 60000,
    },
  ],
  reporter: [['list']],
});
