<script lang="ts">
	import { act } from '$lib/use';
	import Avatar from '$lib/components/avatar.svelte';
</script>

<div class="m">
	<div class="o">
		<i />
		<i />
		<i />
	</div>
	<div class="u">
		<s />
		<a use:act href="/admin" class="icon i-home" />
		<a use:act href="/admin/post" class="icon i-post" />
		<a href="/admin/tag" class="icon i-comment" />
		<a class="icon i-setting" />
		<a class="icon i-system" />
		<s />
		<s />
	</div>
	<div class="v">
		<Avatar />
	</div>
</div>

<style lang="scss">
	.v {
		height: 30px;
		width: 80%;
		margin: 20px auto;
		padding-top: 80%;
		position: relative;
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
				}
			}
		}
	}

	s {
		flex: 1;
	}

	.icon {
		margin: 20px 0;
		color: #999;
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
	}

	.o {
		position: relative;
		cursor: pointer;
		margin: 30px auto 10px;
		width: 60px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;

		&:hover {
			i {
				background: var(--green);
			}
		}

		i {
			transition: 0.2s ease-in-out;
			margin: 2px 0;
			width: 16px;
			height: 1px;
			background: #666;
		}
	}

	i {
		display: block;
	}
</style>
