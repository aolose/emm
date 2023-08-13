<script>
	import { onMount } from 'svelte';
	import { sys } from './sys';
	import Card from './Card.svelte';
	import Ipt from './Ipt.svelte';
	import { getErr, trim } from '$lib/utils';
	import { req } from '$lib/req';
	import { h } from '$lib/store';
	let nm;
	let bio;
	let linkedin;
	let github;
	let msg;
	let ld;
	let err = 0;
	let act;
	let key;
	let robot;
	let mx = 1000;
	let desc;
	onMount(() =>
		sys.subscribe((a) => {
			robot = a.robots;
			nm = a.blogName;
			bio = a.blogBio;
			linkedin = a.linkedin;
			github = a.github;
			key = a.seoKey;
			desc = a.seoDesc;
			mx = a.maxFireLogs || 1000;
		})
	);
	const save = () => {
		ld = 1;
		const o = {
			seoKey: key,
			robots: robot,
			maxFireLogs: mx,
			seoDesc: desc,
			blogName: nm,
			blogBio: bio,
			github,linkedin
		};
		req('sys', o)
			.then(() => {
				act = 1;
				sys.update((a) => ({ ...a, ...o }));
				err = 0;
				msg = 'update success';
				h.set({ title: nm, key: key, desc: desc });
			})
			.catch((e) => {
				act = 1;
				err = 1;
				msg = getErr(e);
			})
			.finally(() => (ld = 0));
	};
	$: {
		nm = trim(nm);
		bio = trim(bio, true);
		desc = trim(desc, true);
		key = trim(key, true);
		mx = Math.abs(+mx) || 1000;
		if (act) {
			setTimeout(() => (act = 0), 2e3);
		}
	}
</script>

<Card {act} {msg} {err} title="Blog" {save} {ld}>
	<Ipt label="Name" bind:value={nm} placeholder="my blog" />
	<Ipt box label="Bio" bind:value={bio} placeholder="say something" />
	<Ipt label="LinkedIn" bind:value={linkedin} placeholder="your linkedin" />
	<Ipt label="Github" bind:value={github} placeholder="your github" />
	<Ipt label="Keywords" bind:value={key} placeholder="photos,foods,.ect" />
	<Ipt box label="Description" bind:value={desc} placeholder="description for seo" />
	<Ipt box label="Robots.text" bind:value={robot} placeholder="robots" />
	<Ipt label="Max number of logs" bind:value={mx} />
</Card>
