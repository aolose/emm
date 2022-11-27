<script>
	import Search from './search.svelte';
	import AddPost from './addPost.svelte';
	import Pg from '$lib/components/pg.svelte';
	import Editor from './mdEditor.svelte';
	import FileWin from '$lib/components/fileManager.svelte';

	export let data;
	let c = {};

	function sel(p) {
		c = p;
	}

	function d(a) {
		return new Intl.DateTimeFormat('en-GB', {
			year: '2-digit',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(a));
	}

	function getPosts(n) {}
</script>

<div class="x">
	<div class="m">
		<div class="a">
			<div class="h">
				<Search />
				<AddPost />
			</div>
			<div class="ls">
				{#each data.p as p}
					<div class="pi" on:click={() => sel(p)} class:act={c.id === p.id}>
						<div class="v">
							{#if p.save > p.update}<span class="vd" title="draft">D</span>{/if}
							{#if p.publish}<span class="vp" title="published">P</span>{/if}
						</div>
						<h3>{p.title}</h3>
						<p>{p.desc}</p>
						<div>
							<label>create:<span>{d(p.create)}</span></label>
							<label>update:<span>{d(p.update)}</span></label>
							<label>save:<span>{d(p.save)}</span></label>
						</div>
					</div>
				{/each}
			</div>
			<div class="p">
				<Pg go={getPosts} />
			</div>
		</div>
		<div class="b">
			<Editor bind:post={c} />
		</div>
		<div class="c" />
		<FileWin />
	</div>
</div>

<style lang="scss">
	.v {
		position: absolute;
		right: 10%;
		top: 20px;
		display: flex;
		line-height: 1;

		span {
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 10px;
			width: 14px;
			height: 14px;
			margin-right: 5px;
			font-weight: 800;
			padding: 0 !important;
			opacity: 0.5;
			border: 1px solid currentColor;
		}
	}

	.vd {
		color: var(--blue);
	}

	.vp {
		color: var(--green-h);
	}

	.x {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.m {
		display: flex;
		height: 100%;
	}

	.a {
		width: 40%;
		max-width: 400px;
		background: var(--bg1);
		display: flex;
		flex-direction: column;
	}

	.b {
		width: 50%;
		max-width: 1000px;
		background: var(--bg2);
	}

	.ls {
		direction: rtl;
		position: relative;
		flex: 1;
		overflow: auto;

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

	.pi {
		position: relative;
		direction: ltr;

		&:not(.act):hover {
			background: var(--bg0);
		}

		&.act {
			background: var(--bg2);
		}

		transition: 0.3s ease-in-out;

		h3 {
			padding-right: 80px;
			line-height: 3;
			font-weight: 200;
		}

		padding: 10px 10%;

		p {
			opacity: 0.5;
			font-size: 12px;
		}

		div {
			padding: 10px 0;
			font-size: 12px;
			display: flex;
			justify-content: space-between;
			flex-wrap: wrap;
			line-height: 1.5;

			span {
				padding-left: 5px;
			}
		}
	}
</style>
