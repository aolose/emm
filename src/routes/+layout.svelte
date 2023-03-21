<script>
	import Mobile from '$lib/components/Mobile.svelte';
	import Confirm from '$lib/components/confirm.svelte';
	import CustomElement from '$lib/components/customent/CustomElement.svelte';
	import { beforeNavigate } from '$app/navigation';
	import { navStore } from '$lib/store';
	beforeNavigate((nav) => {
		navStore.set(nav);
	});
</script>

<slot />
<Mobile />
<Confirm />
<CustomElement />
