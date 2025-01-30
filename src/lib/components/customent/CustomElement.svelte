<script>
	import { run } from 'svelte/legacy';

	import { onMount } from 'svelte';
	import { elmCpm, elmProps, elmTmpl } from '$lib/store';

	let z = $state();
	const o = $state({});
	run(() => {
		let s = 0;
		const z = {};
		for (const [k, v] of Object.entries(o)) {
			z[k] = v;
			s = 1;
		}
		if (s) elmTmpl.update((a) => ({ ...a, ...z }));
	});
	onMount(() => {
		const obs = new MutationObserver(() => {
			elmTmpl.update((a) => ({ ...a }));
		});
		obs.observe(z, {
			childList: true,
			subtree: true,
			attributes: true
		});
	});
</script>

<div bind:this={z}>
	{#each Object.entries($elmProps) as [k, p] (k)}
		{@const SvelteComponent = elmCpm[k.replace(/@.*/, '')]}
		<div bind:this={o[k]}>
			<SvelteComponent {...p} />
		</div>
	{/each}
</div>

<style>
	div {
		display: none;
	}
</style>
