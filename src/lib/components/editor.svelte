<script lang="ts">
	import './cm-editor.css';
	import { filesUpload, selectFile, editorTools } from '$lib/store';
	import { createFileMd, createUrl, file2Md, watch } from '$lib/utils';
	import { htmlToMd } from '$lib/html-to-md';

	import CodeMirror from 'svelte-codemirror-editor';
	import { markdown } from '@codemirror/lang-markdown';
	import { EditorView } from '@codemirror/view';
	import { EditorSelection } from '@codemirror/state';

	let cm: EditorView;
	let { value = $bindable(''), toolbar = [], editorRef = $bindable(null) } = $props();

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

	async function handleImageUpload(f: File, view?: EditorView) {
		const v = view || cm;
		if (!v) return;
		const blobUrl = createUrl(f);
		const md = createFileMd(f, blobUrl);
		v.dispatch(v.state.replaceSelection(md));
		filesUpload([f], (uploaded) => {
			const finalUrl = createUrl(uploaded);
			const doc = v.state.doc.toString();
			const idx = doc.indexOf(blobUrl);
			if (idx !== -1) {
				v.dispatch({ changes: { from: idx, to: idx + blobUrl.length, insert: finalUrl } });
			}
		});
	}

	// ── Paste-to-upload + active state tracking ──────────────────────

	const pasteExtension = EditorView.domEventHandlers({
		paste(event, view) {
			const clipboardData = event.clipboardData;
			if (!clipboardData) return;

			for (const item of clipboardData.items) {
				if (item.type.startsWith('image/')) {
					event.preventDefault();
					const file = item.getAsFile();
					if (file) handleImageUpload(file, view);
					return true;
				}
			}

			// HTML → Markdown conversion
			if (clipboardData.types.includes('text/html')) {
				event.preventDefault();
				const html = clipboardData.getData('text/html');
				const md = htmlToMd(html);
				view.dispatch(view.state.replaceSelection(md));
				return true;
			}
		},
		click() { updateActiveState(); },
		keyup() { updateActiveState(); },
		touchend() { updateActiveState(); }
	});

	function onEditorReady(v: EditorView) {
		cm = v;
		if (editorRef) editorRef = contextTools;
		editorTools.set(contextTools);
	}

	// ── Context tools for AI ────────────────────────────────────────
	// Each tool is a standalone function returning structured data

	function getSelection() {
		if (!cm) return { hasSelection: false, text: '' };
		const { from, to } = cm.state.selection.main;
		const hasSelection = from !== to;
		return {
			hasSelection,
			text: hasSelection ? cm.state.doc.sliceString(from, to) : '',
		};
	}

	function getCurrentLine() {
		if (!cm) return { lineNumber: 0, text: '' };
		const pos = cm.state.selection.main.head;
		const line = cm.state.doc.lineAt(pos);
		return {
			lineNumber: line.number,
			text: line.text,
		};
	}

	function getCurrentParagraph() {
		if (!cm) return { text: '', startLine: 0, endLine: 0 };
		const doc = cm.state.doc;
		const pos = cm.state.selection.main.head;
		const cursorLine = doc.lineAt(pos);
		let startLine = cursorLine.number;
		let endLine = cursorLine.number;
		while (startLine > 1) {
			if (doc.line(startLine - 1).text.trim() === '') break;
			startLine--;
		}
		while (endLine < doc.lines) {
			if (doc.line(endLine + 1).text.trim() === '') break;
			endLine++;
		}
		const lines: string[] = [];
		for (let l = startLine; l <= endLine; l++) lines.push(doc.line(l).text);
		return { text: lines.join('\n'), startLine, endLine };
	}

	function getCurrentSection() {
		if (!cm) return { text: '' };
		const doc = cm.state.doc;
		const pos = cm.state.selection.main.head;
		const text = doc.toString();
		const allLines = text.split('\n');
		const cursorLine = doc.lineAt(pos).number - 1;
		let secStart = 0;
		for (let i = cursorLine; i >= 0; i--) {
			if (/^#{1,6}\s/.test(allLines[i])) {
				secStart = allLines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
				break;
			}
		}
		let secEnd = text.length;
		for (let i = cursorLine + 1; i < allLines.length; i++) {
			if (/^#{1,6}\s/.test(allLines[i])) {
				secEnd = allLines.slice(0, i).join('\n').length;
				break;
			}
		}
		return { text: text.slice(secStart, secEnd).trim() };
	}

	function getFullDocument() {
		if (!cm) return { text: '', totalLines: 0, totalLength: 0 };
		const doc = cm.state.doc;
		return { text: doc.toString(), totalLines: doc.lines, totalLength: doc.length };
	}

	function replaceSelection(text: string) {
		if (!cm) return;
		const sel = cm.state.selection.main;
		// If nothing selected, replace the current paragraph
		if (sel.empty) {
			const para = getCurrentParagraph();
			if (para.text) {
				const paraStart = cm.state.doc.line(para.startLine).from;
				const paraEnd = cm.state.doc.line(para.endLine).to;
				cm.dispatch({
					changes: { from: paraStart, to: paraEnd, insert: text },
					selection: { anchor: paraStart + text.length },
				});
				return;
			}
		}
		cm.dispatch({
			changes: { from: sel.from, to: sel.to, insert: text },
			selection: { anchor: sel.from + text.length },
		});
	}

	function replaceCurrentLine(text: string) {
		if (!cm) return { ok: false, error: 'editor not ready' };
		const pos = cm.state.selection.main.head;
		const line = cm.state.doc.lineAt(pos);
		cm.dispatch({
			changes: { from: line.from, to: line.to, insert: text },
			selection: { anchor: line.from + text.length },
		});
		return { ok: true, lineNumber: line.number };
	}

	function replaceCurrentParagraph(text: string) {
		if (!cm) return { ok: false, error: 'editor not ready' };
		const para = getCurrentParagraph();
		if (!para.text) return { ok: false, error: 'empty paragraph' };
		const paraStart = cm.state.doc.line(para.startLine).from;
		const paraEnd = cm.state.doc.line(para.endLine).to;
		cm.dispatch({
			changes: { from: paraStart, to: paraEnd, insert: text },
			selection: { anchor: paraStart + text.length },
		});
		return { ok: true, startLine: para.startLine, endLine: para.endLine };
	}

	function replaceText(search: string, replace: string) {
		if (!cm || !search) return { ok: false, error: 'editor not ready' };
		const doc = cm.state.doc;
		const text = doc.toString();
		const idx = text.indexOf(search);
		if (idx === -1) return { ok: false, error: 'search text not found' };
		cm.dispatch({
			changes: { from: idx, to: idx + search.length, insert: replace },
			selection: { anchor: idx + replace.length },
		});
		return { ok: true };
	}

	function insertAtCursor(text: string) {
		if (!cm) return { ok: false, error: 'editor not ready' };
		const pos = cm.state.selection.main.head;
		cm.dispatch({
			changes: { from: pos, insert: text },
			selection: { anchor: pos + text.length },
		});
		return { ok: true };
	}

	const contextTools = {
		getSelection, getCurrentLine, getCurrentParagraph, getCurrentSection, getFullDocument,
		insertAtCursor, replaceSelection, replaceCurrentLine, replaceCurrentParagraph, replaceText,
	};

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
				aria-pressed={btn.active?.()}
			></button>
		{/each}
	</div>
	<CodeMirror
		bind:value
		lang={markdown()}
		extensions={[pasteExtension]}
		onready={onEditorReady}
		lineWrapping={true}
		lineNumbers={false}
		tabSize={2}
		placeholder="Write something..."
	/>
</div>