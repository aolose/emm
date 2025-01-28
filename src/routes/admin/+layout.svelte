<script>
	import Menu from './sideMenu.svelte';
	import { h, full } from '$lib/store';
	import Head from '$lib/components/Head.svelte';

	export let data;
</script>

<Head title={`${$h.title} - Admin`} />
<div class="a" class:full={$full}>
	<div class="b">
		<Menu />
	</div>
	<div class="c">
		<slot />
	</div>
</div>

<style lang="scss">
  @use '../../lib/break' as *;

  .a {
    height: 100%;
    width: 100%;
    display: flex;
  }

  .b,
  .c {
    height: 100%;
  }

  .b {
    flex-shrink: 0;
    z-index: 1;
    width: 72px;
  }

  .c {
    background: var(--bg1);
    flex: 1;
    @include s() {
      height: 0;
    }
  }

  @include s() {
    .a {
      flex-direction: column;
    }
    .b {
      transition: 0.3s linear;
      width: 100%;
      height: 48px;
      overflow: hidden;
    }
    :global {
      .editor-toolbar {
        transition: 0.3s linear;
        height: 90px;
        overflow: hidden;
      }
    }
    .full {
      .b {
        height: 0;
      }

      :global {
        .editor-toolbar {
          height: 0;
          padding: 0;
        }
      }
    }
  }
</style>
