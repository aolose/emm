<script>
	import { onMount } from 'svelte';
	import { sys } from './sys';
	import Card from './Card.svelte';
	import Ipt from './Ipt.svelte';
	import { getErr, trim } from '$lib/utils';
	import { req } from '$lib/req';

	let up;
	let msg;
	let th;
	let ld;
	onMount(() =>
		sys.subscribe((a) => {
			up = a.uploadDir;
			th = a.thumbDir;
		})
	);
	let act;
	let err;
	const save = () => {
		if (th && up) {
			ld = 1;
			const o = {
				uploadDir: up,
				thumbDir: th
			};
			req('sys', o)
				.then(() => {
					err = 0;
					msg = 'update success';
					act = 1;
					sys.update((a) => ({ ...a, ...o }));
				})
				.catch((e) => {
					err = 1;
					msg = getErr(e);
					act = 1;
				})
				.finally(() => (ld = 0));
		}
	};
	$: {
		th = trim(th);
		up = trim(up);
		if (act) setTimeout(() => (act = 0), 3e3);
	}
</script>

<Card {act} {msg} {err} title="Files" {save} {ld}>
	<Ipt label="Upload Dir" bind:value={up} placeholder="./upload" />
	<Ipt label="Thumb Dir" bind:value={th} placeholder="./thumb" />
</Card>
