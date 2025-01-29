<script lang="ts">
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

	interface Props {
		ctx?: any;
		close: any;
		preview?: boolean;
	}

	let { ctx = {}, close, preview = false }: Props = $props();
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
      * {
        line-height: 2;
      }

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
        background: rgba(100, 120, 150, 0.1);
        border-left: 2px solid rgba(100, 120, 150, 0.5);
        margin: 1.5em 0;
        padding: 0.5em 10px;
      }

      blockquote:before {
        color: #ccc;
        content: open-quote;
        font-size: 2em;
        line-height: 0.1em;
        margin-right: 0.1em;
        vertical-align: -0.2em;
      }

      blockquote p {
        color: #6f93be;
        display: inline;
      }

      code {
        border-radius: 4px;
        overflow: hidden;
        padding: 0 5px;
        color: #659a62;
        background: rgba(10, 20, 40, 0.4);
      }

      pre {
        & > code {
          border: rgba(0, 0, 0, 0.1) 1px solid;
          max-width: 100%;
          overflow: auto;
          line-height: 1.5;
          font-size: 14px;
          box-shadow: rgba(0, 0, 0, 0.4) 0 2px 8px -5px;
          white-space: pre-wrap;
          background: rgba(7, 8, 10, 0.4);
          padding: 32px 0 3px;
          display: flex;
          word-break: break-all;

          .code {
            padding: 0.1em 10px 0.5em;
          }

          .line {
            flex-shrink: 0;
            background: rgba(0, 0, 0, 0.5);
            border-right: 1px solid rgba(100, 120, 150, 0.2);
            display: flex;
            flex-direction: column;
            user-select: none;
            justify-content: center;
            align-items: center;
            padding: 0.1em 0 0.5em;

            div {
              padding-top: 3px;
              user-select: none;
              color: rgba(100, 120, 150, 0.8);
              justify-content: flex-end;
              align-items: flex-start;
              display: flex;
              font-size: 12px;
              flex: 1;
            }
          }

          &:after {
            content: '';
            border: 2px solid rgba(188, 255, 148, 0.55);
            border-radius: 50%;
            position: absolute;
            top: 12px;
            left: 12px;
          }

          &:before {
            color: var(--darkgrey-h);
            padding: 0 0 0 23px;
            font-size: 12px;
            content: attr(name);
            height: 30px;
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            line-height: 30px;
            background: rgba(76, 116, 173, 0.23);
          }
        }
      }

      p {
        line-height: 2;
        margin-bottom: 20px;
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
        color: cornflowerblue;

        &:visited {
          color: #90ace0;
        }
      }

      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        color: #668cc2;
        font-weight: 400;
        line-height: 2;
        margin: 10px 0;

        &:before {
          content: '#';
          padding-right: 5px;
          opacity: 0.5;
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
