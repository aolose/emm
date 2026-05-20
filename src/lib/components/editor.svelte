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

	// ── Active formatting state ──────────────────────────────────────

	let activeBold = $state(false);
	let activeItalic = $state(false);
	let activeStrike = $state(false);
	let activeQuote = $state(false);
	let activeUL = $state(false);
	let activeOL = $state(false);

	function updateActiveState() {
		if (!cm) return;
		const pos = cm.state.selection.main.head;
		const doc = cm.state.doc;
		const text = doc.toString();
		const line = doc.lineAt(pos).text;

		const findSurrounding = (marker: string) => {
			const before = text.slice(0, pos);
			const after = text.slice(pos);
			const lastOpen = before.lastIndexOf(marker);
			if (lastOpen === -1) return false;
			const nextClose = after.indexOf(marker);
			if (nextClose === -1) return false;
			const between = before.slice(lastOpen + marker.length);
			const beforeNext = between.lastIndexOf(marker);
			if (beforeNext !== -1) return false;

			// For single-char markers (*), exclude adjacent markers (**)
			if (marker.length === 1) {
				const openPos = lastOpen;
				const closePos = pos + nextClose;
				if (text[openPos + 1] === marker || text[openPos - 1] === marker) return false;
				if (text[closePos - 1] === marker || text[closePos + 1] === marker) return false;
			}
			return true;
		};


		activeBold = findSurrounding('**');
		activeItalic = findSurrounding('*');
		activeStrike = findSurrounding('~~');
		activeQuote = /^> /.test(line);
		activeUL = /^- /.test(line);
		activeOL = /^\d+\. /.test(line);
	}

	// ── Toggle helpers ───────────────────────────────────────────────

	function toggleWrapper(w: string) {
		if (!cm) return;
		const { from, to } = cm.state.selection.main;
		const len = w.length;
		const doc = cm.state.doc;
		const fullText = doc.toString();

		// Case 1: text selected
		if (from !== to) {
			const sel = fullText.slice(from, to);
			if (sel.startsWith(w) && sel.endsWith(w) && sel.length >= 2 * len) {
				const inner = sel.slice(len, -len);
				cm.dispatch({
					changes: { from, to, insert: inner },
					selection: EditorSelection.range(from, from + inner.length)
				});
			} else {
				cm.dispatch({
					changes: { from, to, insert: w + sel + w },
					selection: EditorSelection.range(from + len, from + len + sel.length)
				});
			}
			updateActiveState();
			return;
		}

		// Case 2: no selection, check surrounding pair
		const pos = from;
		const before = fullText.slice(0, pos);
		const after = fullText.slice(pos);
		const openAt = before.lastIndexOf(w);
		if (openAt === -1) return insertPlaceholder(w, pos, len);
		const closeAt = after.indexOf(w);
		if (closeAt === -1) return insertPlaceholder(w, pos, len);
		const between = before.slice(openAt + len);
		if (between.lastIndexOf(w) !== -1) return insertPlaceholder(w, pos, len);

		// Cursor inside pair, unwrap
		const inner = fullText.slice(openAt + len, pos + closeAt);
		cm.dispatch({
			changes: { from: openAt, to: pos + closeAt + len, insert: inner }
		});
		updateActiveState();
	}

	function insertPlaceholder(w: string, pos: number, len: number) {
		if (!cm) return;
		cm.dispatch({
			changes: { from: pos, insert: w + 'text' + w },
			selection: EditorSelection.range(pos + len, pos + len + 4)
		});
		updateActiveState();
	}


	function toggleLinePrefix(prefix: string) {
		if (!cm) return;
		const { from, to } = cm.state.selection.main;
		const doc = cm.state.doc;
		const fromLine = doc.lineAt(from);
		const toLine = doc.lineAt(to);
		const prefixLen = prefix.length;

		let allPrefixed = true;
		const lines: string[] = [];
		for (let i = fromLine.number; i <= toLine.number; i++) {
			const t = doc.line(i).text;
			lines.push(t);
			if (!t.startsWith(prefix)) allPrefixed = false;
		}

		const newLines = allPrefixed
			? lines.map(l => l.slice(prefixLen))
			: lines.map(l => prefix + l);

		cm.dispatch({
			changes: { from: fromLine.from, to: toLine.to, insert: newLines.join('\n') }
		});
		updateActiveState();
	}

	// ── Toolbar actions ──────────────────────────────────────────────

	function toggleBold()          { toggleWrapper('**'); }
	function toggleItalic()        { toggleWrapper('*'); }
	function toggleStrikethrough() { toggleWrapper('~~'); }
	function toggleQuote()         { toggleLinePrefix('> '); }
	function toggleUL()            { toggleLinePrefix('- '); }
	function toggleOL()            { toggleLinePrefix('1. '); }
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

	// ── Paste-to-upload + active state tracking ──────────────────────

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

		const track = () => updateActiveState();
		v.dom.addEventListener('click', track);
		v.dom.addEventListener('keyup', track);
		v.dom.addEventListener('touchend', track);
	}

	// ── Built-in toolbar buttons ─────────────────────────────────────

	const defaultButtons = [
		{ title: 'Bold', action: toggleBold, cls: 'tb-bold', active: () => activeBold },
		{ title: 'Italic', action: toggleItalic, cls: 'tb-italic', active: () => activeItalic },
		{ title: 'Strikethrough', action: toggleStrikethrough, cls: 'tb-strike', active: () => activeStrike },
		{ title: 'Quote', action: toggleQuote, cls: 'tb-quote', active: () => activeQuote },
		{ title: 'Unordered list', action: toggleUL, cls: 'tb-ul', active: () => activeUL },
		{ title: 'Ordered list', action: toggleOL, cls: 'tb-ol', active: () => activeOL },
		{ title: 'Table', action: insertTable, cls: 'tb-table', active: () => false },
		{ title: 'Files / Image', action: handleFileUpload, cls: 'icon i-pic', active: () => false }
	];
</script>

<div class="editor-wrapper">
	<div class="toolbar">
		{#each defaultButtons as btn (btn.title)}
			<button
				onclick={btn.action}
				title={btn.title}
				class={btn.cls}
				aria-pressed={btn.active()}
			></button>
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
