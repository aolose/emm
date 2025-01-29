<script lang="ts">
	import { run } from 'svelte/legacy';

	import { onMount } from 'svelte';

	let mql;
	let mqlListener;
	let wasMounted = $state(false);

	interface Props {
		query: any;
		matches?: boolean;
	}

	let { query, matches = $bindable(false) }: Props = $props();

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
