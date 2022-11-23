<script>
    export let data
    $: c = {}
    function sel(p) {
        c=p
    }
    function d(a){
       return new Intl.DateTimeFormat('en-GB',{
           year:'2-digit',
           month:'2-digit',
           day:'2-digit',
           hour:'2-digit',
           minute:'2-digit'
       }).format(new Date(a))
    }
</script>
<div class="x">
    <div class="m">
        <div class="a">
            <div class="h o">

            </div>
            <div class="ls">
                {#each data.p as p}
                    <div class="pi"
                         on:click={()=>sel(p)}
                         class:act={c.id===p.id}>
                        <h3>{p.title}</h3>
                        <p>{p.desc}</p>
                        <div>
                            <label>publish:<span>{d(p.publish)}</span></label>
                            <label>update:<span>{d(p.update)}</span></label>
                            <label>save:<span>{d(p.update)}</span></label>
                        </div>
                    </div>
                {/each}
            </div>
            <div class="p o">

            </div>
        </div>
        <div class="b">

        </div>
        <div class="c">

        </div>
    </div>
</div>

<style lang="scss">
  .x {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .o{
    position: relative;
    &:before{
      content: '';
      display: block;
      height: 20px;
      position: absolute;
      left: 0;
      right: 0;
      bottom: 100%;
      background: linear-gradient(transparent ,var(--bg1) 5px);
    }
  }
  .m {
    display: flex;
    height: 100%;
  }

  .a {
    width: 50%;
    max-width: 600px;
    background: var(--bg1);
    display: flex;
    flex-direction: column;
  }

  .b {
    width: 50%;
    max-width: 1000px;
    background: var(--bg2);
  }

  .h {
    height: 200px;
  }

  .ls {
    direction:rtl;
    position: relative;
    flex: 1;
    overflow: auto;
  }

  .p {
    height: 60px;
  }

  .c {
    width: 800px;
  }

  .pi{
    direction:ltr;
    border-left: 0 solid #40464b;
    &:not(.act):hover{
      background: rgba(255,255,255,.03);
    }
    &.act{
       border-left-width: 5px;
      background: var(--bg2);
    }
    transition: .3s ease-in-out;
    h3{
      line-height: 3;
      font-weight: 200;
    }
    padding: 15px 10%;
    p{
      opacity: .5;
    }
    div{
      line-height: 4;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      span{
        padding-left: 5px;
      }
    }
  }
</style>