<script lang="ts">
	import { slide } from 'svelte/transition';
	import { time } from '$lib/utils';

	interface Props {
		value?: number;
		name?: string;
	}

	let { value = 0, name = '' }: Props = $props();
	let t = $derived(+value && time(+value));
</script>

{#if +value}
	<label transition:slide|global>{name}:<span>{t}</span></label>
{/if}

<style lang="scss">
  span {
    padding-left: 5px;
    line-height: 1.6;
  }
</style>
