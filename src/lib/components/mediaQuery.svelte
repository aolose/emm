<script>
	import { run } from 'svelte/legacy';

	import { onMount } from 'svelte';

	let mql;
	let mqlListener;
	let wasMounted = $state(false);
	let { query, matches = $bindable(false) } = $props();

	onMount(() => {
		wasMounted = true;
		return () => {
			removeActiveListener();
		};
	});

	function addNewListener(query) {
		mql = window.matchMedia(query);
		mqlListener = (v) => (matches = v.matches);
		mql.addEventListener('change', mqlListener);
		matches = mql.matches;
	}

	function removeActiveListener() {
		if (mql && mqlListener) {
			mql.removeListener(mqlListener);
		}
	}

	run(() => {
		if (wasMounted) {
			removeActiveListener();
			addNewListener(query);
		}
	});
</script>
