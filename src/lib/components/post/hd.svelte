<script>
	let { shrink = 0, desc, children } = $props();
</script>

<div class="ph" class:s={shrink}>
	<div class="cc">
		<h1>
			{@render children?.()}
			{#if desc}
				<p>{desc}</p>
			{/if}
		</h1>
	</div>
</div>

<style lang="scss">
	@use '../../break' as *;

	.cc {
		height: 120px;
		width: 90%;
		margin: 0 auto;
		transition: 0.3s ease-in-out;
		position: relative;

		h1 {
			transition: 0.3s ease-in-out;
			margin: 0;
			font-size: 34px;
			position: absolute;
			transform: translate3d(10px, 60px, 0);
			color: #4c7fb9;
			font-weight: 200;
			text-transform: uppercase;
			text-shadow: rgba(20, 30, 60, 0.4) 1px 1px 30px;
			@include s() {
				text-align: center;
				left: -10px;
				right: 10px;
			}
			p {
				font-size: 13px;
				color: var(--darkgrey-h);
			}

			&:first-letter {
				color: #fff;
			}

			:global {
				a {
					color: inherit;
				}
			}
		}
	}

	.ph {
		transform: translate3d(0, 0, 0);
		position: relative;

		&.s {
			@include s() {
				.cc {
					height: 40px;

					h1 {
						transform: translate3d(10px, 30px, 0);
						font-size: 20px;
						opacity: 0;
					}
				}
			}
		}
	}
</style>
