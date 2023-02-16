<script>
    import {getColor, goBack, time} from '$lib/utils'
    import Ctx from '$lib/components/post/ctx.svelte'
    import Viewer from '$lib/components/viewer.svelte'
    import PF from '$lib/components/post/pf.svelte'
    import Tag from '$lib/components/post/tag.svelte';
    import {expand} from "$lib/store";
    import {imageViewer} from '$lib/use'
    import Comment from '$lib/components/comment/index.svelte'

    export let data
    const d = data.d
    const p = data.p
    let sly = ''
    let style
    let user = {}
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
    <meta property='article:tag' content={d._tag}/>
    <meta property='og:image' content={`/res/_${d.banner}`}/>
    <meta property='og:image:width' content='600'/>
    <meta property='og:image:height' content='400'/>
</svelte:head>

{#if d}
    <div class={'bk icon i-close'} on:click={()=>goBack()}></div>
    <div class="pg">
        <div class='bg' style={sly}>
            <div class='ft' style={style}></div>
            <div class="fc"></div>
        </div>
        <div class='co' class:ex={$expand}>
            <Ctx>
                <div class='v'>
                    <div class='h'>
                        <h1>{d.title}</h1>
                        {#if d.desc}<p>{d.desc}</p>{/if}
                        <p>xxxxxx</p>
                        <span>{time(d.createAt)}</span>
                    </div>
                    <div class='art'>
                        <div class='ct' use:imageViewer>
                            <Viewer ctx={d}/>
                        </div>
                        <div class='ss'></div>
                        <PF/>
                        <div class='tg'>
                            {#if d._tag}
                                <label class="icon i-tags"></label>
                                <Tag t={d._tag}/>
                            {/if}
                        </div>
                        <h1>
                        </h1>
                        <div class="cm">
                            <Comment slug={p.slug}/>
                        </div>
                    </div>
                </div>
            </Ctx>
        </div>
    </div>
{/if}
<style lang='scss'>
  @import '../../../../lib/break';

  @keyframes bg {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 100% 100%;
    }
  }

  .i-tags {
    color: #2b4d77;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 5px;
  }

  .tg {
    padding: 0 20px;
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
    background: var(--bg1);
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
    overflow: auto;
    transition: .3s ease-in-out;
    @include s() {
      overflow: visible;
      bottom: inherit;
      position: relative;
      &:global{
        .ctx{
          padding: 0!important;
        }
      }
    }
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
      height: 250px;
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      margin: 0 auto;
    }

    * {
      text-shadow: rgba(0, 0, 0, 0.2) 1px 1px 3px;
    }

    p {
      opacity: .6;
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
      color: #69789b;
      font-style: italic;
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
    position: fixed;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    width: 36px;
    opacity: .8;
    cursor: pointer;
    color: #6fa1da;
    top: 15px;
    right: 15px;
    z-index: 100;

    &:hover {
      opacity: 1;
    }
  }

  .bg {
    z-index: 0;
    pointer-events: none;
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 50%;
    max-height: 100%;
    min-height: 400px;
    //bottom: 0;
    background: url('../../../../lib/components/img/1.jpg') center no-repeat;
    background-size: cover;
    animation: bg 120s linear infinite alternate-reverse;
    @include s() {
      position: relative;
      border-bottom: none;
      min-height: 0;
      height: 300px;
    }
  }

  .ft, .fc {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
  }

  .ft {
    opacity: .5;
  }

  .pg {
    background: var(--bg2);
    height: 100%;
    overflow: auto;
  }
  .fc {
    background: linear-gradient(0, var(--bg2), transparent);
    @include s(){
      background: linear-gradient(0, var(--bg1), transparent);
    }
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
    @include s() {
      margin: 0;
    }
  }
</style>
