<script>
	import { msg } from '$lib/store';
	import { onDestroy } from 'svelte';

	const base =
		'abcdefghijklmnopqrstuvwxyz齉齾爩鱻' + '癵籱饢驫鲡鹂鸾麣纞虋讟麷鞻韽韾响顟顠饙ㄅㄧㄥㄒㄧㄢㄘㄨ';
	const l = base.length;
	let pv = '';
	let pr = '';
	let a = 0;
	let t = -1;
	let start = 0;
	export let defaultText = '';
	onDestroy(
		msg.subscribe(() => {
			pv = '';
		})
	);

	$: {
		if (defaultText && !start) {
			msg.set(defaultText);
			start = 1;
		}
		if (start) {
			clearTimeout(t);
			if ($msg && $msg + ' ' !== pv) {
				t = setTimeout(function () {
					if (a++ < 3) {
						pr = base[Math.floor(Math.random() * l)];
					} else {
						clearTimeout(t);
						t = -1;
						a = 0;
						pr = '';
						pv = $msg.substr(0, pv.length + 1) + ' ';
					}
				}, 30);
			} else {
				if ($msg !== defaultText)
					t = setTimeout(function () {
						msg.set(defaultText);
						pv = '';
					}, 5000);
			}
		}
	}
</script>

<p>
	{pv}{pr}
</p>

<style lang="scss">
	p {
		font-size: inherit;
		font-family: 'Architects Daughter', -apple-system, BlinkMacSystemFont, PingFang SC,
			Helvetica Neue, STHeiti, Microsoft Yahei, Tahoma, Simsun, sans-serif;
		color: inherit;
		text-align: inherit;
	}
</style>
