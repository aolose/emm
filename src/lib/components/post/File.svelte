<script>
	import FileIcon from '$lib/components/fileIcon.svelte';
	import { fileSize } from '$lib/utils';
	export let name;
	export let size;
	export let type;
	export let src;
</script>

<div class="a">
	<div class="i">
		<FileIcon size={40} {type} />
	</div>
	<div class="b">
		<b>{name}</b>
		<span>{fileSize(+size)}</span>
	</div>
	<a class="icon i-down" href={src} rel="noreferrer" target="_blank" download />
</div>

<style lang="scss">
	.a {
		border-radius: 5px;
		padding: 4px 10px;
		width: 200px;
		align-items: center;
		display: flex;
		background: linear-gradient(rgba(80, 100, 150, 0.3), rgba(80, 100, 150, 0.2));
		margin: 10px;
	}
	.i {
		margin-right: 20px;
	}
	.b {
		font-size: 13px;
		flex: 1;
		flex-direction: column;
		b {
			color: #1c93ff;
		}

		span {
			display: block;
		}
	}
	a {
		padding: 10px;
		font-size: 19px;
		display: block;
		text-decoration: none !important;
	}
</style>
