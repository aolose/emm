<script>
	import { slide } from 'svelte/transition';
	import { time } from '$lib/utils';
	export let value = 0;
	export let name = '';
	$: t = +value && time(+value);
</script>

{#if +value}
	<label transition:slide>{name}:<span>{t}</span></label>
{/if}

<style lang="scss">
	span {
		padding-left: 5px;
		line-height: 1.6;
	}
</style>
