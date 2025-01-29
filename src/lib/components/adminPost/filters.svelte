<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	let { ctx = $bindable({}) } = $props();
	const ff = ['title', 'content'];
	let act = $state(0);
	let a = $state();
	const ft = $state({});
	let t;

	function rml() {
		window.removeEventListener('click', hide);
	}

	function hide(e) {
		rml();
		t = setTimeout(() => {
			if (a && a.contains(e.target)) return;
			act = 0;
		}, 100);
	}

	onMount(() => {
		return () => rml();
	});
	function clear() {
		ff.forEach((f) => (ft[f] = 0));
	}

	function tg(n) {
		return () => {
			ft[n] = ft[n] ? 0 : 1;
		};
	}

	export function show() {
		act = 1 - act;
		clearTimeout(t);
		if (act) {
			rml();
			window.addEventListener('click', hide, true);
		}
	}

	let size = $derived(Object.values(ft).reduce((a, b) => a + b, 0));
	ctx.value = ff.filter((f) => ft[f]);
	ctx.show = show;
</script>

{#if act}
	<div class="a" transition:fade|global bind:this={a}>
		{#each ff as f}
			<div class="r" onclick={tg(f)}>
				<i class:act={ft[f]}></i>
				<span> {f}</span>
			</div>
		{/each}
		<button class:act={size} onclick={clear}>clear</button>
	</div>
{/if}

<style lang="scss">
  button {
    transition: 0.1s ease-in-out;
    cursor: pointer;
    display: block;
    border: none;
    margin-top: 10px;
    width: 100%;
    text-align: center;
    background: none;
    color: #364764;

    &:hover {
      color: var(--blue);
    }

    &.act {
      color: #4d91be;
    }
  }

  .r {
    cursor: pointer;
    display: flex;
    align-items: center;
    margin: 3px auto;
    color: #666;
  }

  i {
    border-radius: 3px;
    margin-right: 10px;
    width: 16px;
    height: 16px;
    display: flex;
    font-style: normal;
    align-items: center;
    justify-content: center;
    background: #11161a;
    font-size: 10px;
    color: transparent;
    transition: 0.2s ease-in-out;

    &:before {
      content: '✓';
    }

    &.act {
      color: #fff;
      background: var(--blue);

      & + span {
        color: #6a818f;
      }
    }
  }

  .a {
    box-shadow: rgba(0, 0, 0, 0.3) 5px 6px 13px;
    top: 110%;
    left: 0;
    position: absolute;
    z-index: 4;
    padding: 10px 20px;
    background: #1e2534;
    border-radius: 4px;
  }
</style>
