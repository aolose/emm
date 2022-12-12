<script>
    export let value = 0
    const info = [
        'Config database path',
        'Set an administrator',
        'Config upload directory',
        'Set ipLocation api'
    ]
    const l = [0, [0, 30, 60, 90], [10, 40, 70, 100]]
    $:cp = n => `polygon(0 0,100% 0,100% ${l[n][value]}%, 0 ${l[n][value]}%)`
</script>
<div class="k">
    {#each [0, 1, 2] as n}
        <div class="a"
             class:f={n===1}
             class:e={n===2}
             style:clip-path={n&&cp(n)}
        >
            {#each info as i,index}
                <div class="s"
                     class:d={value>index}
                     class:c={value===index}>
                    {#if index !== 3}<i></i>{/if}
                    <span>{index + 1}</span>
                    <p>{i}</p>
                </div>
            {/each}
        </div>
    {/each}
</div>
<style lang="scss">
  .a {
    padding-left: 50px;
    width: 400px;
    position: relative;
    z-index: 0;
    transition: clip-path 1s linear;
    color: var(--darkgrey);
  }

  .k {
    position: relative;
  }

  .e, .f {
    z-index: 2;
    left: 0;
    top: 0;
    position: absolute;
    color: #fff;
    clip-path: polygon(0 0, 100% 0, 100% 0%, 0 0%);
  }

  .e {
    z-index: 1;
    color: var(--blue);
  }

  span, p, i {
    background: var(--bg0);
    color: var(--darkgrey);
    transition: .3s ease-in-out;
  }

  span {
    height: 50px;
    display: flex;
    width: 50px;
    font-size: 30px;
    align-items: center;
    justify-content: center;
  }

  p {
    font-size: 18px;
    top: 50%;
    transform: translateY(-50%);
    position: absolute;
    left: 50px;
    white-space: nowrap;
  }

  i {
    display: block;
    left: 25px;
    top: 100px;
    height: 100%;
    width: 1px;
    background: currentColor;
    position: absolute;
  }


  .c {
    span {
      font-size: 40px;
    }

    p {
      font-size: 24px;
    }
  }

  .c, .d {
    p, span, i {
      color: currentColor;
    }
  }

  .s {
    padding: 20px 0;
    margin-bottom: 100px;
    position: relative;
    display: flex;

    &:last-child {
      margin: 0;
    }
  }

</style>