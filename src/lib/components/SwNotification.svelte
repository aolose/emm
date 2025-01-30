<script>
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';

	const channel = new BroadcastChannel('sw-messages');
	channel.onmessage = (event) => {
		if (event.data?.type === 'CACHE_DONE') {
			show = true;
		}
	};
	let show = $state(false);
	const reg = async () => {
		const { serviceWorker } = navigator;
		if (serviceWorker) {
			let register = await serviceWorker.getRegistration();
			if (!register) {
				register = await serviceWorker.register('/service-worker.js', {
					type: dev ? 'module' : 'classic',
					scope: '/'
				});
			}
			setInterval(() => {
				const { waiting, installing } = register;
				if (!waiting && !installing) register.update().catch(console.error);
			}, 12e4); // 2min
		}
	};
	onMount(() => {
		reg();
	});
</script>

<div id="k" class:a={show}>
	<p>The data has been updated. Do you want to reload it?</p>
	<div>
		<button
			onclick={() => {
				setTimeout(() => {
					show = false;
					location.reload();
				});
			}}
			>Reload
		</button>
		<button
			onclick={() => {
				show = false;
			}}
			>Cancel
		</button>
	</div>
</div>

<style lang="scss">
	button {
		border-radius: 4px;
		opacity: 0.9;
		border: 0;
		padding: 3px 20px;
		font-size: 12px;
		color: #000;
		background: #fff;
		cursor: pointer;

		&:active {
			opacity: 1;
		}

		& + button {
			color: #f4f4fb;
			background: #333d50;
		}
	}

	#k {
		padding: 16px 20px;
		font-size: 14px;
		border-radius: 8px;
		justify-content: space-between;
		align-items: center;
		display: flex;
		gap: 20px;
		transform: translate3d(0, 130px, 1px);
		transition: 0.2s ease-in-out;
		position: fixed;
		z-index: 5;
		right: 0;
		bottom: 0;
		margin: 40px 20px;
		background: var(--bg1);
		border: var(--bg4) 1px solid;
		backdrop-filter: blur(6px);
		box-shadow: rgba(0, 0, 0, 0.9) 0 15px 40px;
		line-height: 1.8;

		div {
			display: flex;
			justify-content: flex-end;
			gap: 10px;
		}

		p {
			color: rgb(191, 194, 209);
		}

		&.a {
			transform: translate3d(0, 0, 1px);
		}

		@media screen and (max-width: 768px) {
			transform: translate3d(50%, 180px, 1px);
			width: 80%;
			right: 50%;
			margin: 32px 0;
			flex-direction: column;
			padding: 20px 24px;
			gap: 10px;
			button {
				margin: 0 3px;
				padding: 3px 28px;
			}
			&.a {
				transform: translate3d(50%, 0, 1px);
			}
		}
	}
</style>
