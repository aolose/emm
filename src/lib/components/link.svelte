<script>
	import { act } from '$lib/use';
	import { slidLeft } from '$lib/transition';

	export let exact = true;
	export let href;
</script>

<a class="k" transition:slidLeft use:act={exact} {href}>
	<slot />
</a>

<style lang="scss">
  @use '../../lib/break' as *;

  .k {
    color: #485c72;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 20px;

    &:hover {
      color: #509eff;
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
