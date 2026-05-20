<script lang="ts">
	import { onMount } from 'svelte';
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

	/**
	 * Wrap each selected line in the given before/after strings.
	 * If selection is empty, inserts the wrapper at cursor.
	 */
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

	/** Wrap selection or insert wrapper at cursor (inline). */
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

	// ── Built-in toolbar buttons ─────────────────────────────────────

	const defaultButtons = [
		{ label: 'B', title: 'Bold', action: toggleBold, bold: true },
		{ label: 'I', title: 'Italic', action: toggleItalic, italic: true },
		{ label: 'S', title: 'Strikethrough', action: toggleStrikethrough, strike: true },
		{ label: '"', title: 'Quote', action: insertQuote },
		{ label: '•', title: 'Unordered list', action: insertUnorderedList },
		{ label: '1.', title: 'Ordered list', action: insertOrderedList },
		{ label: '⊞', title: 'Table', action: insertTable },
		{ label: '', title: 'Files', action: handleFileUpload, icon: 'icon i-file' }
	];
</script>

<div class="editor-wrapper">
	<div class="toolbar">
		{#each defaultButtons as btn (btn.title)}
			<button onclick={btn.action} title={btn.title}>
				{#if btn.icon}
					<span class={btn.icon}></span>
				{:else}
					{btn.label}
				{/if}
			</button>
		{/each}
		{#each toolbar as btn (btn.name)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<button
				onclick={btn.action}
				title={btn.title}
				class={btn.className || ''}
			>
				{btn.name}
			</button>
		{/each}
	</div>
	<CodeMirror
		bind:value
		lang={markdown()}
		onready={(v) => cm = v}
		lineWrapping={true}
		tabSize={2}
		placeholder="Write something..."
	/>
</div>
