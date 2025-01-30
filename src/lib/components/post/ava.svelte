<script>
	let { idx = 1, cls = '', size = 60, click = null } = $props();
</script>

<i
	style={`width:${size}px;height:${size}px`}
	class={`a av${idx} ${cls}`}
	class:c={!!click}
	onclick={click}
></i>

<style lang="scss">
	@use './av.css' as *;

	.c {
		cursor: pointer;
	}

	.a {
		background-position: center;
		background-repeat: no-repeat;
		background-size: auto 80%;
	}
</style>
