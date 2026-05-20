<script lang="ts">
	import './cm-editor.css';
	import { filesUpload, selectFile } from '$lib/store';
	import { createFileMd, createUrl, file2Md, watch } from '$lib/utils';

	import CodeMirror from 'svelte-codemirror-editor';
	import { markdown } from '@codemirror/lang-markdown';
	import { EditorView } from '@codemirror/view';
	import { EditorSelection } from '@codemirror/state';

	let cm: EditorView;
	let { value = $bindable(''), toolbar = [] } = $props();

	// ── Markdown toggle helpers ──────────────────────────────────────

	function wrapLine(before: string, after?: string) {
		if (!cm) return;
		const { from, to } = cm.state.selection.main;
		const doc = cm.state.doc;
		const fromLine = doc.lineAt(from);
		const toLine = doc.lineAt(to);
		const lines: string[] = [];
		for (let i = fromLine.number; i <= toLine.number; i++) {
			const line = doc.line(i);
			lines.push(before + line.text + (after ?? before));
		}
		cm.dispatch({
			changes: { from: fromLine.from, to: toLine.to, insert: lines.join('\n') },
			selection: EditorSelection.range(
				fromLine.from + before.length,
				fromLine.from + before.length + lines[0].length - before.length - (after ?? before).length
			)
		});
	}

	function wrapSelection(before: string, after?: string) {
		if (!cm) return;
		const { from, to } = cm.state.selection.main;
		const text = cm.state.sliceDoc(from, to) || 'text';
		cm.dispatch({
			changes: { from, to, insert: before + text + (after ?? before) },
			selection: EditorSelection.range(
				from + before.length,
				from + before.length + text.length
			)
		});
	}

	// ── Toolbar actions ──────────────────────────────────────────────

	function toggleBold()          { wrapSelection('**'); }
	function toggleItalic()        { wrapSelection('*'); }
	function toggleStrikethrough() { wrapSelection('~~'); }
	function insertQuote()         { wrapLine('> '); }
	function insertUnorderedList() { wrapLine('- '); }
	function insertOrderedList()   { wrapLine('1. '); }
	function insertTable() {
		if (!cm) return;
		cm.dispatch({
			changes: {
				from: cm.state.selection.main.from,
				insert: '\n| header | header |\n| --- | --- |\n| cell | cell |\n'
			}
		});
	}

	// ── File upload ──────────────────────────────────────────────────

	async function handleFileUpload() {
		if (!cm) return;
		const files = await selectFile();
		if (!files?.length) return;
		const md = file2Md(files);
		cm.dispatch({
			changes: { from: cm.state.selection.main.from, insert: md }
		});
	}

	/** Insert file placeholder, upload, then replace blob URL. */
	async function handleImageUpload(f: File) {
		if (!cm) return;
		const blobUrl = createUrl(f);
		const md = createFileMd(f, blobUrl);
		cm.dispatch({ changes: { from: cm.state.selection.main.from, insert: md } });
		filesUpload([f], (uploaded) => {
			const finalUrl = createUrl(uploaded);
			const doc = cm.state.doc.toString();
			const idx = doc.indexOf(blobUrl);
			if (idx !== -1) {
				cm.dispatch({
					changes: { from: idx, to: idx + blobUrl.length, insert: finalUrl }
				});
			}
		});
	}

	// ── Paste-to-upload (Ctrl+V image) ───────────────────────────────

	function onEditorReady(v: EditorView) {
		cm = v;
		v.dom.addEventListener('paste', (e: ClipboardEvent) => {
			const items = e.clipboardData?.items;
			if (!items) return;
			for (const item of items) {
				if (item.type.startsWith('image/')) {
					e.preventDefault();
					const file = item.getAsFile();
					if (file) handleImageUpload(file);
					return;
				}
			}
		});
	}

	// ── Built-in toolbar buttons ─────────────────────────────────────

	const defaultButtons = [
		{ title: 'Bold', action: toggleBold, cls: 'tb-bold' },
		{ title: 'Italic', action: toggleItalic, cls: 'tb-italic' },
		{ title: 'Strikethrough', action: toggleStrikethrough, cls: 'tb-strike' },
		{ title: 'Quote', action: insertQuote, cls: 'tb-quote' },
		{ title: 'Unordered list', action: insertUnorderedList, cls: 'tb-ul' },
		{ title: 'Ordered list', action: insertOrderedList, cls: 'tb-ol' },
		{ title: 'Table', action: insertTable, cls: 'tb-table' },
		{ title: 'Files / Image', action: handleFileUpload, cls: 'icon i-pic' }
	];
</script>

<div class="editor-wrapper">
	<div class="toolbar">
		{#each defaultButtons as btn (btn.title)}
			<button onclick={btn.action} title={btn.title} class={btn.cls}></button>
		{/each}
		{#each toolbar as btn (btn.name)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<button
				onclick={btn.action}
				title={btn.title}
				class={btn.className || ''}
			></button>
		{/each}
	</div>
	<CodeMirror
		bind:value
		lang={markdown()}
		onready={onEditorReady}
		lineWrapping={true}
		lineNumbers={false}
		tabSize={2}
		placeholder="Write something..."
	/>
</div>
