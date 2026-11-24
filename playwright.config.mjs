import { defineConfig } from '@playwright/test';
const port = Number(process.env.LEARNOO_TEST_PORT || 18080);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('LEARNOO_TEST_PORT must be an integer from 1024 to 65535');
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, fullyParallel: false,
  use: { baseURL, browserName: 'chromium' },
  webServer: {
    command: `go run ./cmd/renderer -port ${port}`,
    url: `${baseURL}/lesson`, reuseExistingServer: false, timeout: 60000,
  },
  reporter: [['list']],
});
