<script>
	import '@toast-ui/editor/dist/toastui-editor.css';
	import { browser } from '$app/environment';
	export let post = {};
	$: draft = post.draft || post.content || '';
	const options = {
		usageStatistics: false
	};

	if (browser)
		import('@toast-ui/editor').then((a) => {
			//todo
		});
</script>

<div class="a">
	<div class="t">
		<input bind:value={post.title} />
		<button class="icon i-publish" />
	</div>
	<div class="e">
		<div>
			{draft}
		</div>
	</div>
	<p />
</div>

<style lang="scss">
	.a {
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 0 8%;
	}

	.e {
		flex: 1;
	}

	p {
		height: 50px;
		background: red;
	}

	.t {
		display: flex;
		align-content: normal;
		min-height: 100px;
		border-bottom: 1px solid var(--darkgrey);
	}

	button {
		border: none;
		width: 40px;
		height: 40px;
		color: #fff;
		background: var(--darkgrey);
		margin-left: 5px;
	}

	input {
		font-size: 40px;
		line-height: 2;
		flex: 1;
		padding: 10px 20px;
		border: 0;
		resize: none;
		color: #556175;
		outline: none;
	}
</style>
