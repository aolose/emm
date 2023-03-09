<script>
	import Cm from '$lib/components/comment/cm.svelte';
	import Itm from './itm.svelte';
	import { onMount } from 'svelte';
	import { req } from '$lib/req';
	import Pg from '$lib/components/pg.svelte';
	import Ld from '$lib/components/loading.svelte';
	import { method } from '$lib/enum';
	import { randNm, rndAr } from '$lib/utils';
	import { msg } from './msg';
	import { fly } from 'svelte/transition';

	let page = 1;
	let total = 1;
	let ld = 0;
	const cur = {
		act: 0,
		topic: 0,
		reply: 0,
		name: '',
		avatar: '',

		set(o = {}) {
			Object.keys(o).forEach((k) => {
				if (Object.hasOwn(cur, k)) {
					cur[k] = o[k];
				}
			});
		},
		refresh() {
			cur.name = randNm();
			cur.avatar = localStorage.av = rndAr(avLs);
		}
	};

	function go(n = 1) {
		page = n;
		req('cmLs', { page, slug }, { method: method.GET }).then(({ total: t, items: d }) => {
			total = t;
			ls = d;
		});
	}

	const avLs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
	onMount(() => {
		cur.name = localStorage.nm || randNm();
		cur.avatar = localStorage.av || rndAr(avLs);
		go();
		msg.subscribe((m) => {
			if (m.length) {
				setTimeout(() => msg.set([]), 2e3);
			}
		});
	});
	let ls = [];
	const user = {
		name: '',
		avatar: 0,
		set(name, avatar) {
			user.name = name;
			user.avatar = avatar;
		}
	};

	function done(a) {
		if (a) {
			user.set(cur.name, cur.avatar);
			ls = [a, ...ls].slice(0, 5);
		}
	}

	$: {
		if (cur.name) localStorage.nm = cur.name;
		if (cur.avatar) localStorage.av = cur.avatar;
	}
	const rm = (i) => () => {
		ls = ls.filter((a) => a !== i);
	};
	export let slug = '';
</script>

{#if $msg.length === 2}
	<div class="tp" class:su={$msg[0]} class:fa={!$msg[0]} transition:fly={{ y: -50, duration: 500 }}>
		{$msg[1]}
	</div>
{/if}
<div class="a">
	{#each ls as i}
		<Itm d={i} {cur} {user} remove={rm(i)} />
	{/each}
	{#if total > 1}
		<div class="p">
			<Pg {page} {total} {go} />
		</div>
	{/if}
	<Ld act={ld} />
</div>
<Cm av={avLs} {slug} {cur} {user} {done} />

<style lang="scss">
	@import '../../../lib/break';
	.p {
		display: flex;
		justify-content: center;
	}
	.a {
		margin-bottom: 60px;
		@include s() {
			margin-bottom: 40px;
		}
	}
	.tp {
		text-align: center;
		min-width: 200px;
		max-width: 90%;
		position: fixed;
		z-index: 99;
		border-radius: 6px;
		box-shadow: rgba(0, 0, 0, 0.25) 0 3px 10px -4px;
		padding: 10px;
		top: 60px;
		min-height: 30px;
		transform: translateX(-50%);
		left: 50%;
		color: #fff;
		backdrop-filter: blur(2px);
	}

	.su {
		background-color: transparentize(#16b005, 0.3);
	}

	.fa {
		background-color: transparentize(#ff0044, 0.8);
	}
</style>
