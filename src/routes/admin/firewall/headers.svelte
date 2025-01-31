<script>
	import { run } from 'svelte/legacy';

	import { hds2Str, str2Hds, watch } from '$lib/utils';

	let { value = $bindable() } = $props();
	let fields = $state([['', '']]);
	let vWatch = watch('');
	let fWatch = watch(fields);

	function ck(i) {
		return () => {
			if (i) {
				fields.splice(i, 1);
				fields = [...fields];
			} else {
				fields = [...fields, ['', '']];
			}
		};
	}

	let t = $state();
	run(() => {
		vWatch(() => {
			let v = [];
			if (value) v = str2Hds(value);
			if (!v.length) v = [['', '']];
			fields = v;
		}, value);
		fWatch(() => {
			if (!fields.length) {
				value = '';
			} else {
				fields.forEach((a) => {
					a[0] = a[0].replace(/[^0-9a-z_-]/gi, '');
					a[1] = a[1].replace(/\n/g, '');
				});
				clearTimeout(t);
				t = setTimeout(() => (value = hds2Str(fields)), 30);
			}
		}, fields);
	});
</script>

<div class="a">
	{#each fields as [k, v], index}
		<div class="b">
			<div class="e">
				<input class="s" bind:value={fields[index][0]} placeholder="name" />
				<div class="c">
					<p>{fields[index][1] || ''}</p>
					<textarea bind:value={fields[index][1]} placeholder="value"></textarea>
				</div>
			</div>
			{#if (index && fields[index][0]) || (!index && !fields.find((a) => !a[0]))}
				<button class:i-no={index} class:i-add={!index} onclick={ck(index)} class="icon"></button>
			{/if}
		</div>
	{/each}
</div>

<style lang="scss">
  @use '../../../lib/break.scss' as *;

  .e {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    @include s() {
      flex-direction: column;
    }
  }

  input {
    font-size: 13px;
    width: 100px;
    border-width: 0;
    border-right-width: 1px;
    @include s() {
      width: 100%;
      border-right: none;
      border-bottom-width: 1px;
    }
  }

  button {
    padding: 0 5px;
  }

  .c {
    flex-grow: 1;
    @include s() {
      width: 100%;
      min-height: 32px;
    }
  }

  textarea {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    resize: none;
    width: 100%;
    overflow: hidden;
  }

  p {
    opacity: 0;
    pointer-events: none;
  }

  p,
  textarea {
    line-height: 30px;
    display: flex;
    height: 100%;
    border: none;
    margin: 0;
    word-break: break-all;
    white-space: normal;
    padding: 0 10px;
    font-size: 13px;
  }

  .b {
    width: 100%;
    display: flex;
  }

  .a {
    min-height: 48px;
    resize: none;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;

    input, textarea, p {
      padding: 10px 20px;
      line-height: 1.8;
      min-height: 48px;
      width: 100%;
      height: 100%;
      background: var(--bg1);
    }

    * {
      line-height: 48px;
    }
  }
</style>
