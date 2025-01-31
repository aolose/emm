<script>
	import Tip from './Tip.svelte';
	import Ld from '$lib/components/loading.svelte';
	let { ld, msg, act, err, title, save, saveText = 'Save', empty, btn, children } = $props();
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
		margin: 9px;
		border-radius: 16px;
    background: rgba(40, 44, 55, 0.1);
		flex-direction: column;
		padding-bottom: 20px;
		:global {
			button{
				min-width: 100px;
			}
		}
		@include s() {
			width: 96%;
			margin: 5px auto;
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
