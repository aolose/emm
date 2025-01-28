<script>
	import Editor from '$lib/components/editor.svelte';
	import FileWin from '$lib/components/fileManager.svelte';
	import Viewer from '$lib/components/about.svelte';
	import { req } from '$lib/req';
	import { method } from '$lib/enum';
	import { confirm } from '$lib/store';
	import { getErr } from '$lib/utils';
	import { onMount } from 'svelte';

	let value = '';
	let view = 0;

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
	<div class="b">
		<h1>About</h1>
		<button on:click={save}>save</button>
	</div>
	<div class="f">
		<div class="a">
			<Editor bind:value toolbar={[]} />
		</div>
		<div class="d">
			<Viewer close={() => (view = 1)} {value} preview={true} />
		</div>
	</div>
</div>
<FileWin />

<style lang="scss">
  .c {
    display: flex;
    flex-direction: column;
    background: var(--bg2);
    height: 100%;
  }

  .f {
    display: flex;
    max-width: 1200px;
    flex: 1;
  }

  .d {
    flex: 1;
  }

  .a {
    flex: 1;

    :global {
      .editor-toolbar,
      .CodeMirror-scroll {
        padding: 10px 20px;
      }
    }
  }

  .b {
    height: 60px;
    border-bottom: 1px solid rgba(200, 200, 200, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
  }

  h1 {
    font-weight: 400;
    font-size: 18px;
    color: #6d7f94;
  }
</style>
