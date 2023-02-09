<script>
  import { page } from '$app/stores';
  import Nav from '$lib/components/nav.svelte'
  const error = $page.error
  const status = $page.status
  let b = ''
</script>

<div class="b" style={b}>
  <div class="nv ">
    <Nav/>
  </div>
  <div class="g">
    <i/>
    <h1>Oops!</h1>
    <h3>error {error.status||status}</h3>
    <p>{error.message}</p>
  </div>
</div>
<style lang="scss">
  .nv {
    right: 0;
    left: 0;
    top: 0;
    z-index: 99;
    position: fixed;
  }
  h1{
    line-height: 2;
    font-size: 30px;
    font-weight: 200;
    color: #3f5f7e;
  }
  h3{
    font-weight: 200;
    color: #fff;
    font-size: 16px;
  }
  p{
    text-align: center;
    padding: 20px;
    max-width: 50%;
    min-width: 300px;
    font-size: 20px;
    color: #424b62;
  }
  i{
    background: url("$lib/components/img/fav.png") center no-repeat;
    width: 100px;
    height: 100px;
    display: block;
    background-size: cover;
  }
  .b{
    padding-bottom: 60px;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
  }

  .g {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
</style>