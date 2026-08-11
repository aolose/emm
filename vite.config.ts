import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';

const config: UserConfig = {
	plugins: [sveltekit()],
	// vite 8 (rolldown) no longer reads experimentalDecorators from tsconfig;
	// TS legacy decorators must be enabled explicitly, like esbuild did before.
	oxc: {
		decorator: {
			legacy: true
		}
	},
	optimizeDeps: {
		exclude: [
			'svelte-codemirror-editor',
			'codemirror',
			'@codemirror/lang-markdown',
			'@codemirror/view',
			'@codemirror/state',
			'@codemirror/commands',
			'@codemirror/language',
			'@codemirror/autocomplete',
			'@codemirror/search',
			'@codemirror/lint'
		]
	}
};

export default config;
