<script>
	import { editPost, originPost } from '$lib/store';
	import { randNum, trim, delay } from '$lib/utils';

	// Props from both parent components
	let { change, done, a = $bindable('') } = $props();

	// Search states
	let searchValue = $state('');
	let isSearchOpen = $state(false);
	let filterCtx = $state({});

	// Search Debounce Logic
	const debouncedSearch = delay(change, 500);

	$effect(() => {
		const val = trim(searchValue);
		if (filterCtx.value !== val) {
			filterCtx.value = val;
			debouncedSearch(val, new Set(val));
		}
	});

	// Trigger Add Post
	function add() {
		const title = trim(a);
		if (title) {
			const _ = randNum();
			const o = { _, title_d: title, content_d: '' };
			originPost.set({ _ });
			editPost.set({ ...o });
			a = '';
			if(done) done();
		}
	}
</script>

<div class="wrapper">
	<div class="a add-layer">
		<input placeholder="start a new story..." bind:value={a} />
		<button class="icon i-pub" class:act={a} onclick={add} title="Publish"></button>
		<button class="icon i-search btn-search-trigger" onclick={() => isSearchOpen = true} title="Open Search"></button>
	</div>
	<div class="a search-layer" class:open={isSearchOpen}>
		<input bind:value={searchValue} placeholder="search stories..." />
		<button class="icon i-close" onclick={() => { isSearchOpen = false; searchValue = ''; }} title="Close search"></button>
	</div>
</div>

<style lang="scss">
  @use '../../break' as *;

  // Reset basic input styles globally within component
  input {
    border: none;
    outline: none;
    background: none;
    height: 40px;
    flex: 1;
    padding: 0 12px;
  }

  .wrapper {
    position: relative;
    width: 100%;
    margin: 4px 20px 16px;
    height: 40px; /* Keep container bound stable */
    @include s() {
      width: 80%;
    }
  }

  // Shared row frame rules
  .a {
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }

  // Bottom-line decoration logic
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

  // Base Add Post styles
  .add-layer {
		padding: 0 4px;
    background: rgb(51 61 85 / 0.29);
		border-radius: 100px;
    z-index: 1;
    input::placeholder { color: #666b71; }
    .btn-search-trigger {
      margin-left: 4px;
      border-radius: 0;
    }
  }

  // Overlay Search layer styles
  .search-layer {
    background: rgb(0 0 0 / 0.95); /* Darker backdrop to fully blind the lower layer */
    padding: 0 8px;
    z-index: 2;
    border-radius: 100px;
    // Hide state (collapsed to right)
    opacity: 0;
    pointer-events: none;
    transform: scaleX(0.8) translateX(20px);
    transform-origin: right center;

    input::placeholder { color: #3b5572; }

    // Showing state
    &.open {
      opacity: 1;
      pointer-events: auto;
      transform: scaleX(1) translateX(0);
    }
  }

  // Buttons
  .icon {
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.3s;
    width: 32px;
    height: 32px;
    background: transparent;
    color: #4b6c91;
    cursor: pointer;
    border: none;
    border-radius: 4px;
    &:hover { opacity: 0.8; }
  }

  .act {
    color: #fff;
  }
</style>
