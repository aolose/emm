<script>
	import { onMount } from 'svelte';
	import { elmCpm, elmProps, elmTmpl } from '$lib/store';

	let z;
	const o = {};
	$: {
		let s = 0;
		const z = {};
		for (const [k, v] of Object.entries(o)) {
			z[k] = v;
			s = 1;
		}
		if (s) elmTmpl.update((a) => ({ ...a, ...z }));
	}
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
		<div bind:this={o[k]}>
			<svelte:component this={elmCpm[k.replace(/@.*/, '')]} {...p} />
		</div>
	{/each}
</div>

<style>
    div {
        display: none;
    }
</style>
