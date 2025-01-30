<script>
	let { label, value = $bindable(), placeholder, box, password } = $props();
</script>

<form class="r" autocomplete="off">
	<span>{label}</span>
	{#if box}
		<textarea bind:value {placeholder}></textarea>
	{:else if password}
		<input type="password" bind:value {placeholder} />
	{:else}
		<input bind:value {placeholder} />
	{/if}
</form>

<style lang="scss">
	.r {
		font-size: 14px;
		margin: 10px;
		display: flex;
		padding: 10px 20px;
	}

	span {
		flex-shrink: 0;
		padding-top: 6px;
		width: 88px;
	}

	input,
	textarea {
		padding: 5px 10px;
		min-height: 34px;
		resize: none;
		font-size: 13px;
		line-height: 1.4;
		width: 0;
		flex: 1;
	}

	textarea {
		height: 100px;
	}
</style>
