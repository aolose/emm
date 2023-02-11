<script>
  import Select from "$lib/components/select.svelte";
  import { cmStatus } from "$lib/enum";
  import Item from "./item.svelte";
  import Pg from "$lib/components/pg.svelte";

  let status = -1;
  let read = -1;
  let total = 1;
  let page = 1;
  const cmRead = [
    [-1, "All"],
    [1, "Read"],
    [0, "UnRead"]
  ];
  const cmStatus = [
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
      ip:'10.0.0.1',
      status: 0,
      _post:{
        slug:'xxxxx',
        title:'adsad'
      }
    }
  ];

  function go(n = 1) {
    page = n;
  }
</script>
<div class="x">
  <div class="a">
    <div class="t">
      <h1>Comments</h1>
      <div class="b">
        <div>
          <span class="icon i-read"></span>
          <Select bind:value={read} items={cmRead} />
        </div>
        <div>
          <span class="icon i-status"></span>
          <Select bind:value={status} items={cmStatus} />
        </div>
      </div>
      <button class="icon i-refresh"></button>
    </div>
    <div class="ls">
      {#each ls as c }
        <div class="r">
          <Item d={c} />
        </div>
      {/each}
    </div>
    <Pg {page} {total} {go}/>
  </div>


</div>
<style lang="scss">
  .i-refresh {
    padding: 5px;
    margin-left: 20px;
  }

  .ls{
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
    background: var(--bg3);
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
    background: var(--bg2);
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
</style>