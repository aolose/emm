<script>
	import { bgColor, goBack, time, getPain, watch } from '$lib/utils';
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

	export let data;
	let d, p, o, c;
	let sly = '';
	let style, tag;
	let desc, prev, next;
	let slug = data.p.slug;
	const wc = watch(slug);
	$: {
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
		desc = d.desc || getPain(d.content).slice(0, 80) + '...';
		if (d.createAt)
			style = ` background: linear-gradient(rgba(0,0,0,.7),${bgColor(d.createAt)} 30%);`;
		if (d.banner) {
			sly = `background-image:url(/res/${d.banner})`;
		} else sly = '';
	}
</script>

<Head title={d.title} description={desc}>
	<meta name="og:type" content="article" />
	<meta name="og:title" content={d.title} />
	<meta name="og:description" content={desc} />
	<meta name="og:url" content={d.slug} />
	<meta name="article:published_time" content={time(d.createAt)} />
	<meta name="article:tag" content={d._tag} />
	<meta name="og:image" content={`/res/_${d.banner}`} />
	<meta name="og:image:width" content="600" />
	<meta name="og:image:height" content="400" />
</Head>

{#if d}
	<div class={'bk icon i-close'} on:click={() => goBack()} />
	<div class="pg" bind:this={o}>
		{#if $small}<Top />{/if}
		<div class="bg" style={sly}>
			<div class="ft" {style} />
			<div class="fc" />
		</div>
		<div class="co" class:ex={$expand} bind:this={c}>
			{#if !$small}<Top />{/if}
			<Ctx>
				<div class="v">
					<div class="h">
						<h1>{d.title}</h1>
						{#if d.desc}<p>{d.desc}</p>{/if}
						<span>{time(d.createAt)}</span>
					</div>
					<div class="art">
						<div class="ct" use:imageViewer>
							<Viewer ctx={d} />
						</div>
						<div class="ss" />
						<PF />
						<div class="tg">
							{#if d._tag}
								<label class="icon i-tags" />
								<Tag t={d._tag} />
							{/if}
						</div>
						<div class="sl">
							{#if prev}<p>
									<span>newer:</span><button
										on:click={() =>
											goto(`/post/${tag ? `${tag}/` : ''}${prev.slug}`, { replaceState: true })}
										>{prev.title}</button
									>
								</p>{:else}<p />{/if}
							{#if next}<p>
									<span>older:</span><button
										on:click={() =>
											goto(`/post/${tag ? `${tag}/` : ''}${next.slug}`, { replaceState: true })}
										>{next.title}</button
									>
								</p>{/if}
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
	@import '../../../../../lib/break';

	$bg: var(--bg6);
	$bg2: var(--bg7);
	@keyframes bg {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 100% 100%;
		}
	}
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
			padding: 20px 40px;
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
					background: transparentize(rgb(37, 40, 55), 0.95);
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
		opacity: 0.8;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin: 30px auto 0;
		text-align: center;
		@include s() {
			height: 250px;
			position: absolute;
			bottom: 100%;
			left: 0;
			right: 0;
			margin: 0 auto;
		}

		* {
			text-shadow: rgba(0, 0, 0, 0.2) 1px 1px 3px;
		}

		p {
			line-height: 2;
			color: #f8f8f8;
			margin: 10px 0;
			font-size: 14px;
			text-align: left;
			max-width: 80%;
		}

		span {
			width: 100%;
			display: block;
			text-align: right;
			font-size: 12px;
			color: #ddd;
			font-style: italic;
		}
	}

	h1 {
		max-width: 70%;
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
		color: #6fa1da;
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
		//bottom: 0;
		background: url('$lib/components/img/1.jpg') center no-repeat;
		background-size: cover;
		animation: bg 360s linear infinite alternate-reverse;
		@include s() {
			position: relative;
			border-bottom: none;
			min-height: 0;
			height: 300px;
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
		@include s() {
			padding-bottom: 0;
		}
	}
</style>
