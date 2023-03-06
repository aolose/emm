<script>
  import { onMount } from "svelte";
  import { sys } from "./sys";
  import Card from "./Card.svelte";
  import Ipt from "./Ipt.svelte";

  let up;
  let msg = "test";
  let th;
  let ld;
  onMount(() => sys.subscribe(a => {
    up = a.uploadDir;
    th = a.thumbDir;
  }));
  const save = () => {

  };
</script>
<Card act={1} {msg} err={0} title="Res" {save} {ld}>
  <Ipt label="Upload Dir" bind:value={up} placeholder="./upload" />
  <Ipt label="Thumb Dir" bind:value={th} placeholder="./thumb" />
</Card>