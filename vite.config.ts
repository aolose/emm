import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';
import { defineConfig } from 'vitest/config';

const config: UserConfig = {
	plugins: [sveltekit()],
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['setupTest.ts'],
		includeSource: ['src/**/*.{js,ts,svelte}']
	}
};

export default defineConfig(config);
