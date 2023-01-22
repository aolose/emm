<script>
    export let t = ""
</script>

{#each t.split(' ').filter(a => !!a) as g}
    <a href={`/tag/${g}`}>{g}</a>
{/each}
<style lang="scss">
  a {
    color: #798ea1;
    margin-left: 3px;
  }
</style>