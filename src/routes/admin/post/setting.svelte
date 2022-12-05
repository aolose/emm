<script>
    import CheckBox from '$lib/components/check.svelte'
    import Tags from '$lib/components/tags.svelte'

    let sh = false
</script>
<div class="m">
    <div class="a">
        <div class="h">
            <button class="icon i-ok">
                <span>save</span>
            </button>
            <span>Setting</span>
            <button class="icon i-close"><span>cancel</span></button>
        </div>
        <div class="r">
            <h3>Banner</h3>
            <div class="p icon i-pic"></div>
        </div>
        <div class="r">
            <h3>Slug</h3>
            <input/>
        </div>
        <div class="r">
            <h3>Description</h3>
            <textarea></textarea>
        </div>
        <div class="r">
            <h3>Tags</h3>
            <div class="t">
                <Tags/>
            </div>
        </div>
        <div class="r">
            <h3>Tokens</h3>
        </div>
        <div class="r">
            <CheckBox name="allow comment"/>
            <CheckBox name="need approval"/>
        </div>
    </div>

</div>
<style lang="scss">
  .m {
    z-index: 5;
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    background: rgba(18, 22, 28, 0.76);
    backdrop-filter: blur(1px);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .a {
    background: var(--bg2);
    width: 400px;
    box-shadow: rgba(0, 0, 0, .2) 0px 3px 10px;
  }

  .h {
    span {
      color: #6c7a93;
    }

    padding: 20px;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid var(--bg0);
  }

  button {
    background: none;
    color: #3a596b;
    font-size: 20px;
    display: flex;
    line-height: 1;
    border: none;
    cursor: pointer;
    transition: .3s ease-in-out;
    width: 80px;

    span {
      font-size: 18px;
      position: relative;
      display: block;
      color: inherit !important;
    }

    &:hover {
      color: #fff;
    }
  }

  .i-close {
    justify-content: flex-end;
  }

  .r {
    padding: 20px;
  }

  h3 {
    color: #545e72;
    font-weight: 200;
    font-size: 13px;
    line-height: 2;
  }

  input, textarea, .p, .t {
    display: block;
    margin-top: 20px;
    border: none;
    background: var(--bg1);
    width: 100%;
    outline: none;
    padding: 10px;
    box-shadow: inset 0 0 3px rgba(0, 0, 0, .2);
    border-radius: 3px;
    resize: none;
  }

  .p {
    position: relative;
    cursor: pointer;
    height: 200px;
    color: var(--darkgrey);
    font-size: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>