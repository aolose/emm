<script>
    import Pg from './pg.svelte'
    import Item from './fItems.svelte'

    const items = n => {
        const i = []
        while (n--) i.push({
            name: 'file-' + n,
            type: ['png', 'img', 'txt'][n % 3],
            size: n * 100,
        })
        return i
    }

    export let select = []
</script>

<div class="a">
    <div class="b">
        <div class="h">
            <div class="t">
                <button class="icon i-add"></button>
                <button class="icon i-del"></button>
                <button class="icon i-no"></button>
                <button class="icon i-ok"></button>
            </div>
            <s></s>
            <div class="s">
                <button class="icon i-search"></button>
                <input/>
            </div>
            <button class="icon i-close"></button>
        </div>
        <div class="ls">
            {#each items(30) as file}
                <Item bind:file/>
            {/each}
        </div>
        <div class="p">
            <Pg/>
        </div>
    </div>
</div>
<style lang="scss">
  s {
    flex: 1;
  }

  .icon {
    background: var(--darkgrey);
    font-size: 18px;
    padding: 10px;
    border: none;
    color: #a2afc5;
    background: none;
    cursor: pointer;
    transition: .2s ease-in-out;
    &:hover{
      color: #fff;
    }
  }

  .i-close {
    margin-left: 10px;
  }

  input {
    width: 0;
    outline: none;
    flex: 1;
    height: inherit;
    border: 0;
    padding: 0;
  }

  .s {
    box-shadow: inset rgba(0,0,0,.1) 0 0 4px;
    border-radius: 4px;
    display: flex;
    width: 300px;
    padding: 0 10px;
    background: var(--bg1);
    align-items: center;

    button {
      padding-left: 0;
    }
  }

  .h {
    align-items: center;
    padding: 10px 10px;
    display: flex;
  }

  .t {
  }

  .a {
    z-index: 5;
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    background: rgba(18, 22, 28, 0.76);
    backdrop-filter: blur(1px);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .b {
    position: relative;
    width: 600px;
    height: 600px;
    background: var(--bg2);
    display: flex;
    flex-direction: column;
  }

  .ls {
    background: var(--bg1);
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    overflow: auto;
    padding: 10px;
  }

  .p {
    display: flex;
    align-items: center;
    height: 50px;
    justify-content: center;
  }
</style>
