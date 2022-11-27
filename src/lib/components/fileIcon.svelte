<script>
	export let type = 'any';
	export let color = '#103a81';
	export let size = 50;
</script>

<div class="a" style:color style:width={`${size}px`} style:height={`${size * 1.2}px`}>
	<div class="b" />
	<span style:font-size={`${(8 + size / 5).toFixed(1)}px`}>{type}</span>
</div>

<style lang="scss">
	.a {
		flex: 0;
		border-radius: 4px;
		position: relative;
		background: currentColor;
		clip-path: polygon(0 0, 70% 0, 100% 25%, 100% 100%, 0 100%);
	}

	.b {
		right: 0;
		top: 0;
		position: absolute;
		width: 30%;
		padding-top: 30%;
		background: rgba(255, 255, 255, 0.2);
	}
	span {
		color: #fff;
		position: absolute;
		bottom: 8%;
		left: 8%;
		opacity: 0.8;
	}
</style>
