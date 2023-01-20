<script>
    import {act} from '$lib/use';
    import {slide} from "svelte/transition";
    export let exact = true
    export let href
</script>

<a class="k"
   transition:slide|local
   use:act={exact}
   href={href}>
    <slot/>
</a>

<style lang="scss">

  .k {
    color: #485c72;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 20px 0;
    &:hover {
      color: #fff;
    }
  }
  :global .k{
    &.act {
      color: #6fa1da;
    }
  }
</style>