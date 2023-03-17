<script>
	import Q from './mediaQuery.svelte';
  import { medium, small } from "$lib/store";
	let mobile = 0;
	let normal = 0;
	$: {
		small.set(mobile);
    medium.set(normal)
  }
</script>

<Q query="only screen and (max-width: 600px)" bind:matches={mobile} />
<Q query="only screen and (max-width: 1280px)" bind:matches={normal} />
