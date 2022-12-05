<script>
    import {tick} from "svelte";

    const tags = new Set(['aaa', 'aab', 'aac', 'aad', 'aae', 'aaf', 'bfa', 'bba'])
    let items = new Set(['aaa'])
    let value = ''
    let ipt
    let show = 0
    const rm = v => () => {
        items.delete(v)
        items = new Set(items)
    }
    const keyPress = (e) => {
        const {code} = e
        const s = ipt.selectionStart
        if (code.startsWith('Arrow')) {
            switch (code[5]) {
                case 'R':
                    if (s === value.length)
                        return value = pre
                    break
                case 'U':
                    return idx--
                case 'D':
                    return idx++
            }
        }

        if (code === 'Backquote') {
            e.preventDefault()
            show = 1-show
        }
        if (code === 'Enter') {
            value = value.slice(0, s) + ',' + value.slice(s)
        } else if (code === 'Backspace') {
            if (!s) {
                const siz = [...items][items.size - 1]
                if (siz) {
                    items.delete(siz)
                    items = new Set(items)
                }

            }
        }
    }
    let dp
    let idx = 0
    let selects = []
    $:pre = selects[idx] || value
    $:(async () => {
        selects = [...tags].filter(a => !items.has(a) && value !== a && a.toLowerCase().startsWith(value.toLowerCase()))
        selects.sort((a, b) => a < b ? -1 : 1)
        const lh = selects.length
        idx = lh && idx % lh
        const l = value.length
        let s = 0
        let h = 0
        for (let i = 0; i < l;) {
            const r = /^[ ,;\t\n\r]+/g
            if (r.test(value.substring(i))) {
                if (s < i) {
                    items.add(value.slice(s, i))
                    h = 1
                }
                i += r.lastIndex
                s = i
            } else i++
        }
        value = value.substring(s)
        if (h) {
            items = new Set(items)
            await tick()
            ipt.setSelectionRange(0, 0)
        }
        if (dp) {
            await tick()
            const a = dp.querySelector('.act')
            a?.scrollIntoView({behavior: 'smooth', block: 'center'})
        }
    })()
</script>

<div class="a">
    {#if selects.length && (show || value)}
        <div class="d" bind:this={dp}>
            {#each selects as sec}
                <div class:act={sec===pre} on:click={()=>value=sec}>{sec}</div>
            {/each}
        </div>
    {/if}
    {#each [...items] as item}
        <div class="b"><span>{item}</span>
            <button class="icon i-close" on:click={rm(item)}></button>
        </div>
    {/each}
    <div class="c">
        <span>{value}</span>
        <span>{pre.replace(value, '')}</span>
        <input bind:value={value}
               bind:this={ipt}
               on:blur={()=>show=0}
               on:keydown={keyPress}/>
    </div>
</div>

<style lang="scss">
  span {
    font-size: 13px;
    color: currentColor;
  }

  .a {
    display: flex;
    flex-wrap: wrap;
    min-height: 30px;
    position: relative;
  }

  .d {
    transform: translateY(-15px);
    bottom: 100%;
    padding: 10px 0;
    background: rgba(21, 23, 26, 0.7);
    position: absolute;
    left: -10px;
    right: -10px;
    max-height: 100px;
    overflow: auto;

    div {
      color: #60799f;
      transition: .2s ease-in-out;
      padding: 3px 20px;

      &:hover {
        background: rgba(0, 0, 0, .1);
      }
    }

    .act {
      color: #d0c791;
      background: rgba(0, 0, 0, .2);
    }
  }

  .b {
    background: #212f3b;

    span {
      padding: 5px 10px;
    }
  }

  button {
    padding: 5px;
    border-left: 1px solid #171b2a;

    &:hover {

    }
  ;
  }

  .b, .c {
    display: flex;
    align-items: center;
    margin: 2px 3px;
  }

  .c {
    position: relative;
    flex: 1;
    min-width: 80px;
    line-height: 18px;
    white-space: nowrap;
    margin-left: 10px;

    input, span {
      margin: 0;
      padding: 5px 0;
      background: none;
      border: none;
      position: relative;
      line-height: inherit;
      outline: none;
      font-size: 15px;
    }

    input {
      width: 100%;
      color: #b5c8ea;
      position: absolute;
      left: 0;
      top: 0;
    }

    span {
      margin-left: .5px;
      opacity: 0;
      color: #446188;
    }

    span + span {
      opacity: 1;
    }
  }


  .d {

  }
</style>