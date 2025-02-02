<script>
	import Card from './Card.svelte';
	import { clientRestore } from '$lib/utils';

	let msg = $state(),
		err = $state(),
		act = $state(),
		ld = $state(),
		t;
	const m = (a, e) => {
		msg = a;
		err = e;
		act = 1;
		clearTimeout(t);
		t = setTimeout(() => (act = 0), 3e3);
	};

	const up = clientRestore(
		(a) => {
			if (a) m(a);
			ld = 0;
		},
		(a) => {
			m(a, 1);
			ld = 0;
		},
		() => (ld = 1)
	);

	const ex = () => {
		window.open('/api/backup');
	};
</script>

<Card {msg} {err} {act} {ld}>
	<div class="r">
		<button onclick={ex}>
			backup
			<span class="icon i-down"></span></button
		>
		<button>
			<input
				type="file"
				onchange={up}
				onclick={(e) => (e.target.value = '')}
				accept="application/zip"
			/>
			restore
			<span class="icon i-upload"></span>
		</button>
	</div>
</Card>

<style lang="scss">
  @use '../../../lib/break' as *;

  .r {
    padding: 0 20px 30px;
    display: flex;
    align-items: center;
    gap: 16px;
    justify-content: center;
  }

  input {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    width: auto;
    border: none;
    appearance: none;
    opacity: 0;
  }

  span {
    color: inherit;
  }

  button {
    flex: 1;
    color: #fff;
    justify-content: center;
    max-width: 200px;
    display: flex;
    align-items: center;
    opacity: .8;
    gap: 4px;
    font-size: 16px;
    height: 48px;
    filter: hue-rotate(-40deg);
    @include s() {
      height: 38px;
      font-size: 14px;
    }
    &:hover {
      opacity: 1;
    }
    & + button {
      filter: hue-rotate(40deg);
    }
  }
</style>
