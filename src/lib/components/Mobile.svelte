<script>
	import Q from './mediaQuery.svelte';
	import { small } from '$lib/store';
	let mobile = 0;
	$: {
		small.set(mobile);
	}
</script>

<Q query="only screen and (max-width: 600px)" bind:matches={mobile} />
