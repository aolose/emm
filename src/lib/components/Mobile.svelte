<script>
	import Q from './mediaQuery.svelte';
	import { expand, medium, small } from '$lib/store';
	let mobile = $state(0);
	let normal = $state(0);
	$effect(() => {
		small.set(mobile);
		medium.set(normal);
		expand.set(+!mobile);
	});
</script>

<Q query="only screen and (max-width: 600px)" bind:matches={mobile} />
<Q query="only screen and (max-width: 1280px)" bind:matches={normal} />
