// Editor tool functions exposed to the AI assistant.
// These read and modify the CodeMirror editor instance.
//
// All functions accept a single args object (from JSON-parsed tool-call
// arguments) to avoid Object.values() ordering fragility.
//
// Usage from editor.svelte:
//   import { createEditorTools } from '$lib/components/ai/editorTools';
//   const tools = createEditorTools(cm);

import type { EditorView } from '@codemirror/view';

export interface EditorToolResult {
	ok: boolean;
	error?: string;
	[key: string]: unknown;
}

export interface EditorTools {
	getSelection(_args?: Record<string, unknown>): { hasSelection: boolean; text: string };
	getCurrentLine(_args?: Record<string, unknown>): { lineNumber: number; text: string };
	getCurrentParagraph(_args?: Record<string, unknown>): {
		text: string;
		startLine: number;
		endLine: number;
	};
	getCurrentSection(_args?: Record<string, unknown>): { text: string };
	getFullDocument(_args?: Record<string, unknown>): {
		text: string;
		totalLines: number;
		totalLength: number;
	};
	insertAtCursor(args: { text: string }): EditorToolResult;
	replaceSelection(args: { text: string }): EditorToolResult;
	replaceCurrentLine(args: { text: string }): EditorToolResult;
	replaceCurrentParagraph(args: { text: string }): EditorToolResult;
	replaceText(args: { searchText: string; newText: string }): EditorToolResult;
	replaceFullDocument(args: { text: string }): EditorToolResult;
}

export function createEditorTools(cm: EditorView): EditorTools {
	function getSelection() {
		if (!cm) return { hasSelection: false, text: '' };
		const { from, to } = cm.state.selection.main;
		const hasSelection = from !== to;
		return {
			hasSelection,
			text: hasSelection ? cm.state.doc.sliceString(from, to) : ''
		};
	}

	function getCurrentLine() {
		if (!cm) return { lineNumber: 0, text: '' };
		const pos = cm.state.selection.main.head;
		const line = cm.state.doc.lineAt(pos);
		return {
			lineNumber: line.number,
			text: line.text
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

	// Uses CodeMirror's line API directly — avoids split('\n') and
	// string-length calculations that break on Windows \r\n line endings
	// or degrade with very large documents.
	function getCurrentSection() {
		if (!cm) return { text: '' };
		const doc = cm.state.doc;
		const pos = cm.state.selection.main.head;
		const cursorLineNum = doc.lineAt(pos).number;

		let startLineNum = 1;
		for (let i = cursorLineNum; i >= 1; i--) {
			if (/^#{1,6}\s/.test(doc.line(i).text)) {
				startLineNum = i;
				break;
			}
		}

		let endLineNum = doc.lines;
		for (let i = cursorLineNum + 1; i <= doc.lines; i++) {
			if (/^#{1,6}\s/.test(doc.line(i).text)) {
				endLineNum = i - 1;
				break;
			}
		}

		const fromPos = doc.line(startLineNum).from;
		const toPos = doc.line(endLineNum).to;
		return { text: doc.sliceString(fromPos, toPos).trim() };
	}

	function getFullDocument() {
		if (!cm) return { text: '', totalLines: 0, totalLength: 0 };
		const doc = cm.state.doc;
		return { text: doc.toString(), totalLines: doc.lines, totalLength: doc.length };
	}

	function replaceSelection({ text }: { text: string }): EditorToolResult {
		if (!cm) return { ok: false, error: 'editor not ready' };
		const sel = cm.state.selection.main;

		// If nothing selected, fall back to replacing the current paragraph
		if (sel.empty) {
			const para = getCurrentParagraph();
			if (!para.text) return { ok: false, error: 'no selection and empty paragraph' };
			const paraStart = cm.state.doc.line(para.startLine).from;
			const paraEnd = cm.state.doc.line(para.endLine).to;
			cm.dispatch({
				changes: { from: paraStart, to: paraEnd, insert: text },
				selection: { anchor: paraStart + text.length }
			});
			return { ok: true };
		}

		cm.dispatch({
			changes: { from: sel.from, to: sel.to, insert: text },
			selection: { anchor: sel.from + text.length }
		});
		return { ok: true };
	}

	function replaceCurrentLine({ text }: { text: string }): EditorToolResult {
		if (!cm) return { ok: false, error: 'editor not ready' };
		const pos = cm.state.selection.main.head;
		const line = cm.state.doc.lineAt(pos);
		cm.dispatch({
			changes: { from: line.from, to: line.to, insert: text },
			selection: { anchor: line.from + text.length }
		});
		return { ok: true, lineNumber: line.number };
	}

	function replaceCurrentParagraph({ text }: { text: string }): EditorToolResult {
		if (!cm) return { ok: false, error: 'editor not ready' };
		const para = getCurrentParagraph();
		if (!para.text) return { ok: false, error: 'empty paragraph' };
		const paraStart = cm.state.doc.line(para.startLine).from;
		const paraEnd = cm.state.doc.line(para.endLine).to;
		cm.dispatch({
			changes: { from: paraStart, to: paraEnd, insert: text },
			selection: { anchor: paraStart + text.length }
		});
		return { ok: true, startLine: para.startLine, endLine: para.endLine };
	}

	function replaceFullDocument({ text }: { text: string }): EditorToolResult {
		if (!cm) return { ok: false, error: 'editor not ready' };
		const len = cm.state.doc.length;
		cm.dispatch({
			changes: { from: 0, to: len, insert: text },
			selection: { anchor: text.length }
		});
		return { ok: true };
	}

	function replaceText({
		searchText,
		newText
	}: {
		searchText: string;
		newText: string;
	}): EditorToolResult {
		if (!cm) return { ok: false, error: 'editor not ready' };
		if (!searchText) return { ok: false, error: 'search term cannot be empty' };
		const doc = cm.state.doc;
		const text = doc.toString();
		const idx = text.indexOf(searchText);
		if (idx === -1) return { ok: false, error: 'search text not found' };
		cm.dispatch({
			changes: { from: idx, to: idx + searchText.length, insert: newText },
			selection: { anchor: idx + newText.length }
		});
		return { ok: true };
	}

	function insertAtCursor({ text }: { text: string }): EditorToolResult {
		if (!cm) return { ok: false, error: 'editor not ready' };
		const pos = cm.state.selection.main.head;
		cm.dispatch({
			changes: { from: pos, insert: text },
			selection: { anchor: pos + text.length }
		});
		return { ok: true };
	}

	return {
		getSelection,
		getCurrentLine,
		getCurrentParagraph,
		getCurrentSection,
		getFullDocument,
		insertAtCursor,
		replaceSelection,
		replaceCurrentLine,
		replaceCurrentParagraph,
		replaceText,
		replaceFullDocument
	};
}
