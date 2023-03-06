<script>
  import { onMount } from "svelte";
  import { sys } from "./sys";
  import Card from "./Card.svelte";
  import Ipt from "./Ipt.svelte";

  let url;
  let nm;
  let bio;
  let msg = "test";
  let ld;
  onMount(() => sys.subscribe(a => {
    nm = a.blogName;
    bio = a.blogBio;
    url = a.blogUrl;
  }));
  const save = () => {

  };
</script>
<Card act={1} {msg} err={0} title="Blog" {save} {ld}>
  <Ipt label="Domain" bind:value={url} placeholder="www.blog.example" />
  <Ipt label="Name" bind:value={nm} placeholder="my blog" />
  <Ipt label="Bio" bind:value={url} placeholder="www.blog.example" />
  <Ipt label="Domain" bind:value={url} placeholder="www.blog.example" />
</Card>