<script>
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
		setting
	} from '$lib/store';
	import { api, req } from '$lib/req';
	import { diffObj, getErr, watch, time } from '$lib/utils';
	import { get } from 'svelte/store';
	import { fade } from 'svelte/transition';
	import { method } from '$lib/enum';
	import { applyStrPatch } from '$lib/setStrPatchFn';

	export let close;
	let title = '';
	let draft = '';
	let cid = 0;
	export let preview;
	export let visitor;
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
			editPost.update((p) => {
				confirm('replace draft with latest published post?').then((a) => {
					if (!a) return;
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
				req('post', new Uint8Array([cid]), { method: method.DELETE })
					.then((a) => {
						if (a) {
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
			preview && preview();
		},
		className: 'icon i-view',
		title: 'preview'
	};
	let tools = [];
	$: {
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
	}
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
		return editPost.subscribe((p) => {
			draft = p.content_d || '';
			title = p.title_d || '';
			const { id, save, published, modify, title: _title, content } = p;
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
			if(id)t.push(tUser)
			if (hasDraft) t.push(tPub);
			if (id) t.push(tDel);
			t.push(tView);
			t.push(tFull);
			if (tools.join() !== t.join()) {
				tools = t;
			}
			autoSave(p);
		});
	});
</script>

{#if $editPost._ || $editPost.id}
	<div class="a" class:fu={$full} transition:fade>
		<div class="t">
			<input bind:value={title} />
			<button class="icon i-close" on:click={close} />
		</div>
		<div class="e">
			<button on:click={() => full.set(0)} class="icon i-shrink" />
			{#key $editPost._ || $editPost.id}
				<Editor bind:value={draft} toolbar={tools} />
				{#if $editPost.save}
					<span class="tm">save at {time($editPost.save).slice(9)}</span>
				{/if}
			{/key}
		</div>
	</div>
{/if}

<style lang="scss">
	@import '../../break';
	@import url(./font/fas.css);
	:global {
		.editor-toolbar .icon.i-full {
			display: none;
			@include s() {
				display: inline;
			}
		}
	}
	.i-shrink {
		display: none;
		@include s() {
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
		left: 30px;
		padding: 0 10px 9px;
	}
	.a {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg2);
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
		@include s() {
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
		.editor-toolbar .i-view {
			display: none;
			@include s() {
				display: inline-block;
			}
		}

		@include s() {
			.EasyMDEContainer .CodeMirror {
				background: rgba(50, 80, 90, 0.07);
			}
		}
	}
</style>
