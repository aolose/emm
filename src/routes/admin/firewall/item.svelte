<script>
    import {time} from "$lib/utils";
    import {fade, slide} from "svelte/transition";

    export let data = []
    const [tm, ip, ph, ua, st, ct, mk] = data
    export let sel
    export let isDb=0
    export let ck


    function col(n, s) {
        if (n < 300) return 0 === s
        if (n >= 500) return 3 === s
        if (n >= 400) return 2 === s
        return 1 === s
    }
</script>

<div class="r" class:act={sel.has(tm+ip)} transition:fade on:click={ck(tm+ip)}>
    <div class="r0"><span>{time(tm)}</span></div>
    <div class="r1"><span>{ip}</span></div>
    <div class="r3"><span
            class:c0={col(st,0)}
            class:c1={col(st,1)}
            class:c2={col(st,2)}
            class:c3={col(st,3)}
    >{st}</span></div>
    <div class="r2"><span>{ph}</span></div>
    <div class="r6"><span>{ct}</span></div>
    <div class="r4"><span>{mk}</span></div>
    <div class="r5"><span>{ua}</span></div>
</div>

<style lang="scss">
  .r {
    transition: .3s ease-in-out;
    background: #1e2633;
    flex-wrap: wrap;
    display: flex;
    font-size: 13px;
    border-radius: 5px;
    margin-bottom: 10px;

    span {
      transition: .3s ease-in-out;
      color: #72849b;
    }

    div {
      flex-grow: 1;
      transition: .3s ease-in-out;
      padding: 5px 10px;
      white-space: normal;
      word-break: break-all;
      height: 100%;
      min-height: 30px;
      align-self: center;
    }

    &:not(.act):hover {
      background: #233146;

      .r5 {
        span {
          color: #95a3c9;
        }
      }
    }
  }

  .r0 {
    text-align: center;
    width: 110px;

    span {
      font-size: 12px;
      color: #717d8c;
    }
  }

  .r1 {
    width: 120px;
  }

  .r2 {
    width: 120px;

    span {
      color: #72849b;
    }
  }

  .r3 {
    width: 80px;
  }

  .r4 {
    flex: 1;
  }

  .r6 {
    width: 50px;
  }

  .r5 {
    background: #192125;
    width: 100%;

    span {
      color: #3e505d;
    }
  }

  .r {
    .c0 {
      color: #13ad13
    }

    .c1 {
      color: #b6a963
    }

    .c2 {
      color: #e06914
    }

    .c3 {
      color: #d33232
    }
  }

  .act {
    z-index: 90;
    box-shadow: #14171a 0 2px 5px;
    background: #294272;

    span {
      color: #a8bfe5;
    }

    .r5 {
      background: #487ec2;

      span {
        color: #d4e3f5;
      }
    }
  }
</style>