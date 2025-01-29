<script lang="ts">
	import { upDownScroller } from '$lib/utils';

	interface Props {
		down?: number;
	}

	let { down = $bindable(0) }: Props = $props();
	const ons = upDownScroller((v) => (down = v));
</script>

<svelte:body onscrollcapture={ons} />
