<script>
	import Date from './timLabel.svelte';
	import { slide } from 'svelte/transition';

	let title = $derived(p.title || p.title_d),
		desc = $derived((p.content_d || p.content || '').substring(0, 128));

	import { editPost } from '$lib/store';

	let { sel = () => 0, p = {} } = $props();
	let isPublish = $derived(p.published);
	let hasDraft = $derived(p.save > (p.modify || p.publish || 0));

	let title_d = $derived(title === p.title_d ? '' : p.title_d);
</script>

<div class="pi" onclick={() => sel(p)} class:act={$editPost.id === p.id} transition:slide>
	<div class="v">
		{#if hasDraft}<span class="vd" title="draft">D</span>{/if}
		{#if isPublish}<span class="vp" title="published">P</span>{/if}
	</div>
	<h3>{title}</h3>
	{#if title_d}
		<h5 transition:slide>{title_d}</h5>
	{/if}
	<p>{desc}</p>
	<div class="i">
		<Date name="create" value={p.createAt} />
		<Date name="update" value={p.modify} />
		<Date name="publish" value={p.publish} />
		<Date name="save" value={p.save} />
	</div>
</div>

<style lang="scss">
	@use '../../break' as *;

	.v {
		position: absolute;
		right: 10%;
		top: 20px;
		display: flex;
		line-height: 1;
		z-index: 3;

		span {
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 10px;
			width: 14px;
			height: 14px;
			margin-right: 5px;
			font-weight: 800;
			padding: 0 !important;
			opacity: 0.5;
		}
	}

	.vd {
		color: var(--blue);
	}

	.vp {
		color: var(--green-h);
	}

	.pi {
		min-width: 400px;
		min-height: 100px;
		max-width: 100%;
		direction: ltr;
		padding: 10px 10% 20px;
		transition: 0.3s ease-in-out;

		&:not(.act):hover {
			background: var(--bg0);
		}

		&.act {
			background: var(--bg2);
		}

		h3 {
			color: #667085;
			line-height: 1.4;
			padding: 3px 80px 16px 0;
			font-weight: 200;
			@include s() {
				padding: 10px 50px 10px 0;
			}
		}

		h5 {
			line-height: 1;
			font-weight: 200;
			padding-bottom: 10px;
			color: #3574a8;
		}

		p {
			opacity: 0.5;
			font-size: 12px;
			line-height: 1.7;
			word-break: break-all;
		}

		.i {
			padding: 10px 0;
			font-size: 12px;
			display: flex;
			justify-content: space-between;
			flex-wrap: wrap;
		}
	}

	@include s() {
		.pi {
			min-width: 100%;
			max-width: 100%;
		}
	}
</style>
