<script lang="ts">
	import { act } from '$lib/use';
	import { slidLeft } from '$lib/transition';

	interface Props {
		exact?: boolean;
		href: any;
		children?: import('svelte').Snippet;
	}

	let { exact = true, href, children }: Props = $props();
</script>

<a class="k" transition:slidLeft use:act={exact} {href}>
	{@render children?.()}
</a>

<style lang="scss">
  @use '../../lib/break' as *;

  .k {
    color: #b9c6d5;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 20px;

    &:hover {
      color: #fff;
    }

    @include s() {
      margin: 0;
      width: 25%;
    }
  }

  :global .k {
    &.act {
      color: rgba(255, 255, 255, 0.8);
    }
  }
</style>
