<script>
	let { type = 'any', size = 50 } = $props();
	const colors = [
		'#264653',
		'#2a9d8f',
		'#f4a261',
		'#e76f51',
		'#0077b6',
		'#4a4e69',
		'#386641',
		'#ff90b3',
		'#1a659e'
	];
	const color = colors[type.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % colors.length];
</script>

<div class="a" style:color style:width={`${size}px`} style:height={`${size * 1.2}px`}>
	<div class="b"></div>
	<span style:font-size={`${(size / Math.min(3, Math.max(type.length * 1, 2))).toFixed(1)}px`}
		>{type}</span
	>
</div>

<style lang="scss">
	.a {
		border-radius: 4px;
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
		line-height: 1 !important;
	}
</style>
