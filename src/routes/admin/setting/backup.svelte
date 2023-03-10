<script>
	import Card from './Card.svelte';
	import { clientRestore } from '$lib/utils';

	let msg, err, act, ld, t;
	const m = (a, e) => {
		msg = a;
		err = e;
		act = 1;
		clearTimeout(t);
		t = setTimeout(() => (act = 0), 3e3);
	};

	const up = clientRestore(
		(a) => {
			if (a) m(a);
			ld = 0;
		},
		(a) => {
			m(a, 1);
			ld = 0;
		},
		() => (ld = 1)
	);

	const ex = () => {
		window.open('/api/backup');
	};
</script>

<Card title="Tools" {msg} {err} {act} {ld}>
	<div class="r">
		<button on:click={ex}>
			backup
			<span class="icon i-down" /></button
		>
		<button>
			<input
				type="file"
				on:change={up}
				on:click={(e) => (e.target.value = '')}
				accept="application/zip"
			/>
			restore
			<span class="icon i-upload" />
		</button>
	</div>
</Card>

<style lang="scss">
	.r {
		padding: 0 30px;
		display: flex;
		align-items: center;
		justify-content: space-evenly;
	}

	input {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		width: auto;
		border: none;
		appearance: none;
		opacity: 0;
	}

	span {
		padding-left: 3px;
	}

	button {
		display: flex;
		align-items: center;
		border-radius: 4px;
		font-size: 13px;
		padding: 8px 20px 8px 26px;
		background: rgba(50, 90, 170, 0.5);

		&:hover {
			background: rgba(50, 90, 170, 0.8);
		}
	}
</style>
