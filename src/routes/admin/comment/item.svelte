<script>
  import Ava from "$lib/components/post/ava.svelte";
  import { getColor, time } from "$lib/utils";
  export let d = {};
  const color =`--c:${getColor(d.name,.7)};--c1:${getColor(d.name)}`
</script>
<div class="a">
  <div class="v" style={color}>
    <div class="b">
      <Ava idx={d.av} size="30" />
    </div>
    <span>{d.name}</span>
  </div>
  <div class="d">
    <div>@{d.reply}</div>
    <p class="c">
      {d.content}
      <s></s>
    </p>
    <div class="t">
      <a target="_blank" href={d._post?.slug}>
        {d._post?.title}
      </a>
      <div class="i">
        <span>{d.status}</span>
        <span>{d.ip}</span>
        <span>{time(d.time)}</span>
      </div>
    </div>
  </div>
</div>
<style lang="scss">
  .i{
    flex: 1;
    display: flex;
    justify-content: flex-end;
    span{
      margin-left: 10px;
    }
  }
  a {
    color: inherit;
    text-decoration: underline;
  }

  .d {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .c {
    padding-bottom: 20px;
    word-break: break-all;
    max-height: 100px;
    overflow: hidden;
    flex-grow: 1;
    color: #3b4557;
    s{
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      pointer-events: none;
      transition: .1s linear;
      background: linear-gradient(0deg,var(--bg) 3px,transparent 50%);
    }
  }

  .t {
    font-size: 12px;
    color: #637288;
    display: flex;
    justify-content: space-between;
  }

  .a {
    --bg:var(--bg1);
    transition: .1s linear;
    box-shadow: rgba(0,0,0,.1) 0 3px 20px -10px;
    border-radius: 4px;
    display: flex;
    margin: 10px;
    background: var(--bg);
    padding: 10px;
    cursor: pointer;
    border: 1px solid transparent;
    &.act{
      --bg:var(--bg3);
    }
    &:hover{
      --bg:var(--bg3);
      border-color: #103657;
    }
  }

  .b {
    border-radius: 50%;
    background: var(--c);
    overflow: hidden;
    padding: 10px;
  }

  .v {
    padding-top: 10px;
    width: 80px;
    flex-grow: 0;
    display: flex;
    justify-content: flex-start;
    flex-direction: column;
    align-items: center;

    span {
      color: var(--c1);
      margin-top: 10px;
      width: 100%;
      text-align: center;
    }
  }
</style>