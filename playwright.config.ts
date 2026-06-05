import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e/playwright',
	webServer: {
		command: 'bun --bun run vite dev --port 5173 --host',
		url: 'http://localhost:5173/api/statue',
		reuseExistingServer: !process.env.CI,
		timeout: 60000
	},
	use: {
		baseURL: 'http://localhost:5173',
		browserName: 'chromium',
		headless: true,
		viewport: { width: 1280, height: 720 },
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure'
	},
	retries: process.env.CI ? 1 : 0,
	reporter: [['list'], ['html', { outputFolder: 'tests/e2e/playwright/report' }]],
	outputDir: 'tests/e2e/playwright/results'
});
