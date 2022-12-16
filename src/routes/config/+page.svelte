<script>
    import Step from './step.svelte'
    import {req} from "$lib/req";
    import {slide, fade} from "svelte/transition";

    export let data
    let step = data.d
    const defaultPath = 'blog.db'
    const steps = [
        'Set database path',
        'Add an administrator',
        'Set upload directory',
        'Set ipLocation (optional)'
    ]
    const fx = db => db.replace(/^\s+|\s+$/, '')
    let o = {
        usr: '',
        pwd: '',
        pwd2: ''
    };

    let rows = [
        ['usr', 'Username', [/^[a-z0-9]{2,20}$/i, 'username requires 2-20 letters or numbers'], 'text'],
        ['pwd', 'Password', [/^.{4,30}$/, 'password requires least 4-30 characters'], 'password'],
        ['pwd2', 'Confirm password', [{test: n => n === o.pwd}, 'passwords not match'], 'password']
    ];

    let db = ''
    let err = ''
    let upDir = ''
    let tbDir = ''
    let ipDir = ''
    let ipTk = ''
    $:{
        switch (step) {
            case 0:
                db = fx(db)
                break
            case 1:
                o.usr = fx(o.usr)
                break
            case 2:
                upDir = fx(upDir).replace(/[,;'"]/g, '')
                tbDir = fx(tbDir).replace(/[,;'"]/g, '')
                break;
            case 3:

                break;
        }
    }
    const swi = n => {
        step = n - 0.5
        setTimeout(() => step = n, 1e3)
    }

    let tip = ''
    const ck = n => {
        const v = o[n]
        if (!v) return
        const f = rows.find(a => a[0] === n)
        const t = f[2]
        const tp = `${t[1]}.\n`
        tip = tip.replace(tp, '')
        if (!t[0].test(v)) {
            tip = tip + tp
            return
        }
        return 1;
    }
    const ck2 = () => {
        tip = ''
        if (upDir && upDir === tbDir) tip = 'The Upload directory should be different from the Thumbnail directory.'
    }

    const ck3 = () => {

    }

    async function submit(e) {
        e.preventDefault();
        switch (step) {
            case 0:
                if (!db) db = defaultPath
                err = await req('dbPath', db)
                if (!err) {
                    swi(1)
                }
                break;
            case 1:
                if (ck('usr') && ck('pwd')) {
                    err = await req('setAdmin',
                        {pwd: o.pwd, usr: o.usr},
                        {encrypt: true})
                    if (!err) {
                        swi(2)
                    }
                }
                break;
            case 2:
                if (upDir && tbDir) {
                    err = await req('setUp', [upDir, tbDir].join())
                    if (!err) {
                        swi(3)
                    }
                }
                break;
            case 3:
                break;
        }
    }
</script>

<div class="a">
    <Step value={step} info={steps}/>
    <form on:submit={submit}>
        {#if step === 0}
            <div class="f" class:act={db} transition:fade>
                <h1>{steps[0]}</h1>
                <div class="q">
                    <div class="r">
                        <input placeholder={defaultPath} bind:value={db}/>
                        <i></i>
                    </div>
                    <button>submit</button>
                </div>
            </div>
        {/if}
        {#if step === 1}
            <div class="f" transition:fade class:act={o.usr&&o.pwd&&o.pwd2&&!tip}>
                <h1>{steps[1]}</h1>
                {#each rows as [key, name, , type]}
                    <div class="r" class:act={o[key]}>
                        <input
                                {type}
                                on:blur={()=>ck(key)}
                                on:input={e=>o[key]=e.target.value}
                                value={o[key]}/><i></i>
                        <span>{name}</span>
                    </div>
                {/each}
                {#if tip}
                    <div class="m" transition:slide>
                        {tip}
                    </div>
                {/if}
                <button class="h" on:click={submit}>submit</button>
            </div>
        {/if}
        {#if step === 2}
            <div class="f" transition:fade class:act={tbDir&&tbDir}>
                <h1>{steps[2]}</h1>
                <div class="r" class:act={upDir} on:blur={ck2}>
                    <input bind:value={upDir}/>
                    <i></i>
                    <span>Upload directory</span>
                </div>
                <div class="r" class:act={tbDir}>
                    <input bind:value={tbDir} on:blur={ck2}/>
                    <i></i>
                    <span>Thumbnail directory</span>
                </div>
                {#if tip}
                    <div class="m" transition:slide>
                        {tip}
                    </div>
                {/if}
                <button class="h" on:click={submit}>submit</button>
            </div>
        {/if}
        {#if step === 3}
            <div class="f" transition:fade class:act={ipDir&&ipTk}>
                <h1>{steps[3]}</h1>
                <div class="r l" class:act={ipTk} on:blur={ck3}>
                    <input bind:value={ipTk}/>
                    <i></i>
                    <span>IpLocation Database Token</span>
                    <a href="https://lite.ip2location.com/database-download" target="_blank">where to find?</a>
                </div>
                <div class="r" class:act={ipDir}>
                    <input bind:value={ipDir}/>
                    <i></i>
                    <span>Download directory</span>
                </div>
                {#if tip}
                    <div class="m" transition:slide>
                        {tip}
                    </div>
                {/if}
                <button class="h" on:click={submit}>submit</button>
            </div>
            <button class="k">Skip</button>
        {/if}
        {#if err}
            <div class="e" transition:slide>
                <pre>{err}</pre>
            </div>
        {/if}
    </form>
</div>

<style lang="scss">
  a {
    line-height: 2;
    color: var(--darkgrey);
    margin-left: 10px;

    &:hover {
      color: #6c7a93;
      text-decoration: underline;
    }
  }

  .m {
    opacity: .5;
    width: 400px;
    padding: 10px;
    color: #d39090;
    border-radius: 3px;
    background: #312828;
    white-space: pre-wrap;
  }

  h1 {
    top: 50px;
    right: 50px;
    position: absolute;
    font-weight: 200;
    font-size: 24px;
    text-align: left;
    color: #6c7a93;
  }

  .h {
    margin-top: 50px;
    width: 400px;
  }

  .r {
    margin: 20px auto;
    width: 400px;
    border-bottom: 1px solid var(--darkgrey);
    height: 50px;

    span {
      transition: .3s ease-in-out;
      pointer-events: none;
      position: absolute;
      left: 10px;
      bottom: 50%;
      color: #6c7a93;
      transform: translate3d(0, 50%, 0);
    }

    input {
      line-height: 50px;
      height: 50px;
      font-size: 20px;
      outline: none;

      &:focus + i {
        width: 100%;
        opacity: 1;
      }
    }

    i {
      display: block;
      height: 1px;
      position: absolute;
      right: 50%;
      transform: translateX(50%);
      width: 0;
      background: var(--blue);
      transition: .5s ease-in-out;
      opacity: .4;
    }
  }

  .l {
    margin-bottom: 40px;
  }

  button {
    margin-left: 10px;
    font-size: 20px;
    width: 100px;
    height: 50px;
    border: 1px solid currentColor;
    color: var(--darkgrey);
    transition: .3s ease-in-out;

    &:hover {
      color: var(--darkgrey-h);
      opacity: 1 !important;
    }
  }

  .q {
    display: flex;
    align-items: center;
  }

  .act {
    i {
      width: 100%;
    }

    button {
      opacity: .5;
      color: var(--blue);
    }
  }

  .a {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .f {
    display: flex;
    position: static;
    align-items: center;
    flex-direction: column;
    justify-content: center;
  }

  form {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    background: var(--bg1);
  }

  input {
    width: 100%;
    border: none;
  }

  .e {
    width: 510px;
    padding: 30px 0;
  }

  h3 {
    color: var(--darkgrey-h);
    padding: 0 10px;
    font-weight: 200;
    font-size: 13px;
    margin-bottom: 10px;
  }

  pre {
    padding: 20px;
    max-height: 100px;
    overflow: auto;
    font-size: 13px;
    background: var(--bg0);
  }

  .act span, input:focus ~ span {
    transform: translate3d(0, -70%, 0);
    font-size: 20px;
    color: var(--darkgrey);
  }

  .k {
    border: none;
    color: #6c7a93;
    position: absolute;
    right: 50px;
    bottom: 40px;

    &:hover {
      color: #fff;
      background: var(--blue);
    }
  }
</style>
