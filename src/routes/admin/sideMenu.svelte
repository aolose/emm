<div class="m">
    <h1>l<span>o</span>l</h1>
    <div class="o">
        <i></i>
        <i></i>
    </div>
    <div class="u">
        <s></s>
        <a href="" class="icon i-home"></a>
        <a href="post" class="icon i-post"></a>
        <a href="tag" class="icon i-comment"></a>
        <a class="icon i-setting"></a>
        <a class="icon i-system"></a>
        <s></s>
        <s></s>
        <a class="icon i-exit"></a>
    </div>
</div>
<style lang="scss">
  h1{
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    line-height: 3;
    span{
      color: #f11b86;
    }
  }
  .u{
    justify-content: center;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  s{
    flex: 1;
  }
  .icon{
    text-decoration: none;
    margin: 20px 0;
    color: #999;
    font-weight: 200;
    display: block;
    text-align: center;
    width: 40px;
    line-height: 40px;
    font-size: 20px;
    cursor: pointer;
    transition: .3s;
    &:hover{
      color: #fff;
      background: var(--darkblue);
    }
  }
  .m {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
  }

  .o {
    position: relative;
    top: -10px;
    cursor: pointer;
    margin: 0 auto;
    width: 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    &:hover{
      i{
        background: var(--green);
      }
    }

    i {
      transition:  .2s ease-in-out;
      margin: 2px 0;
      width: 16px;
      height: 1px;
      background: #47576e;
    }
  }

  i {
    display: block;
  }
</style>