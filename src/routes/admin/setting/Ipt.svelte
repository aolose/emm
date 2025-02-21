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
	@use '../../../lib/break' as *;
	.r {
		font-size: 14px;
		margin: 10px;
		display: flex;
		padding: 10px 20px;
		flex-wrap: wrap;
		gap: 8px;
		@include s() {
			padding: 8px;
		}
	}

	span {
		flex-shrink: 0;
		padding-top: 8px;
		width: 128px;
		@include s() {
			width: 100%;
			padding-left: 8px;
		}
	}
</style>
