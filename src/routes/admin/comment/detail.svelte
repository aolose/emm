<script>
  import Cm from "$lib/components/comment/cm.svelte";

  export let d = {};
  import Item from "./item.svelte";
</script>
<div class="a">
  <Item detail={1} {d} />
  <Cm admin={1} reply={{
          topic:d.topic||d.id,
           cm:d.id,
           name:d._name
  }}/>
  <div class="b">
    <button class="icon i-ip"></button>
    <button class="icon i-fbi"></button>
    <button class="icon i-ok"></button>
    <button class="icon i-del"></button>
  </div>
</div>
<style lang="scss">
  .a{
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .b{
    position: absolute;
    right: 10px;
    top:10px;
    padding: 10px;
  }
  button{
     padding:  0 2px;
     transition: .1s;
     opacity: .5;
  }
  .act,button:hover{
    opacity: 1;
    &.i-ip{
     color: red;
    }
    &.i-fbi{
      color: orange;
    }
    &.i-ok{
      color: greenyellow;
    }
    &.i-del{
      color: #fff;
    }
  }
</style>