<script>
	import Editor from '$lib/components/editor.svelte';
	import FileWin from '$lib/components/fileManager.svelte';
	import Viewer from '$lib/components/about.svelte';
	import { req } from '$lib/req';
	import { method } from '$lib/enum';
	import { confirm } from '$lib/store';
	import { getErr } from '$lib/utils';
	import { onMount } from 'svelte';
	import { small } from '$lib/store';

	let value = $state('');
	let view = $state(0);
	let show = $state(0);

	function save() {
		req('about', value)
			.then((a) => {
				confirm('the about page updated!', '', 'ok');
			})
			.catch((e) => confirm(getErr(e), '', 'ok'));
	}

	onMount(async () => {
		value = await req('about', '', { method: method.GET });
	});
</script>

<div class="c">
	<div class="f">
		<div class="a">
			<div class="b">
				<h1>About</h1>
				<button onclick={save}>save</button>
			</div>
			<div class="e">
				<Editor bind:value toolbar={$small?{
		name: 'preview',
		action() {
			show = true
		},
		className: 'icon i-view',
		title: 'preview'
	}:[]} />
			</div>
		</div>
		<div class="d"
				 class:s={show}
				 class:v={$small}>
			<Viewer close={() => (show = 0)} {value} preview={true} />
		</div>
	</div>
</div>
<FileWin />

<style lang="scss">
  @use '../../../lib/break' as *;

  .e {
    position: relative;
    flex: 1;
  }

  .c {
    display: flex;
    width: 100%;
    height: 100%;
    background: var(--bg2);
    overflow: hidden;
  }

  .f {
    background: var(--bg6);
    display: flex;
    max-width: 1200px;
    flex: 1;
  }

  .d {
    overflow: auto;
    flex: 1;
    max-width: 800px;
    @include s() {
      z-index: 10;
      flex: none;
      transition: .3s transform ease-in-out;
      transform: translate3d(100%, 0, 0);
      position: fixed;
      inset: 0;
    }

    &.s {
      transform: translate3d(0, 0, 0);
    }
  }

  .a {
    flex: 1;
    display: flex;
    flex-direction: column;

    :global {
      .editor-toolbar,
      .CodeMirror-scroll {
        padding: 10px 20px;
      }
    }
  }

  .b {
    flex-shrink: 0;
    height: 88px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
  }
</style>
