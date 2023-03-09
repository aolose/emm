<script>
	export let idx = 1;
	export let cls = '';
	export let size = 60;
	export let click = null;
</script>

<i
	style={`width:${size}px;height:${size}px`}
	class={`a av${idx} ${cls}`}
	class:c={!!click}
	on:click={click}
/>

<style lang="scss">
	@import './av.css';
	.c {
		cursor: pointer;
	}

	.a {
		background-position: center;
		background-repeat: no-repeat;
		background-size: auto 80%;
	}
</style>
