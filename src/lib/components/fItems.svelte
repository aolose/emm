<script>
	import FileIcon from './fileIcon.svelte';
	import { getExt } from '$lib/utils';

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

	let pic = $derived(file.type?.startsWith('image/') ? `/res/_${file.id}` : '');
</script>

<div class="file-card" class:act onclick={onclick}>
	<div class="p" style:background-image={pic ? `url(${pic})` : ''}>
		{#if !pic}
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
		border-radius: inherit;
		padding-top: 100%;
		background: var(--bg2) center;
		background-size: cover;
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