<script>
	import { run } from 'svelte/legacy';

	import { marked } from 'marked';
	import { onMount } from 'svelte';
	import { editPost } from '$lib/store';
	import { fade } from 'svelte/transition';
	import { highlight } from '../hjs';
	import { delay, watch } from '$lib/utils';
	import { regElement } from '$lib/components/customent/reg';
	import File from '$lib/components/post/File.svelte';

	marked.setOptions({ headerIds: true });
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
	run(() => {
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
	run(() => {
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
				text-decoration-color: #6c85ff;
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
					background: #0d1117;
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

					&:before {
						opacity: 0.8;
						content: '';
						height: 34px;
						filter: hue-rotate(100deg);
						position: absolute;
						top: 0;
						left: 12px;
						right: 0;
						background: left center no-repeat rgba(0, 0, 0, 0.3)
							url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1NCIgaGVpZ2h0PSIxNCIgdmlld0JveD0iMCAwIDU0IDE0Ij48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEgMSkiPjxjaXJjbGUgY3g9IjYiIGN5PSI2IiByPSI2IiBmaWxsPSIjRkY1RjU2IiBzdHJva2U9IiNFMDQ0M0UiIHN0cm9rZS13aWR0aD0iLjUiPjwvY2lyY2xlPjxjaXJjbGUgY3g9IjI2IiBjeT0iNiIgcj0iNiIgZmlsbD0iI0ZGQkQyRSIgc3Ryb2tlPSIjREVBMTIzIiBzdHJva2Utd2lkdGg9Ii41Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSI0NiIgY3k9IjYiIHI9IjYiIGZpbGw9IiMyN0M5M0YiIHN0cm9rZT0iIzFBQUIyOSIgc3Ryb2tlLXdpZHRoPSIuNSI+PC9jaXJjbGU+PC9nPjwvc3ZnPg==');
						background-size: 40px;
					}

					&:after {
						color: transparent;
						background: linear-gradient(142deg, rgb(0, 148, 253), rgb(223, 234, 157));
						background-clip: text;
						padding: 0 0 0 56px;
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

			p {
				word-break: break-all;
				text-align: justify;
				line-height: 2.1;
				margin-bottom: 20px;
				color: rgba(195, 209, 227, 0.78);
			}

			img {
				margin: 10px 0;
				max-width: 100%;
				border-radius: 6px;
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

				* {
					text-indent: 0;
				}
			}

			a {
				color: transparent !important;
				background: linear-gradient(142deg, rgb(74, 138, 230), rgb(129, 135, 241));
				background-clip: text;
			}

			& > {
				h1,
				h2,
				h3,
				h4,
				h5,
				h6 {
					color: transparent;
					background: linear-gradient(142deg, rgb(0 150 250), rgb(222 234 255));
					background-clip: text;
					font-weight: 400;
					line-height: 1.5;
					padding: 1rem 0;
          text-align: center;
					*{
            background: linear-gradient(142deg, rgb(0 150 250), rgb(222 234 255)) left center;
						background-size: 100vw 100vh;
            background-clip: text;
					}
				}
			}

			ul,
			ol {
				margin-bottom: 10px;
				list-style-position: inside;
			}

			h1 {
				font-size: 27px;
			}

			h2 {
				font-size: 24px;
			}

			h3 {
				font-size: 20px;
			}

			h4 {
				font-size: 18px;
			}

			h5 {
				font-size: 16px;
			}

			h6 {
				font-size: 15px;
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
