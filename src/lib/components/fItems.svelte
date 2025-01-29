<script lang="ts">
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import FileIcon from './fileIcon.svelte';
	import { getExt } from '$lib/utils';
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	let m = $state(null);
	let sh = $state(0);
	let x = 15,
		y = 15;
	let pos = tweened(
		{ x: 15, y: 15 },
		{
			duration: 300,
			easing: cubicOut
		}
	);
	const changePosition = async () => {
		const { offsetLeft, offsetTop } = m;
		sh = 1;
		if (offsetLeft === x && offsetTop === y) return;
		y = offsetTop;
		x = offsetLeft;
		await pos.update(() => ({ x, y }));
		// },100))
		// timers.push(setTimeout(() => {
		//
		//     left = offsetLeft
		//     sh = 1
		//     timers.push(setTimeout(() => top = offsetTop, 300))
		// }, d))
	};
	onMount(() => {
		changePosition();
		return trigger.subscribe(changePosition);
	});

	interface Props {
		trigger: any;
		file?: any;
		act?: boolean;
	}

	let {
		trigger,
		file = $bindable({
			id: 0,
			name: '',
			type: '',
			size: 0
		}),
		act = false
	}: Props = $props();
	let pic = $state('');
	if (file.type.startsWith('image/')) {
		pic = `/res/_${file.id}`;
	}
</script>

<div class="m" bind:this={m}></div>
<div
	class="a m"
	style:transform={`translate3d(${$pos.x}px,${$pos.y}px,0)`}
	class:act
	onclick={bubble('click')}
	class:sh
>
	<div class="p" style:background-image={pic ? `url(${pic})` : ''}>
		{#if !pic}
			<div class="f">
				<FileIcon size={60} type={getExt(file)} />
			</div>
		{/if}
	</div>
	<div class="n" title={file.name}>{file.name}</div>
</div>

<style lang="scss">
  .f {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .m {
    pointer-events: none;
    width: 100px;
    height: 124px;
    margin: 5px;
  }

  .a {
    pointer-events: all;
    opacity: 0;
    left: 0;
    top: 0;
    position: absolute;
    transition: 0.3s linear opacity;
    cursor: pointer;
    background: var(--bg0);
    border: 1px solid transparent;

    &:hover {
      border-color: var(--darkgrey);
    }

    &.act {
      border-color: #5679a8;
      box-shadow: rgba(0, 0, 0, 0.2) 1px 2px 4px;
    }
  }

  .sh {
    opacity: 1;
  }

  .p {
    border-radius: inherit;
    padding-top: 100%;
    background: var(--bg2) center;
    background-size: cover;
  }

  .n {
    width: 90%;
    margin: 0 auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    line-height: 2;
    text-align: center;
  }
</style>
