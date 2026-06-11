<script>
	let { label, value = $bindable(), placeholder, box, password } = $props();
	const pwdName = Math.random().toString(36).slice(2);
</script>

<form class="r" autocomplete="off">
	<span>{label}</span>
	{#if box}
		<textarea bind:value {placeholder}></textarea>
	{:else if password}
		<input type="password" name={pwdName} autocomplete="new-password" bind:value {placeholder} />
	{:else}
		<input bind:value {placeholder} autocomplete="off" />
	{/if}
</form>

<style lang="scss">
	@use '../../../lib/break' as *;
	.r {
		font-size: 14px;
		margin: 0 10px;
		display: flex;
		padding: 4px 20px;
		flex-wrap: wrap;
		gap: 8px;
		@include s() {
      margin: 10px 0;
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
