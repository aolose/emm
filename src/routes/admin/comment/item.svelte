<script>
    import Ava from "$lib/components/post/ava.svelte";
    import {getColor, time} from "$lib/utils";
    import {cmStatus} from "$lib/enum";

    const stu = a => {
        switch (a) {
            case cmStatus.Reject:
                return 'Reject'
            case cmStatus.Approve:
                return 'Approve'
            case cmStatus.Pending:
                return 'Pending'
            default:
                return 'auto'
        }
    }
    export let d = {};
</script>
<div class="a">
   <span class="s"
         class:ap={d.statue===cmStatus.Approve}
         class:re={d.statue===cmStatus.Reject}
         class:pe={d.statue===cmStatus.Pending}
   >
     {stu(d.status)}
   </span>
    <div class="v">
        <div class="b">
            <Ava idx={d._avatar} size="30"/>
        </div>
        <span>{d._name}</span>
    </div>
    <div class="d">
        {#if d._reply}
            <span>@{d._reply}</span>
        {/if}
        <p class="c">
            {d.content}
        </p>
        <div class="t">
            <a target="_blank" href={'/post/'+d._post?.slug}>
                {d._post?.title}
            </a>
            <div class="i">
                <span>{d.ip || '-'}</span>
                <span>create at: {time(d.createAt)}</span>
                <span>update at: {time(d.save)}</span>
            </div>
        </div>
    </div>
</div>
<style lang="scss">
  .i {
    flex: 1;
    display: flex;
    justify-content: flex-end;

    span {
      margin-left: 10px;
    }
  }

  a {
    color: inherit;
    text-decoration: underline;
  }

  .d {
    font-size: 14px;
    flex: 1;
    display: flex;
    flex-direction: column;

    span {
      color: var(--darkgrey-h);
    }

    p {
      line-height: 2;
      color:#ddd;
    }
  }

  .c {
    padding-bottom: 20px;
    word-break: break-all;
    max-height: 100px;
    flex-grow: 1;
    color: #3b4557;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .t {
    font-size: 12px;
    color: #637288;
    display: flex;
    justify-content: space-between;
  }

  .a {
    --bg: var(--bg5);
    transition: .1s linear;
    box-shadow: rgba(0, 0, 0, .1) 0 3px 20px -10px;
    border-radius: 4px;
    display: flex;
    margin: 5px;
    background: var(--bg);
    padding: 10px;
    cursor: pointer;
    border: 1px solid var(--bg5);

    &.act {
      --bg: var(--bg3);
    }

    &:hover {
      --bg: var(--bg2);
    }
  }

  .b {
    border-radius: 50%;
    overflow: hidden;
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
      font-size: 13px;
      margin-top: 10px;
      width: 100%;
      text-align: center;
    }
  }
  .s{
    text-transform: uppercase;
    position: absolute;
    font-size: 12px;
    right: 10px;
    top: 10px;
    color: var(--darkgrey-h);
    background: var(--bg2);
    padding:  0 5px;
  }
</style>