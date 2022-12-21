<script>
    export let name = ''
    export let value = false
</script>
<div class="a" class:act={value} on:click={()=>value=!value}>
    <i>✓</i>
    <span>{name}</span>
</div>
<style lang="scss">
  i {
    font-style: normal;
    background: var(--bg1);
    color: transparent;
    margin-right: 5px;
    width: 18px;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 18px;
    box-shadow: inset 0 0 3px rgba(0, 0, 0, .2);
  }
  span{
    transition: .2s ease-in-out;
    color: #415967;
  }
  .a {
    align-items: center;
    margin: 5px 15px 5px 0;
    display: inline-flex;
    cursor: pointer;
    &:not(.act):hover{
      span{
        color: #728794;
      }
    }
  }

  .act {
    i{
      color: #afd4d7;
    }
    span{
      color: #617c94;
    }
  }
</style>