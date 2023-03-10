import { writable } from 'svelte/store';

export const h = writable({
	title: '',
	key: '',
	desc: ''
});
