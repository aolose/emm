<script>
    export let t = ""
</script>

{#each t.split(',').filter(a => !!a) as g}
    <a href={`/tag/${g}`}>{g}</a>
{/each}
<style lang="scss">
  a {
    font-size: 12px;
    color: #68758f;
    border-radius: 3px;
    background: #090f1a;
    padding: 3px 10px;
    margin-left: 5px;
  }
</style>