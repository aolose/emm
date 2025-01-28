// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';

const config: UserConfig = {
	plugins: [
		sveltekit(),
	]
};

export default config;
