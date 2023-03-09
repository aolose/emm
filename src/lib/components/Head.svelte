<script>
	import { page } from '$app/stores';
	import { seo } from '$lib/store';
	import { onMount } from 'svelte';

	export let title;
	export let description;
	export let keywords;
	const up = () => {
		seo.update((a) => {
			return {
				...a,
				[$page.route.id]: {
					title,
					key: keywords,
					desc: description
				}
			};
		});
	};
	up();
	onMount(up);
</script>

<svelte:head>
	<slot />
</svelte:head>
