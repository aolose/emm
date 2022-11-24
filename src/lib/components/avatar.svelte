<script>
	export let pic = '';
	export let href = '1';
</script>

<div class="a" class:c={href}>
	<div class="b" style:background-image={pic ? `url(${pic})` : ''} />
	<div class="icon i-gravatar" />
</div>

<style lang="scss">
	.c {
		cursor: pointer;
		&:hover {
			box-shadow: var(--blue) 0 0 13px -7px;
		}
	}

	.a {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		right: 0;
		background: var(--bg2);
		border-radius: 50%;
		border: 2px solid #293042;
	}

	.b {
		z-index: 1;
	}

	.icon {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #8fbb74;
		opacity: 0.9;
		font-size: 30px;
	}
</style>
