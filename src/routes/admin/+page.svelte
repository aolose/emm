<script>
	import Search from '$lib/components/adminPost/search.svelte';
	import AddPost from '$lib/components/adminPost/add.svelte';
	import Pg from '$lib/components/pg.svelte';
	import Editor from '$lib/components/adminPost/editor.svelte';
	import PItem from '$lib/components/adminPost/pItem.svelte';
	import Setting from '$lib/components/adminPost/setting.svelte';
	import FileWin from '$lib/components/fileManager.svelte';
	import Viewer from '$lib/components/viewer.svelte';
	import { editPost, originPost, posts, setting, small } from '$lib/store';
	import { api } from '$lib/req';
	import { onMount } from 'svelte';
	import { trim, watch } from '$lib/utils';

	const getPost = api('posts');
	let pages = 1;
	let tmpMark = 1;
	let view = 0;
	let autoSave;
	function sel(p) {
		if (!p) {
			originPost.set({});
			editPost.set({});
			view = 0;
			return;
		}
		view = 1;
		const o = { ...p };
		if (!o.id) {
			o._ = tmpMark++;
		}
		if (!o.title_d) o.title_d = o.title;
		if (!o.content_d) o.content_d = o.content;
		originPost.set({ ...o });
		editPost.set({ ...o });
	}

	let sc = '';
	let ft = 1;
	const wc = watch(sc);
	const wt = watch(ft);

	function page(n = 1) {
		const o = { page: n, size: 10 };
		if (sc) {
			o.sc = sc;
			o.ft = ft;
		}
		getPost(o).then((p) => {
			const { total, items = [] } = p;
			if (items) posts.set(items);
			pages = total;
		});
	}

	function close() {
		sel();
	}

	function ch(val, f) {
		sc = trim(val);
		if (f.size) {
			let i = 0;
			if (f.has('title')) i += 1;
			if (f.has('content')) i += 2;
			ft = i;
		} else ft = 1;
	}

	onMount(() => {
		page();
		return () => {
			sel();
			setting.set(0);
		};
	});
	let sty;
	$: {
		sty = $small && `transform:translate3d(${((-view * 100) / 3).toFixed(4)}%,0,0)`;
		wc(() => {
			page(1);
		}, sc);
		wt(() => {
			if (sc) page(1);
		}, ft);
	}
</script>

<div class="x">
	<div class="m" style={sty}>
		<div class="a">
			<div class="h">
				<Search change={ch} />
				<AddPost done={() => (view = 1)} />
			</div>
			<div class="ls">
				{#each $posts as p (p._ || p.id)}
					<PItem {p} {sel} />
				{/each}
			</div>
			<div class="p">
				<Pg go={page} total={pages} />
			</div>
		</div>
		<div class="b">
			<Editor {close} bind:autoSave preview={() => (view = 2)} />
		</div>
		<div class="c">
			<Viewer preview={true} close={() => (view = 1)} />
		</div>
		<FileWin w={33.33333} />
		<Setting {autoSave} />
	</div>
</div>

<style lang="scss">
	@import '../../lib/break';

	.x {
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: var(--bg2);
	}

	.m {
		display: flex;
		height: 100%;
	}

	.a {
		width: 400px;
		background: var(--bg1);
		display: flex;
		flex-direction: column;
	}

	.b {
		max-width: 1000px;
		flex: 1;
	}

	.ls {
		direction: rtl;
		flex: 1;
		overflow: auto;
		overflow-x: hidden;
		width: 100%;

		&::-webkit-scrollbar-track {
			-webkit-box-shadow: inset var(--bg1) 0 0 10px;
		}

		&::-webkit-scrollbar-thumb {
			background-color: rgba(49, 62, 87, 0.75);
		}
	}

	.p {
		padding-top: 10px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.c {
		width: 800px;
	}

	@include s() {
		.m {
			transition: 0.3s ease-in-out;
			width: 300%;
			height: 100%;
		}
		.a,
		.b,
		.c {
			flex: 1;
			width: 33%;
			min-width: 0;
			max-width: none;
		}
		.pi {
			min-width: 0;
			max-width: 100%;
			width: 100%;
		}
	}
</style>
