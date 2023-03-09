<script>
	import { act } from '$lib/use';
	import { req } from '$lib/req';
	import { method } from '$lib/enum';
	import { status } from '$lib/store';
	import { confirm } from '$lib/store';
	function logout() {
		confirm('Log out?').then((a) => {
			if (a)
				req('logout', undefined, { method: method.GET }).then(() => {
					status.set(0);
				});
		});
	}
</script>

<div class="m">
	<a class="o" href="/" />
	<div class="u">
		<s />
		<a use:act href="/admin" class="icon i-post" />
		<a use:act href="/admin/comment" class="icon i-comment" />
		<a use:act href="/admin/tag" class="icon i-tag" />
		<a use:act href="/admin/firewall" class="icon i-safe" />
		<a use:act href="/admin/token" class="icon i-rq" />
		<a use:act href="/admin/setting" class="icon i-sys" />
		<s />
		<s />
	</div>
	<div class="v">
		<button on:click={logout} class="icon i-exit" />
	</div>
</div>

<style lang="scss">
	@import '../../lib/break';

	.v {
		height: 30px;
		width: 100%;
		padding-bottom: 70px;

		button {
			margin: 0 auto;
			transform: rotateY(180deg);

			&:hover {
				color: #fff;
				background: var(--blue);
				border-radius: 5px;
			}
		}
	}

	.u {
		justify-content: center;
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;

		:global {
			.icon {
				&.act,
				&:hover {
					color: #fff;
					background: var(--blue);
					border-radius: 5px;
				}
			}
		}
	}

	s {
		flex: 1;
	}

	.icon {
		margin: 20px 0;
		color: #7c8ea2;
		font-weight: 200;
		display: block;
		text-align: center;
		width: 40px;
		line-height: 40px;
		font-size: 20px;
		cursor: pointer;
		transition: 0.3s;
	}

	.m {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		background: var(--bg7);
	}

	.o {
		width: 24px;
		height: 24px;
		background: url('$lib/components/img/fav.png') center no-repeat;
		background-size: contain;
		margin: 36px auto 0;
	}

	i {
		display: block;
	}

	@include s() {
		.o {
			background-color: rgba(60, 90, 140, 0.4);
			background-size: 50%;
			width: 45px;
			height: 100%;
			margin: 0;
		}
		.m,
		.u {
			flex-direction: row;
		}
		.v {
			height: 100%;
			width: 40px;
			padding: 0;
			display: flex;
			align-items: center;
		}
		.u {
			flex: 1;
			s {
				display: none;
			}
			:global {
				.icon {
					flex: 1;
					margin: 0;
					display: flex;
					justify-content: center;
					align-items: center;
					height: 100%;
					&.act,
					&:hover {
						background: rgba(90, 110, 180, 0.2);
						color: #fff;
						border-radius: 0;
					}
				}
			}
		}
	}
</style>
