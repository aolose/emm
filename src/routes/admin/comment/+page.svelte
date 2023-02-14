<script>
    import Select from "$lib/components/select.svelte";
    import {cmStatus, method} from "$lib/enum";
    import Item from "./item.svelte";
    import Pg from "$lib/components/pg.svelte";
    import Ck from '$lib/components/check.svelte'
    import {onMount} from "svelte";
    import {req} from "$lib/req";

    let status = -1;
    let read = -1;
    let total = 1;
    let page = 1;
    let allowCm = 0;
    let _al = 0
    const cmRead = [
        [-1, "All"],
        [1, "Read"],
        [0, "UnRead"]
    ];
    const cStatus = [
        [-1, "All"],
        [cmStatus.Pending, "Pending"],
        [cmStatus.Approve, "Approve"],
        [cmStatus.Reject, "Reject"]
    ];

    const ls = [
        {
            content: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            reply: "ssdasds", "av": 0,
            name: "abcd2",
            time: Date.now(),
            ip: '10.0.0.1',
            status: 0,
            _post: {
                slug: 'xxxxx',
                title: 'adsad'
            }
        }
    ];

    function go(n = 1) {
        page = n;
    }

    onMount(() => {
        req('alCm', undefined, {method: method.GET}).then(a => _al = allowCm = +a)
    })
    $:{
        if (_al !== allowCm) {
            _al = allowCm
            req('alCm', _al)
        }
    }
</script>
<div class="x">
    <div class="a">
        <div class="t">
            <h1>Comments</h1>
            <div class="b">
                <div>
                    <span class="icon i-read"></span>
                    <Select bind:value={read} items={cmRead}/>
                </div>
                <div>
                    <span class="icon i-status"></span>
                    <Select bind:value={status} items={cStatus}/>
                </div>
            </div>
            <button class="icon i-refresh"></button>
        </div>
        <div class="ls">
            {#each ls as c }
                <div class="r">
                    <Item d={c}/>
                </div>
            {/each}
        </div>
        <div class="p">
            <div>
                <Ck bind:value={allowCm} name="Allow guest comments"/>
            </div>
            <Pg {page} {total} {go}/>
        </div>
    </div>


</div>
<style lang="scss">
  .x {
    background: var(--bg2);
  }

  .i-refresh {
    padding: 5px;
    margin-left: 20px;
  }

  .ls {
    flex: 1;
  }

  .x {
    height: 100%;
  }

  .a {
    padding-bottom: 20px;
    display: flex;
    flex-direction: column;
    max-width: 600px;
    background: var(--bg1);
    height: 100%;
  }

  h1 {
    font-size: 18px;
    font-weight: 200;
    color: #54647a;
  }

  .t {
    height: 70px;
    padding: 0 25px;
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }

  .b {
    flex: 1;
    align-items: center;
    justify-content: flex-end;
    display: flex;
    flex-wrap: wrap;

    span {
      padding: 0 10px;
    }

    div {
      display: flex;
      height: 40px;
      align-items: center;
      flex-grow: 1;
      max-width: 150px;
    }
  }

  .p {
    border-top: 1px solid rgba(155, 155, 155, .05);
    display: flex;
    justify-content: space-between;
    padding: 10px 20px 0;
  }
</style>