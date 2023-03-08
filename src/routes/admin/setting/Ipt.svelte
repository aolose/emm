<script>
    export let label;
    export let value;
    export let placeholder;
    export let box;
    export let password
</script>
<div class="r">
    <span>{label}</span>
    {#if box}
        <textarea bind:value={value} placeholder={placeholder}></textarea>
    {:else if password}
        <input type="password" bind:value={value} placeholder={placeholder}/>
    {:else }
        <input bind:value={value} placeholder={placeholder}/>
    {/if}
</div>
<style lang="scss">
  .r {
    font-size: 14px;
    margin: 10px;
    display: flex;
    padding: 10px 20px;
  }

  span {
    flex-shrink: 0;
    padding-top: 6px;
    width: 88px;
  }

  input, textarea {
    padding: 5px 10px;
    min-height: 34px;
    resize: none;
    font-size: 13px;
    line-height: 1.4;
    width: 0;
    flex: 1;
  }

  textarea {
    height: 100px;
  }
</style>