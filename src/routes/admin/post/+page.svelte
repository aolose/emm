<script>
	import Search from './search.svelte';
	import AddPost from './addPost.svelte';
	export let data;
	$: c = {};

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
						<h3>{p.title}</h3>
						<p>{p.desc}</p>
						<div>
							<label>create:<span>{d(p.create)}</span></label>
							<label>update:<span>{d(p.update)}</span></label>
							<label>save:<span>{d(p.update)}</span></label>
						</div>
					</div>
				{/each}
			</div>
			<div class="p" />
		</div>
		<div class="b" />
		<div class="c" />
	</div>
</div>

<style lang="scss">
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
		height: 60px;
	}

	.c {
		width: 800px;
	}

	.pi {
		direction: ltr;
		&:not(.act):hover {
			background: rgba(255, 255, 255, 0.03);
		}

		&.act {
			background: var(--bg2);
		}

		transition: 0.3s ease-in-out;

		h3 {
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
