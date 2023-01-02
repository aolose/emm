<script>
    export let value = false
</script>
<div class="a" class:c={value} on:click={()=>value=!value}>
    {value ? '✓' : ''}
</div>
<style>
    .a {
        width: 20px;
        height: 20px;
        margin-top: 7px;
        border: 1px solid #304565;
        background: var(--bg1);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 3px;
        transition: .1s ease-in-out;
    }

    .c {
        border-color: transparent;
        background: #1c93ff;
    }
</style>