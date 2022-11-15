<script>
    import {req} from "$lib/req.ts";
    import {syncShareKey} from "$lib/utils.ts";

    $:o = {
        usr: '',
        pwd: ''
    }

    let rows = [
        ['usr', 'admin user', [/\w{3,}/, 'at least 3 characters are required']],
        ['pwd', 'admin password', [/.{8,}/, 'at least 8 characters are required']]
    ]

    async function submit(e) {
        e.preventDefault()
        await syncShareKey()
        const r = await req('setAdmin',o)
    }
</script>
<h1>
    Config
</h1>
<form on:submit={submit}>
    <div>
        {#each rows as [key, name]}
            <label><span>{name}</span> <input bind:value={o[key]}/></label>
        {/each}
        <input type="submit" value="submit"/>
    </div>
</form>
<style lang="scss">
  form {
    border: 1px solid red;
    display: block;
    margin: 0 auto;
    width: 400px;
    padding: 30px;
  }

  label {
    display: block;
    margin-bottom: 10px;

    span {
      display: block;
    }
  }

  input {
  }
</style>