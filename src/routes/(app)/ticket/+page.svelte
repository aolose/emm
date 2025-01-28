<script>
	import Canvas from '$lib/components/ctx.svelte';
	import UpDownScroll from '$lib/components/upDownScroll.svelte';
	import Ph from '$lib/components/post/hd.svelte';
	import { tick } from 'svelte';
	import { expand } from '$lib/store';
	import { clearGroup, req } from '$lib/req';
	import { getErr, watch, time } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import { slide } from 'svelte/transition';
	import Ticket from './ticket.svelte';
	import { permission } from '$lib/enum';
	import Post from './post.svelte';
	import Head from '$lib/components/Head.svelte';
	import { h, status } from '$lib/store';

	let a;
	let sc;
	export let data;
	let { admin, read, post } = data.d;
	let { share = [] } = data.d;
	let inf = [];

	async function scTop() {
		await tick();
		if (sc) {
			document.scrollingElement.scrollTop = 0;
			window.scrollTo(0, 0);
			sc.scrollTop = 0;
		}
	}

	let tm;
	let ld = 0;
	let code = '';
	let err = '';
	let e = 0;
	const we = watch(err);
	$: {
		inf = [
			[1, 'leave a comment'],
			[post, 'show secret posts', 1],
			[read, 'view backstage system', 2],
			[admin, 'full admin privileges', 2]
		];
		let s = 0;
		if (admin) s = 1;
		if (read) s = 2;
		status.set(s);
		we(() => {
			clearTimeout(tm);
			e = !!err;
			if (err) {
				tm = setTimeout(() => (e = 0), 2e3);
			}
		}, err);
	}

	function check() {
		if (ld) return;
		err = '';
		ld = 1;
		if (!code) return;
		req('ticket', code)
			.then((a) => {
				const idx = share.findIndex((o) => o.code === code);
				const tk = share[idx];
				if (tk.times > 0) tk.times--;
				if (tk.times === 0) share.slice(idx, 1);
				o = { code, ...a };
				s = 1;
				const expire = a.expire;
				const mx = (a = 0, b = -1) => (a === b ? a : a === -1 ? a : b === -1 ? b : a > b ? a : b);
				switch (a.type) {
					case permission.Admin:
						return (admin = mx(admin, expire));
					case permission.Read:
						return (read = mx(read, expire));
					case permission.Post:
						clearGroup('posts');
						return (post = mx(post, expire));
				}
				share = [...share];
				inf = [...inf];
			})
			.catch((e) => {
				err = getErr(e);
			})
			.finally(() => {
				ld = 0;
			});
	}

	let s = 0;
	let o = {};
	let idx;
</script>

<Head title={`${$h.title} - Ticket`} />
<UpDownScroll bind:down={a} />
<svelte:window on:sveltekit:navigation-end={scTop} />
<Canvas type={1} />
<div class="o" class:e={$expand} transition:fade|global>
	<Ph bind:shrink={a}>Ticket</Ph>
	<div class="j">
		<div class="i">
			<div class="v">
				<input bind:value={code} on:focus={(e) => e.target.select()} placeholder="enter code" />
				<button on:click={check}>Check</button>
			</div>
			<span class="er" class:act={e}>{err}</span>
			<h1>Permissions</h1>
			{#each inf as [act, t, c], index}
				<div class="r" class:act>
					<div class="icon" class:i-ok={act} />
					<span>{t}</span>
					{#if act && c}
						<buttin
							class="mr icon"
							on:click={() => (idx = idx === index ? -1 : index)}
							class:i-add={idx !== index}
							class:i-no={idx === index}
						/>
					{/if}
				</div>
				{#if act && idx === index}
					<div class="dt" transition:slide|global>
						{#if c === 2}
							<a href="/admin">visit backstage 👈</a>
							<span>expire: {act > 0 ? time(act) : 'never'}</span>
						{/if}
						{#if c === 1}
							{#key act}
								<Post />
							{/key}
						{/if}
					</div>
				{/if}
			{/each}
			{#if share && share.length}
				<h1>Free Tickets</h1>
				<div class="ts">
					{#each share as d}
						<Ticket {d} {inf} />
					{/each}
				</div>
			{/if}
		</div>
	</div>
	{#if s}
		<div class="p" transition:fade|global={{ duration: 500 }}>
			<div class="m">
				<p>You got a ticket</p>
				<Ticket d={o} {inf} view={1} />
				<button on:click={() => (s = 0)}>OK</button>
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
  @use '../../../lib/break.scss' as *;

  .p {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(3px);
  }

  .m {
    box-shadow: rgba(0, 0, 0, 0.2) 0 5px 20px -5px;
    background: var(--bg7);
    border-radius: 4px;
    width: 300px;
    padding: 20px 0;

    p {
      margin-bottom: 20px;
      text-align: center;
    }

    button {
      padding: 5px 0;
      width: 100px;
      display: block;
      margin: 20px auto 0;
      border: 1px solid rgba(80, 100, 150, 0.5);
    }
  }

  .ts {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    padding: 1px;
    margin: 20px 0;
  }

  .er {
    opacity: 0;
    background: rgba(190, 100, 150, 0.1);
    line-height: 2;
    padding: 5px 20px;
    border-radius: 4px;
    color: #c9a6a6;
    transition: 0.5s ease-in-out;

    &.act {
      opacity: 1;
    }
  }

  $r: 6px;
  .o {
    display: flex;
    flex-direction: column;
    transition: 0.3s ease-in-out;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;

    &.e {
      padding-top: 30px;
    }
  }

  .j {
    flex: 1;
    overflow: auto;
    @include s() {
      position: absolute;
      flex: none;
      top: 60px;
      left: 0;
      right: 0;
      padding-top: 70px;
      bottom: 0;
    }
  }

  .i {
    padding: 20px;
    width: 90%;
    margin: 0 auto;
    @include s() {
      width: 100%;
      padding: 10px 7%;
    }
  }

  h1 {
    color: #ddd;
    font-size: 30px;
    line-height: 2;
    font-weight: 200;
    margin-top: 40px;
  }

  input {
    flex-grow: 1;
    width: 0;
    height: 100%;
    text-align: center;
    font-size: 25px;
    letter-spacing: 3px;
    padding: 0 20px;
    border-radius: $r 0 0 $r;
  }

  .v {
    height: 60px;
    width: 400px;
    box-shadow: rgba(0, 0, 0, 0.1) 2px 10px -5px;
    margin: 30px 0 0;
    display: flex;
    align-items: center;

    button {
      text-transform: uppercase;
      font-size: 16px;
      color: #fff;
      background: var(--darkgrey-h);
      width: 120px;
      height: 100%;
      border-radius: 0 $r $r 0;
    }

    @include s() {
      width: 95%;
      margin: 30px auto 10px;
      height: 50px;
      input {
        font-size: 18px;
      }
      button {
        width: 30%;
        font-size: 14px;
      }
    }
  }

  .r {
    padding: 3px;
    display: flex;
    align-items: center;
    font-size: 20px;

    .icon {
      width: 20px;
      height: 20px;
      font-size: 18px;
      border: 1px solid;
      border-radius: 50%;
      margin-right: 10px;
    }

    .mr {
      cursor: pointer;
      opacity: 0.8;
      margin-left: 10px;
      color: #fff !important;
      border: none;

      &:hover {
        opacity: 1;
      }
    }

    * {
      color: var(--darkgrey-h);
    }

    &.act {
      .icon {
        color: green;
      }

      span {
        color: #2c7e38;
      }
    }
  }

  a {
    color: #ddd;

    &:hover {
      text-decoration: underline;
    }
  }

  .dt {
    padding: 5px 30px 20px;

    span {
      font-size: 13px;
      margin-left: 20px;
    }
  }
</style>
