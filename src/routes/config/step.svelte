<script>
	import { small } from '$lib/store';

	export let value = 0;
	export let info = [];
	const l = [0, [0, 30, 60, 90], [10, 40, 70, 100]];
	const fx = (a) => Math.floor(a + 0.5);
	let cc;
	$: cc = (n) =>
		$small ? 'none' : `polygon(0 0,100% 0,100% ${l[n][fx(value)]}%, 0 ${l[n][fx(value)]}%)`;
</script>

<div class="k">
	{#each [0, 1, 2] as n}
		<div class="a" class:f={n === 1} class:e={n === 2} style:clip-path={n && cc(n)}>
			{#each info as i, index}
				<div class="s" class:d={fx(value) > index} class:c={fx(value) === index}>
					{#if index !== 3}<i />{/if}
					<span>{index + 1}.</span>
					<p>{i}</p>
				</div>
			{/each}
		</div>
	{/each}
</div>

<style lang="scss">
	@use '../../lib/break' as *;

	.a {
		padding-left: 50px;
		width: 400px;
		z-index: 0;
		transition: clip-path 1s linear;
		color: var(--darkgrey);
		@include s() {
			padding: 5px 10px;
		}
	}

	.k {
		@include s() {
			position: absolute;
			left: 0;
			width: 100%;
			bottom: -80px;
			.a {
				margin: 0 auto;
			}
		}
	}

	.e,
	.f {
		z-index: 2;
		left: 0;
		top: 0;
		opacity: 0.5;
		position: absolute;
		color: #fff;
		clip-path: polygon(0 0, 100% 0, 100% 0%, 0 0%);
		@include s() {
			display: none !important;
		}
	}

	.e {
		z-index: 1;
		color: var(--blue);
	}

	span,
	p,
	i {
		background: var(--bg1);
		color: var(--darkgrey);
		transition: 0.3s ease-in-out;
	}

	span {
		height: 50px;
		display: flex;
		width: 50px;
		font-size: 30px;
		align-items: center;
		justify-content: center;
		font-family: 'Architects Daughter';
	}

	p {
		font-size: 18px;
		font-family: 'Architects Daughter';
		top: 55%;
		transform: translateY(-50%);
		position: absolute;
		left: 45px;
		white-space: nowrap;
	}

	i {
		display: block;
		left: 20px;
		top: 100px;
		height: 100%;
		border-left: 1px dashed currentColor;
		position: absolute;
	}

	.c {
		span {
			font-size: 40px;
		}

		p {
			font-size: 24px;
		}
	}

	.c,
	.d {
		p,
		span,
		i {
			color: currentColor;
		}
	}

	.s {
		padding: 20px 0;
		margin-bottom: 100px;
		display: flex;
		@include s() {
			width: 100%;
			margin: 0;
			padding: 0;
			display: none;
			justify-content: center;
			* {
				background: none !important;
				transform: none;
				color: var(--blue) !important;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				height: auto;
				position: relative;
				font-size: 20px !important;
			}
			i {
				display: none;
			}
			&.c {
				display: flex;
			}
		}

		&:last-child {
			margin: 0;
		}
	}
</style>
