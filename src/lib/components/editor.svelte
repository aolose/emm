<script>
	import { onMount } from 'svelte';
	import './easymde.scss';
	import { filesUpload, selectFile } from '$lib/store';
	import { createFileMd, createUrl, file2Md } from '$lib/utils';

	let e = '';
	let editor;
	export let value = '';
	export let toolbar = [];
	let ts = '';
	const base = [
		'bold',
		'italic',
		'strikethrough',
		'code',
		'quote',
		'unordered-list',
		'ordered-list',
		'link',
		'table',
		{
			name: 'files',
			action: async (editor) => {
				const f = await selectFile();
				if (f && f.length) {
					editor.codemirror.replaceSelection(file2Md(f));
				}
			},
			className: 'icon i-file',
			title: 'Files'
		}
	];
	let tools;
	$: tools = base.concat(toolbar);
	const changeTools = () => {
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
	$: {
		if (editor && value !== editor.value()) editor.value(value);
		const s = JSON.stringify(toolbar);
		if (editor) {
			if (ts !== s) {
				ts = s;
				changeTools();
			}
		}
	}

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
			imageUploadFunction: (f) => {
				const cm = editor.codemirror;
				const url = createUrl(f);
				cm.replaceSelection(`${createFileMd(f, url)}`);
				filesUpload([f], (o) => {
					const x = createUrl(o);
					let l = cm.lineCount();
					while (l--) {
						const v = cm.getLine(l);
						const idx = v.indexOf(url);
						if (idx !== -1) {
							cm.replaceRange(x, { line: l, ch: idx }, { line: l, ch: idx + url.length });
						}
					}
				});
			},
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
	});
</script>

<div class="e">
	<textarea class="d" bind:this={e} />
</div>

<style lang="scss">
	@import '../../lib/break';

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
