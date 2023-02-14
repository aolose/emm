<script>
    export let t = ""
</script>

{#each t.split(',').filter(a => !!a) as g}
    <a href={`/tag/${g}`}>{g}</a>
{/each}
<style lang="scss">
  a {
    font-size: 14px;
    color: #68758f;
    border-radius: 3px;
    background: var(--bg4);
    padding: 3px 10px;
    margin-left: 5px;
    &:hover{
      color: #fff;
    }
  }
</style>