<script>
	import { run } from 'svelte/legacy';

	import { onMount } from 'svelte';
	import { sys } from './sys';
	import Card from './Card.svelte';
	import Ipt from './Ipt.svelte';
	import { getErr, trim, watch } from '$lib/utils';
	import { req } from '$lib/req';
	import { method } from '$lib/enum';

	let token = $state();
	let dir = $state();
	let msg = $state();
	let act = $state(0);
	let ld = $state();

	onMount(() =>
		sys.subscribe((a) => {
			token = a.ipLiteToken;
			dir = a.ipLiteDir;
		})
	);
	run(() => {
		dir = trim(dir);
		token = trim(token);
	});
	let t,
		err = $state();
	let geoStatue = $state('');
	const cl = () => clearInterval(t);
	const getGeoStatus = () => {
		geoStatue = 'waiting';
		cl();
		let ld;
		t = setInterval(() => {
			if (!ld) {
				ld = 1;
				req('geo', undefined, { method: method.GET })
					.then((a) => {
						geoStatue = (a === '-' && 'downloading') || (a ? `version ${a}` : 'unavailable');
						if (a !== '-') cl();
					})
					.finally(() => (ld = 0));
			}
		}, 1e3);
		return;
	};
	const w = watch(act);
	onMount(getGeoStatus);
	const save = () => {
		ld = 1;
		const o = {
			ipLiteToken: token,
			ipLiteDir: dir
		};
		req('sys', o)
			.then(() => {
				getGeoStatus();
				sys.update((a) => ({ ...a, ...o }));
				err = 0;
				msg = 'update success';
				act = 1;
			})
			.catch((e) => {
				err = 1;
				msg = getErr(e);
				act = 1;
			})
			.finally(() => (ld = 0));
	};
	run(() => {
		w(() => {
			if (act) setTimeout(() => (act = 0), 2e3);
		}, act);
	});
</script>

<Card {act} {msg} {err} title="IpLite Database" {save} {ld}>
	<span>status <b>{geoStatue}</b></span>
	<Ipt label="Download Path" bind:value={dir} placeholder="dir" />
	<Ipt label="Token" bind:value={token} placeholder="token" box />
	<a href="https://lite.ip2location.com/database-download" target="_blank" rel="noreferrer"
		>where is my token?</a
	>
	<s></s>
</Card>

<style>
	span {
		padding: 0 30px;
	}

	b {
		margin-left: 40px;
		font-weight: 200;
		color: cornflowerblue;
	}

	s {
		padding: 5px;
	}

	a {
		opacity: 0.8;
		bottom: 20px;
		right: 30px;
		position: absolute;
		color: dodgerblue;
		text-decoration: underline;
	}
</style>
