<script>
    import Card from "./Card.svelte";

    let f
    const up = () => {

    }

    const ex = () => {
        window.open('/backup')
    }
</script>
<Card title="Tools">
    <div class="r">
        <button on:click={ex}>
            backup
            <span class="icon i-down"></span></button>
        <button>
            <input type="file" bind:this={f} on:change={up} accept="application/zip"/>
            restore
            <span class="icon i-upload"></span>
        </button>
    </div>
</Card>
<style lang="scss">
  .r {
    padding: 0 30px;
    display: flex;
    align-items: center;
    justify-content: space-evenly;
  }

  input {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    width: auto;
    border: none;
    appearance: none;
    opacity: 0;
  }

  span {
    padding-left: 3px;
  }

  button {
    display: flex;
    align-items: center;
    border-radius: 4px;
    font-size: 13px;
    padding: 8px 20px 8px 26px;
    background: rgba(50, 90, 170, 0.5);

    &:hover {
      background: rgba(50, 90, 170, 0.8);
    }
  }
</style>