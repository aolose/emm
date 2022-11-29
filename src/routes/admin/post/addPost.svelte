<script>
	import {selectFile} from "$lib/store";

	export let a = '';
	$: {
		a = a.replace(/^\s+|\s+$/, '');
	}
	function select(){
		selectFile(2).then(r=>{
			alert(r.join())
		})
	}
</script>

<div class="a">
	<input placeholder="write a new story..." bind:value={a} />
	<button class="icon i-add" class:act={a} on:click={select}></button>
</div>

<style lang="scss">
	.a {
		width: 300px;
		display: flex;
		margin: 20px auto;
	}

	input {
		height: 40px;
		flex: 1;
		border: none;
		background: rgba(0, 0, 0, 0.2);
		outline: none;
	}

	button {
		opacity: 0.9;
		transition: 0.2s;
		margin-left: 4px;
		border-radius: 4px;
		height: 40px;
		width: 40px;
		background: var(--darkgrey);
		color: #fff;
		cursor: pointer;
		&:hover {
			opacity: 1;
		}
	}
	.act {
		background: var(--blue);
	}
</style>
