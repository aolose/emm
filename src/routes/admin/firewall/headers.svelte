<script>
    import {hds2Str, str2Hds} from "$lib/utils";

    export let value
    let fields = []

    function ck(i) {
        return () => {
            if (i) {
                fields.splice(i, 1)
                fields = [...fields]
            } else {
                fields = [...fields, ['', '']]
            }
        }
    }

    $:{
        if (!fields.length) {
            if (value) fields = str2Hds(value)
            else fields = [['', '']]
        }
        fields.forEach((a) => {
            a[0] = a[0].replace(/[^0-9a-z_-]/ig, '')
            a[1] = a[1].replace(/\n/g, '')
        })
        value = hds2Str(fields)
    }
</script>
<div class="a">
    {#each fields as [k, v],index}
        <div class="b">
            <input class="s" bind:value={fields[index][0]} placeholder="name"/>
            <div class="c">
                <p>{fields[index][1] || ''}</p>
                <textarea bind:value={fields[index][1]} placeholder="value"></textarea>
            </div>
            {#if index && fields[index][0] || !index && !fields.find(a => !a[0])}
                <button
                        class:i-no={index}
                        class:i-add={!index}
                        on:click={ck(index)}
                        class="icon"></button>
            {/if}
        </div>
    {/each}
</div>
<style lang="scss">
  input {
    font-size: 13px;
    width: 120px;
    border-width: 0;
    border-right-width: 1px;
  }

  button {
    padding: 0 5px;
    border-left: 1px solid #304565;
  }

  .c {
    flex-grow: 1;
  }

  textarea {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    resize: none;
    width: 100%;
    overflow: hidden;
  }

  p {
    opacity: 0;
    pointer-events: none;
  }

  p, textarea {
    line-height: 30px;
    display: flex;
    height: 100%;
    border: none;
    margin: 0;
    word-break: break-all;
    white-space: normal;
    padding: 0 10px;
    font-size: 13px;
  }

  .b {
    width: 100%;
    display: flex;

    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }

    & + .b {
      border-top: inherit;
    }
  }

  .a {
    resize: none;
    border: 1px solid #304565;
    background: var(--bg1);
    flex-grow: 1;
    box-shadow: inset var(--bg0) 0 0 5px;
  }
</style>
