<script>
	import { onMount } from 'svelte';
	import './easymde.scss';
	import { filesUpload, selectFile } from '$lib/store';
	import { createFileMd, createUrl, file2Md, watch } from '$lib/utils';

	let e = $state('');
	let editor = $state();
	let { value = $bindable(''), toolbar = [] } = $props();
	const wb = watch(toolbar);
	const wv = watch(value);
    /** Default EasyMDE toolbar buttons */
	const TOOLBAR_DEFAULTS = [
		'bold',
		'italic',
		'strikethrough',
		'quote',
		'unordered-list',
		'ordered-list',
		'table',
		{
			name: 'files',
			action: async (ed) => {
				const f = await selectFile();
				if (f && f.length) {
					ed.codemirror.replaceSelection(file2Md(f));
				}
			},
			className: 'icon i-file',
			title: 'Files'
		}
	];
	let tools = $derived(TOOLBAR_DEFAULTS.concat(toolbar));

	/**
	 * EasyMDE doesn't support dynamic toolbar updates, so we monkey-patch
	 * codemirror.getWrapperElement to intercept the toolbar container creation
	 * and replace the old toolbar with a fresh one.
	 */
	const changeTools = () => {
		if (!editor) return;
		const bar = editor.toolbar_div;
		const cm = editor.codemirror;
		cm.off('cursorActivity');
		const fn = cm.getWrapperElement;
		cm.getWrapperElement = () => {
			cm.getWrapperElement = fn;
			return {
				parentNode: {
					insertBefore(a) {
						bar.replaceWith(a);
						editor.toolbar_div = a;
					}
				}
			};
		};
		editor.createToolbar(tools);
	};
	$effect(() => {
		wv(() => {
			if (editor && value !== editor.value()) {
				editor.value(value);
			}
		}, value);
		wb(changeTools, tools);
	});

	onMount(async () => {
		const eModule = await import('easymde');
		const Easy = eModule.default;
		editor = new Easy({
			element: e,
			autoDownloadFontAwesome: false,
			spellChecker: false,
			uploadImage: true,
			previewRender: () => '',
			syncSideBySidePreviewScroll: false,
			toolbar: tools,
			imageUploadFunction: handleImageUpload,
			shortcuts: {
				preview: null,
				fullscreen: null,
				guide: null,
				'upload-image': null
			}
		});
		editor?.codemirror?.on('change', () => {
			value = editor.value();
		});
		editor.value(value);
	});

	/**
	 * Insert a file placeholder into the editor, upload the file,
	 * then replace the temporary blob URL with the final server URL.
	 */
	async function handleImageUpload(f) {
		const cm = editor.codemirror;
		const blobUrl = createUrl(f);
		cm.replaceSelection(`${createFileMd(f, blobUrl)}`);
		filesUpload([f], (uploaded) => {
			const finalUrl = createUrl(uploaded);
			// Scan bottom-up to avoid position shifts from replacements
			let line = cm.lineCount();
			while (line--) {
				const text = cm.getLine(line);
				const idx = text.indexOf(blobUrl);
				if (idx !== -1) {
					cm.replaceRange(finalUrl, { line, ch: idx }, { line, ch: idx + blobUrl.length });
				}
			}
		});
	}
</script>

<div class="e">
	<textarea class="d" bind:this={e}></textarea>
</div>

<style lang="scss">
	@use '../../lib/break' as *;
	@import url(./font/fas.css);

	.d {
		display: none;
	}

	.e {
		height: 100%;
		overflow: hidden;
		line-height: 2;
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
	}
</style>
