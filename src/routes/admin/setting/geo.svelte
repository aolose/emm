<script>
  import { onMount } from "svelte";
  import { sys } from "./sys";
  import Card from "./Card.svelte";
  import Ipt from "./Ipt.svelte";

  let token;
  let dir;
  let msg = "test";
  let ld;
  onMount(() => sys.subscribe(a => {
    token = a.ipLiteToken;
    dir = a.ipLiteDir;
  }));
  const save = () => {

  };
</script>
<Card act={1} {msg} err={0} title="GeoIP Database" {save} {ld}>
  <Ipt label="Token" bind:value={token} placeholder="https://xxxx" box/>
  <Ipt label="Db Dir" bind:value={dir} placeholder="/home/ipDb" />
  <a href="#">where is my token?</a>
  <s></s>
</Card>
<style>
    s{
        padding: 5px;
    }
    a {
        opacity: .8;
        bottom: 20px;
        right: 30px;
        position: absolute;
        color: dodgerblue;
        text-decoration: underline;
    }

</style>