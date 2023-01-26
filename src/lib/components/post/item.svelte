<script>
    import {getColor,getPain} from "$lib/utils";

    export let p = {}
    const {banner, slug, title, desc, content, createAt} = p
    const sty = banner ? `background-image:url(/res/${banner})` : '';
    const tm = new Date(createAt)
    const y = tm.getFullYear()
    const m = tm.getMonth() + 1
    const d = tm.getDate()
    const showY = new Date().getFullYear() !== y
    let ds
    $:{
        ds = (desc||getPain(content)).substring(0,140)
    }
</script>

<div class="s p" style={`background-color:${getColor(createAt/3600)}`}>
    <div class="x" style={sty}></div>
    <div class="t">
        {m}/{d}
        {#if showY} {y}{/if}
    </div>
    <a class="f" href={`/post/${slug}`}>
        <div class="c" class:ex={!banner}>
            <h3>{title}</h3>
        </div>
        <div class="ss"></div>
        <p>{ds}...</p>
    </a>
    <div class="ms"><a href={`/post/${slug}`}>Read</a></div>
</div>

<style lang="scss">
  @import "../../break";

  .ms {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 10;
    background: linear-gradient(rgba(0, 0, 0, .0),  rgba(6, 9 ,25, .7));
    border-radius: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: .3s ease-in-out;
    transform: translate3d(0, 100%, 0);

    a {
      display: block;
      opacity: .8;
      cursor: pointer;
      background: #fff;
      padding: 5px 30px;
      border-radius: 3px;

      &:hover {
        opacity: 1;
      }
    }
  }

  .x {
    transition: 2s ease-in-out;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    border-radius: 3px;
    background: url("../img/1.jpg") center no-repeat;
    background-size: cover;
    filter: grayscale(.5) blur(3px);
    opacity: .3;
  }

  .p {
    overflow: hidden;
    border-radius: 3px;
    width: 300px;
    height: 240px;
    transition: .3s ease-in-out;
    z-index: 20;
    position: relative;
    padding: 20px;
    margin: 10px;
    @include s() {
      width: 100%;
    }

    &:hover {
      .x {
        transform: scale(1.05);
        filter: grayscale(.1) blur(1px);
      }

      .f {
        opacity: .5;
        @include s() {
          opacity: 1;
        }
      }

      .ms {
        @include s() {
          display: none;
        }
        transform: translate3d(0, 0, 0);
      }
    }
  }


  h3 {
    font-size: 24px;
    text-shadow: rgba(0, 0, 0, 0.2) 1px 1px 3px;
    color: #fff;
    font-weight: 100;
  }

  .ss {
    flex: 1;
  }

  p {
    margin-bottom: 10px;
    display: flex;
    overflow: hidden;
    word-break: break-all;
    white-space: normal;
    text-overflow: ellipsis;
    line-height: 1.5;
    margin-top: 3px;
    color: #fcfcfc;
    opacity: .5;
    font-weight: 100;
  }

  .t {
    top: 20px;
    right: 10px;
    color: #fff;
    text-shadow: rgba(0, 0, 0, 0.39) 1px 1px 3px;
    font-size: 12px;
    padding: 0 10px;
    border-radius: 10px 10px 0 0;
    height: 20px;
    position: absolute;
    justify-content: flex-end;
    font-weight: 100;
    display: flex;
    align-items: center;
  }

  .y {
    margin-bottom: 5px;
    font-size: 12px;
    color: #6a889b;
  }

  .f {
    transition: .3s ease-in-out;
    flex-direction: column;
    display: flex;
    text-decoration: none;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: inherit;
    padding: inherit;
    background:  linear-gradient(177deg, rgba(30, 48, 63, 0.2), rgba(6, 9 ,25, .7));
  }

</style>
