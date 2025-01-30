<script>
	import Link from './link.svelte';
	import { expand } from '$lib/store';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let type = $state();
	onMount(() =>
		page.subscribe((pg) => {
			const p = pg.url.pathname;
			if (p === '/') type = 1;
			else if (p.startsWith('/post/')) type = 0;
			else type = 2;
		})
	);
</script>

<div class="e" onclick={() => expand.update((a) => 1 - a)} class:act={$expand}>
	<i class="e0"></i>
	<i class="e1"></i>
	<i class="e2"></i>
</div>
<nav class:act={$expand} class:n={type === 1} class:m={type === 2}>
	<div class="a">
		{#if $expand}
			<Link href="/">Home</Link>
			<Link href="/posts" exact={false}>Posts</Link>
			<Link href="/tags" exact={false}>Tags</Link>
			<Link href="/about" exact={false}>About</Link>
		{/if}
	</div>
	<div class="a"></div>
</nav>

<style lang="scss">
  @use '../../lib/break' as *;

  nav {
    display: flex;
    transition: 0.3s ease-in-out;
    opacity: 0;
    pointer-events: none;
    align-items: center;
    position: fixed;
    padding: 0 15px 0 60px;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(180deg, rgba(13, 18, 27, 0.7), transparent);
    @include s() {
      opacity: 1;
      padding-left: 50px;
    }

    &.m {

    }

    &.n {
      background: none!important;
    }

    span {
      color: inherit;
      font-size: 26px;
    }
  }

  .a {
    flex-grow: 1;
    display: flex;
    align-items: center;
    height: 60px;
    @include s() {
      margin-right: 40px;
      & + .a {
        display: none;
      }
    }
  }

  .e {
    z-index: 5;
    cursor: pointer;
    position: fixed;
    left: 15px;
    top: 11px;
    transform: translate3d(0, 0, 0);
    height: 36px;
    width: 36px;
    color: #fff;

    i {
      transition: 0.3s ease-in-out;
      color: inherit;
      left: 9px;
      position: absolute;
      display: block;
      width: 50%;
      height: 1px;
      background: currentColor;
      transform: translate3d(0, 0, 0);
    }

    .e0 {
      top: 12px;
    }

    .e1 {
      top: 18px;
    }

    .e2 {
      top: 24px;
    }
  }

  nav.act {
    opacity: 1;
    pointer-events: auto;
		@include s(){
      background: linear-gradient(180deg, rgba(15, 19, 25, 1), rgba(15, 19, 25, 0.8));
		}
  }

  .act.e {
    opacity: 1;
    color: rgba(250, 250, 250, 1);

    .e0 {
      transform: translate3d(1px, 3px, 0) rotate(34deg) scaleX(0.6);
    }

    .e1 {
      transform: translate3d(0, 0, 0) scale(0);
    }

    .e2 {
      transform: translate3d(1px, -3px, 0) rotate(-34deg) scaleX(0.6);
    }
  }
</style>
