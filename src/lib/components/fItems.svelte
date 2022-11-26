<script>
    export let file = {
        name: ''
    }
</script>
<div class="a">
    <div class="p"></div>
    <div class="n">{file.name}</div>
</div>
<style lang="scss">
  .a {
    width: 100px;
    margin: 5px;
    background: var(--bg0);
    border-radius: 5px;
  }

  .p {
    padding-top: 100%;
    background: var(--bg2);
  }

  .n {
    font-size: 12px;
    line-height: 2;
    text-align: center;
  }
</style>