<script>
	import { confirm } from '$lib/store';
	import { getErr } from '$lib/utils';

	export let d = {};
	export let sel = false;
	export let ck;
	export let del;

	function de(id) {
		return () =>
			confirm('sure to delete the tag?').then((a) => {
				if (a) del(id);
			});
	}
</script>

<div class="a" class:s={sel} on:click={ck}>
	{#if d.banner}
		<div class="b" style:background-image={`url(/res/_${d.banner})`} />
	{/if}
	<div class="t">
		<h4>{d.name}</h4>
		<button on:click|stopPropagation={de(d.id)} class="icon i-del" />
	</div>
	{#if d.desc}<p>{d.desc}</p>{/if}
</div>

<style lang="scss">
	@use '../../../lib/break' as *;
	.t {
		display: flex;
	}

	.t,
	p {
		text-shadow: rgba(0, 0, 0, 0.5) 0 0 3px;
	}

	button {
		cursor: pointer;
		opacity: 0.5;
		width: 20px;
		top: 10px;
		right: 10px;
		height: 20px;
		align-items: center;
		display: flex;
		justify-content: center;

		&:hover {
			opacity: 1;
		}
	}

	h4 {
		flex: 1;
	}

	.a {
		cursor: pointer;
		transition: 0.2s ease-in-out;
		border: 1px solid transparent;
		width: 46%;
		min-width: 200px;
		min-height: 50px;
		margin: 10px;
		background: var(--bg2);
		&:hover {
			border-color: #28649a;
		}

		@include s() {
			margin: 5px;
			min-width: 0;
		}
	}

	.s {
		background: var(--bg0);
		border-color: rgb(39, 64, 85);

		.b {
			filter: grayscale(0);
			opacity: 0.3;
		}
	}

	h4 {
		font-weight: 400;
		padding: 10px 20px;
	}

	p {
		color: #8e9bb2;
		padding: 10px 20px;
		white-space: normal;
		word-break: break-all;
	}

	.b {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		pointer-events: none;
		opacity: 0.1;
		background: center;
		background-size: cover;
		filter: grayscale(0.5);
	}
</style>
