<script>
	import { permission } from '$lib/enum';
	import { clipboard } from '$lib/use';
	import { time, watch } from '$lib/utils';
	import { goto } from '$app/navigation';

	export let d = {};
	export let view;
	export let inf;
	const { code, type, expire, times } = d;
	let k = 0;
	const w = watch(k);

	function cb() {
		k++;
	}

	let t;
	$: {
		w(() => {
			clearTimeout(t);
			if (k) t = setTimeout(() => (k = 0), 2e3);
		}, k);
	}

	function desc(t) {
		switch (t) {
			case permission.Read:
				return inf[2][1];
			case permission.Post:
				return inf[1][1];
			case permission.Admin:
				return inf[3][1];
		}
	}

	const ck = view ? () => 0 : clipboard;
</script>

<div class="tk" data-text={code} class:v={view} use:ck={cb}>
	<code>{code} </code>
	{#if !view}
		<div class="i" class:o={k}>{k ? 'copied' : 'click to copy'}</div>
	{/if}
	<div>
		<p>{desc(type)}</p>
		<span><b>expire</b>{expire ? time(expire) : 'never'}</span>
		<span><b>times</b>{times ? times : 'unlimited'}</span>
	</div>
</div>
<button class="icon i-sys" on:click={() => goto('/admin', { replaceState: true })} />

<style lang="scss">
  .i {
    text-align: center;
    font-size: 14px;
    top: -5px;
    transition: 0.3s;
  }

  .o {
    color: orange;
  }

  button {
    width: 90%;
    display: block;
    padding: 5px 10px;
    margin: 10px auto 0;
  }

  .tk {
    border: 2px dashed rgba(80, 100, 150, 0.5);
    padding: 10px 15px 15px;
    margin: 10px;
  }

  .v {
    border: 0;
    margin: 0;
    background: rgba(0, 0, 0, 0.2);

    div {
      margin: 0 auto;
      width: 180px;
    }
  }

  code {
    color: #b1837a;
    font-size: 28px;
    display: block;
    text-align: center;
    padding: 10px;
  }

  p {
    text-align: center;
    margin-bottom: 10px;
    color: #5278a8;
  }

  span {
    padding: 0 10px;
    display: flex;
    font-size: 13px;
  }

  b {
    font-weight: 200;
    display: block;
    flex: 1;
    padding-right: 10px;
  }

  .i-sys {
    position: fixed;
    bottom: 10px;
    right: 0;
    opacity: 0.2;
    width: auto;
  }
</style>
