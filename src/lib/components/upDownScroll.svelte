<script>
	import { upDownScroller } from '$lib/utils';
	let { down = $bindable(0) } = $props();
	const ons = upDownScroller((v) => (down = v));
</script>

<svelte:body onscrollcapture={ons} />
