// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

const config: UserConfig = {
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			devOptions: {
				enabled: true,
				type: 'module'
			},
			strategies: 'generateSW',
			srcDir: 'src',
			filename: 'sw.js',
			injectRegister: null
		})
	]
};

export default config;
