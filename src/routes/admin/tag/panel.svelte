<script>
    import {selectFile} from "$lib/store";
   import {fade} from "svelte/transition";
    let ok
    let cancel
    let show = false
    export const setTag = a => {
        d = {...a}
        show = !!a
        return new Promise(r => {
            ok = () => {
                r(d)
            }
            cancel = () => r()
        }).finally(() => {
            show = false
        })
    }
    let d = {}

    function sel() {
        selectFile(1, '')
    }

</script>
{#if show}
    <div class="b" transition:fade>
        <div class="t">
            <button>save</button>
        </div>
        <div class="r">
            <span>name</span>
            <input bind:value={d.name}/>
        </div>
        <div class="r">
            <span>desc</span>
            <input bind:value={d.desc}/>
        </div>
        <div class="r">
            <span>banner</span>
            <div class="p icon"
                 class:i-pic={d.banner}
                 style:background-image={d.banner?`url(${d.banner})`:''}>
                <button class="icon i-close"></button>
            </div>
        </div>
    </div>
{/if}
<style lang="scss">
  .b {
    flex: 1;
    max-width: 500px;
    height: 100%;
    background: var(--bg1);
    border-right: 1px solid #1c334a;
    padding: 20px;
  }
</style>