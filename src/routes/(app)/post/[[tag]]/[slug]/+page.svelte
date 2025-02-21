<script>
	import { run } from 'svelte/legacy';

	import { bgColor, goBack, time, watch } from '$lib/utils';
	import Ctx from '$lib/components/post/ctx.svelte';
	import Viewer from '$lib/components/viewer.svelte';
	import PF from '$lib/components/post/pf.svelte';
	import Tag from '$lib/components/post/tag.svelte';
	import { expand, small } from '$lib/store';
	import { imageViewer } from '$lib/use';
	import Comment from '$lib/components/comment/index.svelte';
	import Head from '$lib/components/Head.svelte';
	import Top from '$lib/components/Top.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { marked } from 'marked';

	let { data } = $props();
	let d = $state(),
		p = $state(),
		o = $state(),
		c = $state();
	let sly = $state('');
	let style = $state(),
		tag = $state();
	let desc = $state(),
		view = $state(),
		prev = $state(),
		next = $state();
	let slug = $state(data.p.slug);
	const wc = watch(slug);
	run(() => {
		d = data.d;
		p = data.p;
		slug = p.slug;
		wc(() => {
			if ($small) o.scrollTo(0, 0);
			else c.scrollTo(0, 0);
		}, slug);
		prev = d._u;
		next = d._n;
		tag = p.tag;
		desc = d.desc;
		view = desc || d._d;
		if (d.createAt)
			style = ` background: linear-gradient(rgba(0,0,0,.7),${bgColor(d.createAt)} 30%);`;
		if (d.banner) {
			sly = `background-image:url(/res/${$small ? '_' + d.banner : d.banner})`;
		} else sly = '';
	});
</script>

<Head title={d.title} description={view}>
	<meta name="og:type" content="article" />
	<meta name="og:title" content={d.title} />
	<meta name="og:description" content={view} />
	<meta name="og:url" content={$page.url.href} />
	<meta name="article:published_time" content={time(d.createAt)} />
	<meta name="article:tag" content={d._tag} />
	{#if d.banner}
		<meta name="og:image" content={`${$page.url.origin}/res/_${d.banner}`} />
	{/if}
	{#if d.banner}
		<meta name="image" content={`${$page.url.origin}/res/_${d.banner}`} />
	{/if}
	<meta name="og:image:width" content="600" />
	<meta name="og:image:height" content="400" />
</Head>

{#snippet h()}
	<div class="h">
		<h1>{d.title}</h1>
		{#if d.desc}<p>
				{@html marked(d.desc)}
			</p>{/if}
		<div class="i">
			<span><span class="icon i-view"></span>{d._r}</span>
			<span>{time(d.createAt)}</span>
		</div>
	</div>
{/snippet}

{#if d}
	<div class={'bk icon i-close'} onclick={() => goBack()}></div>
	<div class="pg" bind:this={o}>
		{#if $small}
			<Top />
		{/if}
		<div class="bg" style={sly}>
			<div class="ft" {style}></div>
			<div class="fc"></div>
			{@render h()}
		</div>
		<div class="co" class:ex={$expand} bind:this={c}>
			{#if !$small}
				<Top />
			{/if}
			<Ctx>
				<div class="v">
					{@render h()}
					<div class="art">
						<div class="ct" use:imageViewer>
							<Viewer ctx={d} />
						</div>
						<div class="ss"></div>
						<PF />
						<div class="tg">
							{#if d._tag}
								<label class="icon i-tags"></label>
								<Tag t={d._tag} />
							{/if}
						</div>
						<div class="sl">
							{#if prev}
								<p>
									<span>newer:</span>
									<button
										onclick={() =>
											goto(`/post/${tag ? `${tag}/` : ''}${prev.slug}`, { replaceState: true })}
										>{prev.title}</button
									>
								</p>
							{:else}<p></p>{/if}
							{#if next}
								<p>
									<span>older:</span>
									<button
										onclick={() =>
											goto(`/post/${tag ? `${tag}/` : ''}${next.slug}`, { replaceState: true })}
										>{next.title}</button
									>
								</p>
							{/if}
						</div>
						<div class="cm">
							{#if d._cm}
								<Comment slug={p.slug} />
							{/if}
						</div>
					</div>
				</div>
			</Ctx>
		</div>
	</div>
{/if}

<style lang="scss">
	@use 'sass:color';

	@use '../../../../../lib/break' as *;

	$bg: var(--bg6);
	$bg2: var(--bg7);

	.sl {
		padding: 20px 0;
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		p {
			display: flex;
			align-items: center;
			padding: 3px 10px;
			color: var(--darkgrey);
			@include s() {
				width: 100%;
				justify-content: space-between;
			}
		}

		span {
			font-size: 14px;
		}

		button {
			color: var(--darkgrey-h);
			margin-left: 10px;
			background: none;
			padding: 0;
			&:hover {
				color: #b1bbc5;
				text-decoration: underline;
			}

			@include s() {
				color: #758caf !important;
			}
		}
	}

	.i-tags {
		color: #2b4d77;
		font-size: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 5px;
	}

	.tg {
		padding: 0 20px;
		display: flex;
		flex-wrap: wrap;
	}

	.ss {
		flex: 1;
	}

	.art {
		display: flex;
		flex-direction: column;
		min-height: 500px;
		border-radius: 4px;
		overflow: hidden;
		background: $bg;
		padding: 60px 80px;
		box-shadow: rgba(0, 0, 0, 0.2) 0 10px 30px -10px;
		@include s() {
			padding: 20px 32px;
			margin: 0;
			min-height: 67vh;
		}
	}

	.ct {
		& > img {
			margin: 0 auto 30px;
			display: block;
		}

		:global {
			a {
				color: #1c93ff;
			}

			.md {
				color: #333;
				font-size: 14px;
				line-height: 2;
				margin: 10px 0 20px;

				pre,
				code {
					border-radius: 3px;
					word-break: break-word;
					background: color.adjust(rgb(37, 40, 55), $alpha: -0.95);
					color: #1a2638;
				}

				pre {
					code {
						background: none;
					}
				}

				& > p {
					margin-bottom: 10px;

					&:first-child:first-letter {
						font-size: 30px;
						@include s() {
							font-size: 20px;
						}
					}
				}
			}
		}
	}

	.co {
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		position: absolute;
		overflow: auto;
		transition: 0.3s ease-in-out;
		@include s() {
			overflow: visible;
			bottom: inherit;
			position: relative;
			&:global {
				.ctx {
					padding: 0 !important;
				}
			}
		}
	}

	.h {
		padding: 30px;
		color: #f4f6f8;
		min-height: 300px;
		opacity: 0.8;
		display: none;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin: 30px auto 0;
		text-align: center;
		:global {
      * {
        color: rgba(244, 246, 248, 0.9);
        text-shadow: rgba(0, 0, 0, 0.2) 1px 1px 3px;
      }
		}

		p {
			text-align: center;
			line-height: 2;
			margin: 10px 0 30px;
			font-size: 14px;
			max-width: 90%;
		}
	}

	.i {
		width: 100%;
		display: flex;
		justify-content: center;

		span {
			padding: 0 3px;
			width: auto;
			font-size: 12px;
			color: #ddd;
		}

		& > span {
			margin: 0 10px;
		}
	}

	h1 {
		color: inherit;
		margin: 14px 0 20px;
		font-weight: 100;
		text-align: center;
		font-size: 48px;
		@include s() {
			max-height: 90%;
			font-size: 32px;
		}
	}

	.bk {
		position: fixed;
		font-size: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 36px;
		width: 36px;
		opacity: 0.8;
		cursor: pointer;
		color: #fff;
		top: 12px;
		right: 12px;
		z-index: 100;

		&:hover {
			opacity: 1;
		}
	}

	.bg {
		z-index: 0;
		pointer-events: none;
		display: block;
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 90%;
		max-height: 100%;
		min-height: 400px;
		background: url('$lib/components/img/1.jpg') center no-repeat;
		background-size: cover;
		@include s() {
			pointer-events: auto;
			padding: 20px 1px;
			position: relative;
			border-bottom: none;
			height: auto;
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 300px;
			.h {
				display: flex;
			}
		}
	}

	.ft,
	.fc {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
	}

	.ft {
		opacity: 0.5;
	}

	.pg {
		background: $bg2;
		height: 100%;
		overflow: auto;
		@include s() {
			scrollbar-width: auto;
			min-height: 100%;
			background: var(--bg6);
		}
	}

	.fc {
		background: linear-gradient(0, $bg2, transparent);
		@include s() {
			background: linear-gradient(0, $bg, transparent);
		}
	}

	@supports (mix-blend-mode: multiply) {
		.ft {
			mix-blend-mode: multiply;
			backdrop-filter: grayscale(0.5);
		}
	}

	.v {
		max-width: 100%;
		width: 800px;
		margin: 0 auto;
		padding-bottom: 50px;
		.h {
			display: flex;
		}
		@include s() {
			.h {
				display: none;
			}
			padding-bottom: 0;
		}
	}
</style>
