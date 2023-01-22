<script>
    export let idx = 1
    export let cls = ''
    export let click = null
</script>
<i class={'a a_'+(idx-1) + (cls?' '+cls:'')}
   class:c={!!click}
   on:click={click}></i>
<style lang="scss">
  .c {
    cursor: pointer;
  }

  .a {
    width: 40px;
    height: 40px;
    background-position: center;
    background-repeat: no-repeat;
    background-size: auto 80%;
  }

  :global {
    .a_0 {
      background-image: url("./icon/0.png");
    }

    .a_1 {
      background-image: url("./icon/1.png");
    }

    .a_2 {
      background-image: url("./icon/2.png");
    }

    .a_3 {
      background-image: url("./icon/3.png");
    }

    .a_4 {
      background-image: url("./icon/4.png");
    }

    .a_5 {
      background-image: url("./icon/5.png");
    }

    .a_6 {
      background-image: url("./icon/6.png");
    }

    .a_7 {
      background-image: url("./icon/7.png");
    }

    .a_8 {
      background-image: url("./icon/8.png");
    }

    .a_9 {
      background-image: url("./icon/9.png");
    }

    .a_10 {
      background-image: url("./icon/10.png");
    }

    .a_11 {
      background-image: url("./icon/11.png");
    }
  }
</style>
