<script lang="ts">
	import { onMount } from 'svelte';
	import Editor from '$lib/components/editor.svelte';
	import {
		confirm,
		editPost,
		full,
		originPost,
		patchedTag,
		posts,
		saveNow,
		setting,
		aiPanelTab,
		editorTools
	} from '$lib/store';
	import { aiStatus, validateAi, flushAiSession, loadAiSession, aiDeleteSession } from '$lib/components/ai';
	import { get } from 'svelte/store';
	import { api, req } from '$lib/req';
	import { diffObj, getErr, watch, time } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import { method } from '$lib/enum';
	import { applyStrPatch } from '$lib/setStrPatchFn';

	let title = $state('');
	let draft = $state('');
	let cid = 0;
	let editorRef = $state<Record<string, () => unknown> | null>(null);

	// Character counter (excludes URLs)
	function countChars(text: string): number {
		let cleaned = text
			.replace(/!\[[^\]]*\]\([^)]+\)/g, '![]()')
			.replace(/\[([^\]]*)\]\([^)]+\)/g, '[$1]()')
			.replace(/\s+src=["'][^"']*["']/g, ' src=""')
			.replace(/https?:\/\/[^\s<>"'\])]+/g, '')
			.replace(/blob:https?:\/\/[^\s<>"'\])]+/g, '');
		return cleaned.length;
	}
	let charCount = $derived.by(() => countChars(draft));

	let { close, preview, visitor } = $props();
	const ctxWatch = watch(draft, title);
	const tSet = {
		name: 'setting',
		action: () => {
			setting.set(1);
		},
		className: 'icon i-sys',
		title: 'setting'
	};
	const tUser = {
		name: 'visitor',
		action: visitor,
		className: 'icon i-user',
		title: 'visitor'
	};
	const tFull = {
		name: 'full screen',
		action: () => {
			full.set(1);
		},
		className: 'icon i-full',
		title: 'full screen'
	};
	const tPub = {
		name: 'publish',
		action: () => {
			confirm('sure to publish?', 'publish').then((a) => {
				if (!a) return;
				saveNow.set(1);
				autoSave(get(editPost), 1);
			});
		},
		className: 'icon i-pub',
		title: 'publish'
	};
	const tUnPub = {
		name: 'UnPublish',
		action: () => {
			confirm('revoke publish?').then((a) => {
				if (a) {
					saveNow.set(1);
					editPost.update((p) => ({ ...p, published: 0 }));
				}
			});
		},
		className: 'icon i-draft',
		title: 'revoke publish'
	};
	const tSlug = {
		name: 'View',
		className: 'icon i-target',
		title: 'view post',
		action: () => {
			window.open(`/post/${get(editPost).slug}`);
		}
	};
	const tDiscard = {
		name: 'Discard',
		action: () => {
			confirm('replace draft with latest published post?').then((a) => {
				if (!a) return;
				editPost.update((p) => {
					const { title, content } = p;
					return { ...p, title_d: title, content_d: content };
				});
			});
		},
		className: 'icon i-drop',
		title: 'discard'
	};
	const tDel = {
		name: 'delete',
		action: () => {
			confirm('sure to delete?').then((ok) => {
				if (!ok) return;
				req('post', new Uint16Array([cid]), { method: method.DELETE })
					.then((a) => {
						if (a) {
							aiDeleteSession(cid);
							posts.update((u) => {
								return u.filter((u) => u.id !== cid);
							});
							close && close();
						}
					})
					.catch((e) => {
						confirm(getErr(e), '', 'ok');
					});
			});
		},
		className: 'icon i-del',
		title: 'delete'
	};
	const tView = {
		name: 'preview',
		action() {
			aiPanelTab.set('preview');
			preview && preview();
		},
		className: 'icon i-view',
		title: 'preview'
	};
	// ── AI button ─────────────────────────────────────────────────
	const tAI = {
		name: 'ai',
		action() {
			const st = get(aiStatus);
			if (st === 'available') {
				aiPanelTab.set(get(aiPanelTab) === 'ai' ? 'preview' : 'ai');
			} else if (st === 'checking') {
				confirm('Checking AI availability, please wait...', 'ok', '');
			} else if (st === 'no_key') {
				confirm('Please configure DeepSeek API key in Settings', 'ok', '');
			} else {
				confirm('AI service unavailable', 'ok', '');
			}
		},
		active: () => get(aiPanelTab) === 'ai',
		className: 'icon i-ai',
		title: 'AI Assistant'
	};
	let tools = $state([]);
	$effect(() => {
		ctxWatch(
			() => {
				editPost.update((p) => {
					return {
						...p,
						content_d: draft,
						title_d: title
					};
				});
			},
			draft,
			title
		);
	});
	const delaySave = api('post', { delay: 3e3 });
	const save = api('post');
	const loadTag = () => {
		const { ver, tags } = get(patchedTag);
		req('tags', +ver).then((d) => {
			const [v, da] = applyStrPatch(new Set(tags), `${d}`);
			patchedTag.set({
				ver: v,
				tags: da
			});
		});
	};
	let saving = 0;
	let i = 0;
	const id = (a) => a._ || a.id;
	export const autoSave = async (p, isPublish) => {
		if (saving) return;
		const now = get(saveNow);
		if (now) saving = 1;
		saveNow.set(0);
		const ori = get(originPost);
		const o = diffObj(ori, p);
		const ol = o && new Set(Object.keys(o));
		if (
			!isPublish &&
			(!o ||
				(ol.size === 2 && !o.title_d && !o.content_d && ol.has('title_d') && ol.has('content_d')) ||
				ol.size === 0)
		)
			return (saving = 0);
		const _ = p._;
		const v = { ...o, _ };
		if (p.id) {
			v.id = p.id;
		}
		const k = id(p);
		const saveAt = p.save;
		if (isPublish) v._p = isPublish;
		const r =
			(await (now ? save : delaySave)({ ...v })
				.catch((e) => {
					confirm('save fail: ' + getErr(e), null, 'ok');
					throw e;
				})
				.finally(() => {
					saving = 0;
				})) || {};

		// drop
		if ('save' in r && r.save < saveAt) return;
		if (v._tag) await loadTag();
		const n = { ...ori, ...p, ...r };
		if (id(get(originPost)) === k) originPost.set({ ...n });
		else {
			const ps = get(posts);
			const p = ps.find((a) => a.id === k);
			if (p) {
				Object.assign(p, n);
				posts.set([...ps]);
			}
		}
		if (id(get(editPost)) === k) {
			n.content_d = get(editPost).content_d;
			n.title_d = get(editPost).title_d;
			editPost.set({ ...n });
		}
		// trigger sitting ok
		return 1;
	};

	onMount(async () => {
		loadTag();
		// Validate AI availability on mount
		validateAi();
		// Inject title tools into AI toolset (one-shot after CM tools appear)
		let titleInjected = false;
		const unsubTools = editorTools.subscribe((tools) => {
			if (!titleInjected && Object.keys(tools).length) {
				titleInjected = true;
				editorTools.update((t) => ({
					...t,
					getTitle: () => ({ title: title || '' }),
					setTitle: (args: unknown) => {
						title = String((args as Record<string, unknown>)?.title || '');
						return { ok: true };
					}
				}));
			}
		});
		const unsubPost = editPost.subscribe((p) => {
			draft = p.content_d || '';
			title = p.title_d || '';
			const { id, save, published, modify, title: _title, content } = p;
			// Save old + load new AI session when switching posts
			if (cid != null && cid !== id) {
				flushAiSession();
			}
			if (cid !== id) {
				loadAiSession(id);
			}
			cid = id;
			const up = modify || 0;
			const hasDraft = !published || save > up;
			const t = [];
			t.push(tSet);
			if ((_title || content) && (title !== _title || draft !== content)) t.push(tDiscard);
			if (published) {
				t.push(tSlug);
				t.push(tUnPub);
			}
			if (id) t.push(tUser);
			if (hasDraft) t.push(tPub);
			if (id) t.push(tDel);
			t.push(tView);
			t.push(tFull);
			t.push(tAI);
			if (tools.join() !== t.join()) {
				tools = t;
			}
			autoSave(p);
		});
		return () => {
			unsubTools();
			unsubPost();
		};
	});
</script>

{#if $editPost._ || $editPost.id}
	<div class="a" class:fu={$full} transition:fade|global>
		<div class="t">
			<input bind:value={title} />
			<button class="icon i-close" onclick={close}></button>
		</div>
		<div class="e">
			<button onclick={() => full.set(0)} class="icon i-shrink"></button>
			{#key $editPost._ || $editPost.id}
				<Editor bind:value={draft} toolbar={tools} bind:editorRef />
				{#if $editPost.save}
					<span class="tm"
						><span>save at {time($editPost.save).slice(9)}</span>
						<span class="wc">{charCount} chars</span></span
					>
				{/if}
			{/key}
		</div>
	</div>
{/if}

<style lang="scss">
	@use '../../break' as *;

	:global {
		.toolbar .i-full {
			display: none;
			@media (max-width: 800px) {
				display: inline;
			}
		}
	}

	.i-shrink {
		display: none;
		@media (max-width: 800px) {
			transition: opacity 0.3s;
			opacity: 0;
			padding: 3px;
			font-size: 23px;
			position: absolute;
			pointer-events: none;
			z-index: -1;
			display: block;
			top: 10px;
			right: 7px;
		}
	}

	.tm {
		line-height: 2;
		position: absolute;
		font-size: 12px;
		bottom: 0;
		left: 10px;
		right: 0;
		display: flex;
		justify-content: space-between;
		padding: 0 10px 9px;
	}

	.wc {
		color: rgba(127, 146, 161, 0.75);
		padding: 0 10px;
	}

	.a {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.e {
		transition: 0.3s ease-in-out;
		flex: 1;
	}

	.t {
		display: flex;
		align-items: center;
		align-content: normal;
		padding: 10px 8%;
		margin-top: 20px;
		@include s() {
			height: 62px;
			transition: 0.3s linear;
			width: 76%;
			margin: 0 auto 0 8%;
			border-bottom: 1px solid rgba(80, 100, 150, 0.3);
			padding: 0;
			transform: translate3d(0, 0, 0);
		}

		input {
			background: none;
			padding-right: 30px;
			margin: 0;
		}

		button {
			font-size: 30px;
			position: absolute;
			right: 20px;
			top: 50%;
			transform: translateY(-50%);
			@include s() {
				right: -16%;
			}
		}
	}

	button {
		border: none;
		width: 40px;
		height: 40px;
		color: var(--darkgrey);
		background: none;
		margin-left: 5px;
		cursor: pointer;

		&:hover {
			color: #c8d3ee;
		}
	}

	input {
		font-size: 40px;
		flex: 1;
		margin: 20px 20px 10px 0;
		padding: 0;
		border: 0;
		resize: none;
		color: #556175;
		outline: none;
		@include s() {
			font-size: 30px;
			line-height: 2;
		}
	}

	.fu {
		@media (max-width: 800px) {
			.t {
				margin-bottom: -62px;
				opacity: 0;
				pointer-events: none;
				transform: translate3d(0, -100%, 0);
			}
			.i-shrink {
				pointer-events: auto;
				opacity: 1;
				z-index: 10;
			}
			:global {
				.CodeMirror-scroll {
					padding-top: 10px;
				}
			}
		}
	}

	:global {
		.toolbar .i-view {
			display: none;
			@media (max-width: 800px) {
				display: inline-block;
			}
		}

		@include s() {
			.cm-editor {
				background: var(--bg6);
			}
		}
	}
</style>