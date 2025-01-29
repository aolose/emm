<script lang="ts">
	import FileIcon from '$lib/components/fileIcon.svelte';
	import { fileSize } from '$lib/utils';

	let { name, size, type, src } = $props();
</script>

<div class="a">
	<div class="i">
		<FileIcon size={40} {type} />
	</div>
	<div class="b">
		<b title={name}>{name}</b>
		<span>{fileSize(+size)}</span>
	</div>
	<a class="icon i-down" href={src} rel="noreferrer" target="_blank" download></a>
</div>

<style lang="scss">
  .a {
    border-radius: 5px;
    width: 240px;
    align-items: center;
    display: flex;
    background: linear-gradient(rgba(80, 100, 150, 0.3), rgba(80, 100, 150, 0.2));
    margin: 10px;
  }

  .i {
    padding: 10px;
  }

  .b {
    font-size: 13px;
    white-space: nowrap;
    flex: 1;
    padding: 10px 10px 4px;
    flex-direction: column;

    b {
      width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 200;
      display: block;
      line-height: 1.4;
      color: #dddddd;
    }

    span {
      display: block;
    }
  }

  a {
    opacity: 0.5;
    color: #dddddd !important;
    display: block;
    border-left: 1px solid rgba(255, 255, 255, 0.2);
    padding: 10px 14px;
    font-size: 19px;
    text-decoration: none !important;
  }
</style>
