<script>
	import { onMount } from 'svelte';

	let { value = $bindable(), children, ck = $bindable() } = $props();
	onMount(() => {
		ck = () => (value = !value);
	});
</script>

<div class="a" class:c={value} onclick={ck}>
	{value ? '✓' : ''}
</div>
<span onclick={ck}>{@render children?.()}</span>

<style>
	span {
		height: 20px;
		top: 7px;
		padding-left: 10px;
		user-select: none;
		line-height: 20px;
	}

	.c + span {
		color: #7c93a9;
	}

	.a {
		width: 20px;
		height: 20px;
		margin-top: 7px;
		border: 1px solid #304565;
		background: var(--bg1);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 3px;
		transition: 0.1s ease-in-out;
	}

	.c {
		border-color: transparent;
		background: #1c93ff;
	}
</style>
