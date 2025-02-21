<script>
	import { run } from 'svelte/legacy';

	import { editPost, originPost } from '$lib/store';
	import { randNum, trim } from '$lib/utils';
	let { done, a = $bindable('') } = $props();
	run(() => {
		a = trim(a, true);
	});

	function add() {
		if (a) {
			const _ = randNum();
			const o = {
				_,
				title_d: trim(a),
				content_d: ''
			};
			originPost.set({ _ });
			editPost.set({ ...o });
			a = '';
			done && done();
		}
	}
</script>

<div class="a">
	<input placeholder="start a new story..." bind:value={a} />
	<div class="l"></div>
	<button class="icon i-pub" class:act={a} onclick={add}></button>
</div>

<style lang="scss">
	@use '../../break' as *;
	input {
		border-radius: 0;
		background: none;
	}
	.a {
		width: 300px;
		display: flex;
		margin: 20px auto;
		border-bottom: 1px solid var(--darkgrey);
		@include s() {
			width: 80%;
		}
	}

	.l {
		position: absolute;
		bottom: 0;
		right: 50%;
		transition: 0.3s ease-in-out;
		transform: translateX(50%);
		height: 1px;
		background: #394f62;
		width: 0;
	}

	input {
		height: 40px;
		flex: 1;
		border: none;
		outline: none;

		&::placeholder {
			color: #4d6783;
		}

		&:focus + .l {
			width: 100%;
		}
	}

	.icon {
		color: #5e8cab;
		font-size: 16px;
		transition: 0.3s ease-in-out;
		cursor: pointer;
		width: 32px;
		height: 32px;
		margin-top: 4px;
		border-radius: 3px;
	}

	.act {
		background: #2881cc;
		color: #fff;
	}
</style>
