<script>
  export let label;
  export let value;
  export let placeholder;
  export let box;
</script>
<div class="r">
  <span>{label}</span>
  {#if box}
    <textarea bind:value={value} placeholder={placeholder}></textarea>
  {:else }
    <input bind:value={value} placeholder={placeholder} />
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
    line-height: 34px;
    flex-shrink: 0;
    width: 80px;
  }

  input, textarea {
    resize: none;
    width: 0;
    flex: 1;
  }
</style>