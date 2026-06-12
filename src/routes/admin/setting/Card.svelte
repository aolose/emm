<script>
	import Tip from './Tip.svelte';
	import Ld from '$lib/components/loading.svelte';
	let { ld, msg, act, err, title, save, saveText = 'Save', empty=false, btn=null, children } = $props();
</script>

<div class="a" class:e={empty}>
	<Tip {act} {err} text={msg} />
	<div class="t">
		<h1>{title}</h1>
		{#if save}
			<button onclick={save}>{saveText}</button>
		{/if}
		{@render btn?.()}
	</div>
	{@render children?.()}
	<Ld act={ld} />
</div>

<style lang="scss">
	@use '../../../lib/break' as *;
	.a {
		display: flex;
		border-radius: 14px;
		background: rgba(0, 0, 0, 0.8);
		flex-direction: column;
    border: 0.5px solid rgb(138 209 255 / 0.13);
		padding-bottom: 20px;
		@include s() {
			margin: 0;
			border: none;
			border-bottom: 0.5px solid rgb(138 209 255 / 0.13);
      border-radius: 0;
		}
	}
	.e {
		padding: 0;

		.t {
			margin: 0;
		}
	}

	.t {
		align-items: center;
		margin-bottom: 20px;
		border-bottom: 1px solid rgba(10, 20, 40, 0.1);
		padding: 8px 30px;
		display: flex;
		justify-content: space-between;
	}

	h1 {
		color: transparent;
		background: linear-gradient(132deg, rgb(195, 201, 205), rgb(134, 153, 220));
		background-clip: text;
		font-size: 18px;
		line-height: 3;
	}
</style>
