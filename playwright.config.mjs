import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests/browser', timeout: 30000, fullyParallel: false,
 use: { baseURL: 'http://127.0.0.1:8080', browserName: 'chromium' },
 webServer: { command: 'go run ./cmd/renderer -port 8080', url: 'http://127.0.0.1:8080/lesson', reuseExistingServer: !process.env.CI, timeout: 60000 },
 reporter: [['list']],
});
