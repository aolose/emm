<script lang="ts">
	import { run } from 'svelte/legacy';

	import { marked } from 'marked';
	import { delay, watch } from '$lib/utils';
	import { highlight } from '$lib/hjs';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	marked.setOptions({ headerIds: true });
	let patchMod = $state(false);
	let el = $state();
	let mor = $state();
	let { close, preview, value } = $props();
	const fx = (s) =>
		s &&
		s
			.replace(/<(\w+-\w+)( ?(.|\n)*?)\/>/g, '<$1$2></$1>')
			.replace(
				/<(h\d) id="(.+?)">(.+?)<\/\1>/g,
				'<a class=\'head\' href="#$2" id="$2"><$1>$3</$1></a>'
			);
	const md = () => fx(`${marked.parse(value || '')}`);
	let v = $state(md());
	const vw = watch(v);
	const wc = watch('');
	const rd = () => (v = highlight(md()));
	const dRd = delay(rd, 100);
	run(() => {
		wc(() => {
			if (preview) dRd();
			else rd();
		}, value);
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
		}
	});
</script>

<div class="a" class:p={preview} transition:fade|global>
	{#if preview}
		<div class="t">
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

<style lang="scss">
  @import 'highlight.js/styles/github-dark.css';

  .p {
    overflow: auto;
    height: 100%;
    background: var(--bg1);
  }

  .a {
    padding: 20px;
    line-height: 1.8;
    color: var(--darkgrey-h);

    :global {
      ul,
      ol {
        margin: 0 0 10px 20px;
      }

      img {
        margin: 1rem auto;
        border-radius: 1rem;
        max-width: 100%;
        height: auto;
      }

      a {
        color: var(--blue);

        &:hover {
          color: #fff;
        }
      }

      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        color: var(--darkgrey-h);
        font-weight: 400;
      }
    }
  }
</style>
