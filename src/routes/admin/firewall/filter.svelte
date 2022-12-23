<script>
    import HdsIpt from './headers.svelte'
</script>
<div class="f">
    <button class="clo">
        <i></i>
        <i></i>
    </button>
    <div class="f0">
        <label>
            <span>IP:</span>
            <input/>
        </label>
        <label>
            <span>path:</span>
            <input/>
        </label>
        <label>
            <span>country:</span>
            <input/>
        </label>
        <label>
            <span>mark:</span>
            <input/>
        </label>
        <label>
            <span>header:</span>
            <HdsIpt/>
        </label>
    </div>
    <div class="fn">
        <button>create rule</button>
        <button>search</button>
    </div>
</div>
<style lang="scss">
  .clo {
    position: absolute;
    transition: .2s ease-in-out;
    left: 10px;
    top: 10px;
    width: 50px;
    height: 50px;
    color: #3a537c;

    &:hover {
      color: #00d2ff;

      i {
        transform: rotate(35deg);
        transform-origin: right;
        width: 20px;
        margin-left: 20px;

        & + i {
          transform: rotate(-35deg);
        }
      }
    }

    i {
      transition: inherit;
      transform: rotate(45deg);
      position: absolute;
      top: 0;
      left: 0;
      margin: 24px 10px;
      background: currentColor;
      width: 30px;
      height: 1px;

      & + i {
        transform: rotate(-45deg);
      }
    }
  }
  .fn {
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;

    button {
      border-radius: 20px;
      cursor: pointer;
      color: #354e65;
      border: 1px solid currentColor;
      margin: 0 20px;
      padding: 5px 20px;
      transition: .3s ease-in-out;

      &:hover {
        background: #1c93ff;
        color: #fff;
        border-color: transparent;
      }
    }
  }
  label {
    width: 100%;
    font-size: 15px;
    align-items: flex-start;

    input {
      width: 0;
      resize: none;
      border: 1px solid #304565;
      background: var(--bg1);
      flex: 1;
      box-shadow: inset var(--bg0) 0 0 5px;
    }

    span {
      line-height: 32px;
      color: #8092a9;
      text-align: right;
      padding-right: 10px;
      width: 80px;
    }

    display: flex;
    padding: 10px;
  }
  .f {
    transform: translate3d(100%,0,0);
    transition: .3s ease-in-out;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    padding: 70px 20px 0;
    display: flex;
    flex-direction: column;
  }

</style>