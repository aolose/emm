<script>
	import { marked } from 'marked';
	import { onMount } from 'svelte';
	import { editPost } from '$lib/store';
	import { fade } from 'svelte/transition';
	import { highlight } from '../hjs';
	import { delay, watch } from '$lib/utils';
	import { regElement } from '$lib/components/customent/reg';
	import File from '$lib/components/post/File.svelte';
	import { configureMarked } from '$lib/marked-config';

	configureMarked();
	regElement('x-file', File);
	let el = $state();
	let mor = $state();
	let patchMod = $state(false);
	let { ctx = {}, close, preview = false } = $props();
	let title = $state('');
	let content = $state('');
	const fx = (s) =>
		s &&
		s
			.replace(/<(\w+-\w+)( ?(.|\n)*?)\/>/g, '<$1$2></$1>')
			.replace(
				/<(h\d) id="(.+?)">(.+?)<\/\1>/g,
				'<a class=\'head\' href="#$2" id="$2"><$1>$3</$1></a>'
			);
	$effect(() => {
		if (!preview) {
			title = ctx.title;
			content = ctx.content;
		}
	});
	const md = () => fx(`${marked.parse(content || '')}`);
	let v = $state(md());
	const vw = watch(v);
	const wc = watch('');
	const rd = () => (v = highlight(md()));
	const dRd = delay(rd, 100);
	$effect(() => {
		wc(() => {
			if (preview) dRd();
			else rd();
		}, content);
		vw(() => {
			if (el && preview) {
				if (patchMod && el && mor) {
					try {
						mor(el, `<div class="${el.className}">${v}</div>`);
						return;
					} catch (e) {
						console.error(e);
					}
				}
				el.innerHTML = v;
			}
		}, v);
	});
	onMount(async () => {
		if (preview) {
			const d = await import('morphdom');
			mor = d.default;
			patchMod = true;
			return editPost.subscribe((p) => {
				title = p.title_d;
				content = fx(p.content_d);
			});
		}
	});
</script>

{#if title || content}
	<div class="a" class:p={preview} transition:fade|global>
		{#if preview}
			<div class="t">
				<h1>{title || ''}</h1>
				{#if close}
					<button class="icon i-close" onclick={close}></button>
				{/if}
			</div>
		{/if}
		<div class="c" bind:this={el}>
			{#if !preview}
				{@html v}
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	@use '../../lib/break' as *;
	@import 'highlight.js/styles/github-dark.css';
	@import 'viewerjs/dist/viewer.css';

	.a {
		overflow: auto;
		padding: 20px 0;
		display: flex;
		height: 100%;
		flex-direction: column;

		:global {
			del {
				color: rgba(100, 120, 150, 0.8);
			}

			.head {
				text-decoration: none;
			}

			p,
			span {
				overflow-wrap: break-word;
			}

			blockquote {
				border-radius: 8px;
				background: rgba(37, 43, 57, 0.49);
				margin: 1.5em 0;
				font-size: 14px;
				padding: 20px 24px;
			}

			blockquote p {
				color: #92a9b8;
				display: inline;
			}

			code {
				border-radius: 4px;
				overflow: hidden;
				padding: 0 5px;
				margin: 16px 0;
				color: #659a62;
				background: rgba(10, 20, 40, 0.4);
			}

			pre {
				& > code {
					border-radius: 8px;
					border-right: rgba(0, 0, 0, 0.1) 1px solid;
					max-width: 100%;
					overflow: hidden;
					letter-spacing: 1px;
					font-size: 13px;
					box-shadow: rgba(0, 0, 0, 0.4) 0 2px 8px -5px;
					white-space: pre-wrap;
					background: #060606;
					padding: 32px 0 3px;
					display: flex;
					.code {
						color: #b7c0dc;
						white-space: pre;
						padding: 0 8px;
						overflow: auto;
						@include s() {
							scrollbar-width: none;
						}

						span {
							opacity: 0.8;
							filter: brightness(0.9) hue-rotate(180deg) contrast(2);
						}
					}

					.line {
						flex-shrink: 0;
						background: rgba(0, 0, 0, 0.3);
						display: flex;
						flex-direction: column;
						user-select: none;
						justify-content: center;
						align-items: center;
						padding: 0 0.2em 0.5em;
						div {
							user-select: none;
							color: rgba(50, 67, 94, 0.8);
							justify-content: flex-end;
							align-items: flex-start;
							display: flex;
							font-size: 13px;
							width: 100%;
							padding-right: 4px;
							flex: 1;
							position: relative;
						}
					}

					&:after {
						color: transparent;
						background: linear-gradient(142deg, rgb(0, 148, 253), rgb(223, 234, 157));
						background-clip: text;
						padding: 0 0 0 12px;
						font-size: 13px;
						content: attr(name);
						height: 34px;
						line-height: 34px;
						display: block;
						position: absolute;
						top: 0;
						left: 0;
					}
				}
			}

			p,
			li {
				word-break: break-word;
				overflow-wrap: break-word;
				line-height: 1.75;
				margin-bottom: 26px;
				font-size: 17px;
				color: rgba(210, 222, 240, 0.88);
			}

			img {
				margin: 10px 0;
				max-width: 100%;
				border-radius: 12px;
				border: 2px solid rgba(3, 169, 244, 0.08);
			}

			.hljs-section {
				color: #2196f3;
			}
		}
	}

	.t {
		margin-bottom: 20px;
		display: flex;
		justify-content: space-between;
		@include s() {
			margin: 0;
		}

		button {
			display: none;
			@include s() {
				display: block;
				padding: 5px;
				opacity: 0.5;
				color: #1c93ff;
				font-size: 32px;
				right: -8px;
				align-self: flex-start;
			}
		}
	}

	.p {
		background: var(--bg1);
		overflow: hidden;
		@include s() {
			padding: 0;
		}

		.t {
			padding: 10px 60px;
			@include s() {
				padding: 10px 30px;
			}
		}

		.c {
			line-height: 2;
			padding: 1px 60px 20px;
			flex: 1;
			overflow: auto;
			@include s() {
				padding: 1px 30px 20px;
			}
		}
	}

	h1 {
		font-weight: 200;
		font-size: 40px;
		margin: auto;
		@include s() {
			margin: 0;
		}
	}

	.c {
		:global {
			& > p::first-letter {
				padding-left: 2em;
			}

			& > p * {
				text-indent: 0;
			}

			a {
				color: transparent !important;
				background: linear-gradient(142deg, rgb(100, 160, 240), rgb(100, 160, 240));
				background-clip: text;
			}

			& > {
				h1 {
					color: #fff;
					font-weight: 400;
					line-height: 1.5;
					padding: 1rem 0;
					text-align: center;
				}
				h2,
				h3,
				h4,
				h5,
				h6 {
					color: #fff;
					font-weight: 400;
					line-height: 1.5;
					padding: 0.6rem 0;
					text-align: left;
				}
			}

			ul,
			ol {
				margin-bottom: 10px;
				list-style-position: outside;
				padding-left: 1.5em;
			}

			h1 {
				font-size: 28px;
			}

			h2 {
				font-size: 24px;
				margin-top: 2.5em;
				border-bottom: 1px solid rgba(255, 255, 255, 0.06);
				padding-bottom: 0.5em;
			}

			h3 {
				font-size: 20px;
				margin-top: 2em;
			}

			h4 {
				font-size: 18px;
				margin-top: 1.5em;
			}

			h5 {
				font-size: 16px;
				margin-top: 1.2em;
			}

			h6 {
				font-size: 15px;
				margin-top: 1em;
			}

			thead {
				background: rgba(80, 100, 150, 0.1);

				th {
					color: #acb7cb;
					font-weight: 200;
				}
			}

			td,
			th {
				font-size: 14px;
				padding: 3px 5px;
				border: 1px solid rgba(80, 100, 150, 0.7);
			}

			table {
				margin: 10px 0;
				border-collapse: collapse;
			}

			a {
				text-decoration: underline;
				transition: opacity 0.15s ease;
				&:hover {
					opacity: 0.8;
				}
			}

			pre {
				margin: 10px 0;
			}

			hr {
				margin: 10px 0;
				border-top: 1px solid currentColor;
				color: rgba(255, 255, 255, 0.1);
			}

			li {
				margin-top: 5px;
			}
		}
	}
</style>
