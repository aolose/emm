<script>
	import { msg } from '$lib/store';
	import { onMount } from 'svelte';

	const base =
		'abcdefghijklmnopqrstuvwxyz齉齾爩鱻' + '癵籱饢驫鲡鹂鸾麣纞虋讟麷鞻韽韾响顟顠饙ㄅㄧㄥㄒㄧㄢㄘㄨ';
	const l = base.length;
	let pv = $state('');
	let pr = $state('');
	let t = -1;
	let { defaultText = '' } = $props();

	const autoText = (str) => {
		clearTimeout(t);
		const m = str.length;
		let i = 1;
		const r = () => {
			const b = Math.floor(i);
			pv = str.substring(0, b);
			if (i < m) {
				pr = base[Math.floor(Math.random() * l)];
			} else {
				pr = '';
				return;
			}
			i += 0.5;
			t = setTimeout(r, 40);
		};
		r();
	};
	onMount(() => {
		let u;
		const getMsg = () =>
			(u = msg.subscribe((m) => {
				if (m) autoText(m);
			}));
		let r;
		if (defaultText) {
			autoText(defaultText);
			r = setTimeout(getMsg, 5e3);
		} else getMsg();

		return () => {
			clearTimeout(r);
			clearTimeout(t);
			if (u) u();
		};
	});
</script>

<p>
	{pv}{pr}
</p>

<style lang="scss">
	p {
		font-size: inherit;
		font-family: 'Architects Daughter';
		color: inherit;
		text-align: inherit;
	}
</style>
