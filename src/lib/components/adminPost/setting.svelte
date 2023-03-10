<script>
	import CheckBox from '$lib/components/check.svelte';
	import Tags from '$lib/components/tags.svelte';
	import { onMount } from 'svelte';
	import { editPost, saveNow, selectFile, setting, patchedTag } from '$lib/store';
	import { fade } from 'svelte/transition';
	import { api } from '$lib/req';
	import { get } from 'svelte/store';
	import List from '$lib/components/post/rList.svelte';
	import Sel from '$lib/components/post/rSelect.svelte';
	import { permission } from '$lib/enum';

	let setPms;
	let post = {};
	export let autoSave;
	const getSlug = api('slug');
	let slugInfo = '';
	let t = -1;
	const checkSlug = () => {
		clearTimeout(t);
		slugInfo = 'checking...';
		const slug = post.slug;
		if (slug)
			getSlug([post.id || '', post.slug].join()).then((s) => {
				if (get(setting) && post.slug === slug) {
					if (s) {
						t = setTimeout(() => (slugInfo = ''), 5e3);
						slugInfo = 'slug auto modified!';
						post.slug = s;
					} else {
						slugInfo = '';
					}
				}
			});
	};
	const pickPic = () => {
		setting.set(0);
		selectFile(1, 'image/*')
			.then((a) => {
				post = { ...post, banner: a[0].id + '' };
			})
			.finally(() => setting.set(1));
	};

	const selReq = () => {
		setPms(post._reqs).then((a) => {
			if (a) post._reqs = a;
		});
	};

	const rmPic = () => {
		post.banner = null;
		post = { ...post };
	};
	const ok = () => {
		saveNow.set(1);
		autoSave({ ...get(editPost), ...post }).then((a) => {
			if (a) setting.set(0);
		});
	};
	const cancel = () => {
		setting.set(0);
	};

	onMount(() => {
		const f0 = editPost.subscribe((p) => (post = { ...p }));
		return () => {
			f0();
		};
	});
</script>

{#if $setting}
	<div class="m" transition:fade>
		<div class="a">
			<div class="h">
				<button class="icon i-ok" on:click={ok}>
					<span>save</span>
				</button>
				<span>Setting</span>
				<button class="icon i-close" on:click={cancel}>
					<span>cancel</span>
				</button>
			</div>
			<div class="f">
				<div class="r">
					<h3>Slug<span>{slugInfo}</span></h3>
					<input bind:value={post.slug} on:blur={checkSlug} />
				</div>
				<div class="r">
					<h3>Description</h3>
					<textarea bind:value={post.desc} />
				</div>
				<div class="r">
					<h3>Banner</h3>
					<div
						class:act={post.banner}
						style:background-image={post.banner ? `url(/res/_${post.banner})` : ''}
						class="p icon i-pic"
						on:click={pickPic}
					>
						{#if post.banner}
							<button on:click|stopPropagation={rmPic} class="icon i-close" transition:fade />
						{/if}
					</div>
				</div>
				<div class="r">
					<h3>Tags</h3>
					<div class="t">
						<Tags tags={$patchedTag.tags} bind:value={post._tag} />
					</div>
				</div>
				<div class="r">
					<h3>Tokens</h3>
					<div class="n">
						<Sel bind:items={post._reqs} inline={1} />
						<button on:click={selReq} class="icon i-ed" />
					</div>
				</div>
				<div class="r">
					<CheckBox name="allow comment" bind:value={post.disCm} revert={1} />
				</div>
			</div>
			<List type={1} permission={permission.Post} bind:select={setPms} />
		</div>
	</div>
{/if}

<style lang="scss">
	.m {
		z-index: 5;
		position: fixed;
		top: 0;
		bottom: 0;
		right: 0;
		left: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(1px);
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.f {
		flex: 1;
		overflow: auto;
		overflow-x: hidden;
		padding-bottom: 30px;

		&::-webkit-scrollbar-track {
			background: var(--bg2);
			box-shadow: none;
		}

		&::-webkit-scrollbar-thumb {
			background: #232d3a;
		}
	}

	.a {
		display: flex;
		flex-direction: column;
		max-height: 90%;
		background: var(--bg1);
		width: 400px;
		box-shadow: rgba(0, 0, 0, 0.2) 0px 3px 10px;
	}

	.h {
		span {
			color: #6c7a93;
		}

		padding: 20px;
		display: flex;
		justify-content: space-between;
		border-bottom: 1px solid var(--bg0);
	}

	button {
		background: none;
		color: #3a596b;
		font-size: 20px;
		display: flex;
		line-height: 1;
		border: none;
		cursor: pointer;
		transition: 0.3s ease-in-out;
		width: 80px;

		span {
			font-size: 18px;
			display: block;
			color: inherit !important;
		}

		&:hover {
			color: #fff;
		}
	}

	.i-close {
		justify-content: flex-end;
	}

	.r {
		padding: 20px;

		:global {
			.v {
				background: var(--bg2) center no-repeat;
				width: 100%;
				outline: none;
				padding: 10px !important;
				box-shadow: inset 0 0 3px rgb(0 0 0 / 20%);
				border-radius: 3px;
				border: none !important;
				min-height: 50px !important;
			}
		}
	}

	.n {
		min-height: 50px;
		display: flex;
		width: 100%;
		margin-top: 20px;

		button {
			width: 40px;
			background: var(--bg3);
			border-left: 1px solid var(--bg1);
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}

	h3 {
		color: #545e72;
		font-weight: 200;
		font-size: 13px;
		align-items: center;
		line-height: 2;
		display: flex;

		span {
			flex: 1;
			text-align: right;
			color: #566279;
		}
	}

	input,
	textarea,
	.p,
	.t {
		display: block;
		margin-top: 20px;
		border: none;
		background: var(--bg2) center no-repeat;
		width: 100%;
		outline: none;
		padding: 10px;
		box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.2);
		border-radius: 3px;
		resize: none;
	}

	.p {
		cursor: pointer;
		height: 200px;
		color: var(--darkgrey);
		font-size: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		background-size: cover;

		button {
			position: absolute;
			top: 0;
			right: 0;
			z-index: 2;
			display: flex;
			align-items: center;
			justify-content: center;
			text-shadow: #fff 0 0 2px;
			font-weight: 600;
			width: 40px;
			height: 40px;

			&:hover {
				text-shadow: #000 0 0 2px;
			}
		}
	}

	.act {
		color: transparent;
	}
</style>
