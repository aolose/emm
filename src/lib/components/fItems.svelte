<script>
	import FileIcon from './fileIcon.svelte';
	import { getExt, resUrl } from '$lib/utils';
	import { h } from '$lib/store';
	let loaded = $state(false);
	let {
		file = $bindable({
			id: 0,
			name: '',
			type: '',
			size: 0
		}),
		act = false,
		onclick = () => {}
	} = $props();

</script>

<div class="file-card" class:act {onclick}>
	<div class="p">
		{#if file.type?.startsWith('image/')}
			<img
				src={file.url || resUrl($h.r2PublicDomain, file.id, !!file.thumb, !!file.r2Synced, file.r2Key)}
				alt={file.name}
				class:loaded
				onload={() => loaded = true}
			/>
		{/if}

		{#if !file.type?.startsWith('image/') || !loaded}
			<div class="f">
				<FileIcon size={60} type={getExt(file)} />
			</div>
		{/if}
	</div>
	<div class="n" title={file.name}>{file.name}</div>
</div>

<style lang="scss">
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.f {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.file-card {
		pointer-events: all;
		width: 100px;
		height: 124px;
		margin: 5px;
		cursor: pointer;
		background: var(--bg0);
		border: 1px solid transparent;
		box-sizing: border-box;
		animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;

		&:hover {
			border-color: var(--darkgrey);
		}

		&.act {
			border-color: #5679a8;
			box-shadow: rgba(0, 0, 0, 0.2) 1px 2px 4px;
		}
	}

  .p {
    position: relative;
    padding-top: 100%;
    background: var(--bg2);

    img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover; /* 效果等同于 background-size: cover */
      opacity: 0;
      transition: opacity 0.3s ease;

      &.loaded {
        opacity: 1; /* 加载完成后渐入 */
      }
    }
  }

	.n {
		width: 90%;
		margin: 0 auto;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 12px;
		line-height: 2;
		text-align: center;
	}
</style>
