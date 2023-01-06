<script>
    import {selectFile} from "$lib/store";

    export  let d ={}
    function sel(){
       selectFile(1,'')
    }

</script>
<div class="b">
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
<style lang="scss">

</style>