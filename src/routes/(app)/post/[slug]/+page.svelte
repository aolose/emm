<script>
    import {getColor, goBack, time} from '$lib/utils'
    import Ctx from '$lib/components/post/ctx.svelte'
    import Viewer from '$lib/components/viewer.svelte'
    import PF from '$lib/components/post/pf.svelte'
    import Tag from '$lib/components/post/tag.svelte';
    // import CmList from '$lib/components/post/cmList.svelte'
    export let data
    const d = data.d
    let sly = ''
    let style
    $:{
        if (d.createAt) style = ` background: linear-gradient(rgba(0,0,0,.7),${getColor(d.createAt / 3600)});`
        if (d.banner) {
            sly = `background-image:url(/res/${d.banner})`
        }
    }
</script>
<svelte:head>
    <title>{d.title}</title>
    <meta property='description' content={d.desc}/>
    <meta property='og:type' content='article'/>
    <meta property='og:title' content={d.title}/>
    <meta property='og:description' content={d.desc}/>
    <meta property='og:url' content={d.slug}/>
    <meta property='article:published_time' content={time(d.createAt)}/>
    <meta property='article:tag' content={d.tags}/>
    <meta property='og:image' content={`/res/_${d.banner}`}/>
    <meta property='og:image:width' content='600'/>
    <meta property='og:image:height' content='400'/>
</svelte:head>

{#if d}
    <div class={'bk icon i-close'} on:click={()=>goBack()}></div>
    <div class='co'>
        <div class='bg' style={sly}>
            <div class='ft' style={style}></div>
        </div>
        <Ctx>
            <div class='v'>
                <div class='h'>
                    <h1>{d.title}</h1>
                    {#if d.desc}<p>{d.desc}</p>{/if}
                    <p>xxxxxx</p>
                    <span>{time(d.createAt)}</span>
                </div>
                <div class='art'>
                    <div class='ct'>
                        <Viewer ctx={d}/>
                    </div>
                    <div class='ss'></div>
                    <PF/>
                    <div class='tg'>
                        {#if d.tags}
                            <label>#</label>
                            <Tag t={d.tags}/>
                        {/if}
                    </div>
                    <!--                    <CmList id={d.aid} act='1'/>-->
                </div>
            </div>
        </Ctx>
    </div>
{/if}

<style lang='scss'>
  @import '../../../../lib/break';
  @keyframes bg {
    0% {
      background-position: 0 100%;
    }
    100% {
      background-position: 100% 0;
    }
  }

  .tg {
    display: flex;
    flex-wrap: wrap;
  }

  .ss {
    flex: 1;
  }

  .art {
    display: flex;
    flex-direction: column;
    min-height: 500px;
    border-radius: 4px;
    overflow: hidden;
    background: var(--bg0);
    padding: var(--artP);
    box-shadow: rgba(0, 0, 0, .2) 0 10px 30px -10px;
    @include s() {
      margin: 0;
    }
  }

  .ct {
    & > img {
      margin: 0 auto 30px;
      display: block;
    }

    :global {
      a {
        color: #1c93ff;
      }

      .md {
        color: #333;
        font-size: 14px;
        line-height: 2;
        margin: 10px 0 20px;

        pre, code {
          border-radius: 3px;
          word-break: break-word;
          background: transparentize(rgb(37, 40, 55), .95);
          color: #1a2638;
        }

        pre {
          code {
            background: none;
          }
        }

        & > p {
          margin-bottom: 10px;

          &:first-child:first-letter {
            font-size: 30px;
            @include s() {
              font-size: 20px;
            }
          }
        }
      }
    }
  }

  .co {
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    position: absolute;
    padding: var(--artC);
    overflow: auto;
  }

  .h {
    padding: 30px;
    color: #f4f6f8;
    opacity: .8;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 30px auto 0;
    text-align: center;
    @include s() {
      margin: 0 auto;
    }

    * {
      text-shadow: rgba(0, 0, 0, 0.15) 1px 1px 1px;
    }

    p {
      opacity: .5;
      color: #f8f8f8;
      margin: 10px 0;
      font-size: 14px;
      text-align: left;
      max-width: 80%;
    }

    span {
      width: 100%;
      display: block;
      text-align: right;
      font-size: 12px;
      color: #eee;
      opacity: .5;
    }
  }

  h1 {
    max-width: 70%;
    color: inherit;
    margin: 14px 0 20px;
    font-weight: 100;
    text-align: center;
    font-size: var(--fs);
  }

  .bk {
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    width: 36px;
    z-index: 10;
    opacity: .8;
    cursor: pointer;
    color: #6fa1da;
    top: 15px;
    right: 15px;
    position: absolute;

    &:hover {
      opacity: 1;
    }
  }
  .bg{
    opacity: .5;
    z-index: 0;
    pointer-events: none;
    display: block;
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: url('../../../../lib/components/img/1.jpg') center no-repeat;
    background-size: cover;
    animation: bg 120s linear infinite alternate-reverse;
  }
  .ft {
    width: 100%;
    height: 100%;
    opacity: .5;
    filter: brightness(.5);
  }

  @supports (mix-blend-mode: multiply) {
    .ft {
      mix-blend-mode: multiply;
      filter: none;
      backdrop-filter: grayscale(.5);
      opacity: .7;
    }
  }

  .v {
    max-width: 100%;
    width: 800px;
    margin: 20px auto 10px;
  }
</style>
