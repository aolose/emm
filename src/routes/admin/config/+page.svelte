<script>
    import {req, saveCache} from '$lib/req.ts';
    import {goto} from '$app/navigation';

    $: o = {
        usr: '',
        pwd: ''
    };

    let rows = [
        ['usr', 'admin user', [/\w{3,}/, 'at least 3 characters are required']],
        ['pwd', 'admin password', [/.{8,}/, 'at least 8 characters are required']]
    ];

    async function submit(e) {
        e.preventDefault();
        const r = await req('setAdmin', o, {encrypt: true});
        saveCache('initialized', r, 1e5);
        await goto('/');
    }
</script>

<div class="a">
    <h1>Config</h1>
    <form on:submit={submit}>
        <div>
            {#each rows as [key, name]}
                <label><span>{name}</span> <input bind:value={o[key]}/></label>
            {/each}
            <input type="submit" value="submit" class:act={o.pwd && o.usr}/>
        </div>
    </form>
</div>

<style lang="scss">
  h1 {
    margin: -50px 0 50px;
    font-weight: 200;
    font-size: 36px;
  }

  .a {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }

  form {
    background: #2e3439;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    margin: 0 auto;
    width: 400px;
    padding: 30px;
    box-shadow: rgba(0, 0, 0, 0.5) 0 3px 20px -5px;
  }

  label {
    width: 300px;
    display: block;
    margin-bottom: 20px;

    span {
      margin-bottom: 10px;
      display: block;
    }
  }

  input {
    width: 100%;
  }

  [type='submit'] {
    border: none;
    margin: 30px auto 10px;
    background: var(--darkgrey);
    color: aliceblue;
    box-shadow: rgba(0, 0, 0, 0.3) 0 1px 6px -4px;
    transition: 0.3s ease-in-out;

    &:hover {
      background: var(--darkgrey-h);
    }
  }

  .act {
    transition: 0.1s ease-in-out;
    cursor: pointer;
    color: #15191c;
    background: var(--green);

    &:hover {
      background: var(--green-h);
    }
  }
</style>
