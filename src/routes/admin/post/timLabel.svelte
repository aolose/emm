<script>
    export let value = 0
    export let name=''
    $:time = +value && new Intl.DateTimeFormat('en-GB', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(+value))

</script>

{#if +value}
    <label>{name}:<span>{time}</span></label>
{/if}

<style lang="scss">
    span{
      padding-left: 5px;
      line-height: 2;
    }
</style>