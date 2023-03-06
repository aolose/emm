<script>
  import { onMount } from "svelte";
  import { sys } from "./sys";
  import Card from "./Card.svelte";
  import Ipt from "./Ipt.svelte";

  let pw;
  let msg = "test";
  let un;
  let ld;
  onMount(() => sys.subscribe(a => {
    un = a.admUsr;
    pw = a.admPwd;
  }));
  const save = () => {

  };
</script>
<Card act={1} {msg} err={0} title="Admin User" {save} {ld}>
  <Ipt label="User Name" bind:value={un} placeholder="./thumb" />
  <Ipt label="Password" bind:value={pw} placeholder="./upload" />
</Card>