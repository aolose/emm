<script>
	import { jump } from '$lib/transition';
	import LD from '$lib/components/loading.svelte';
	import { fade } from 'svelte/transition';
	import Tm from '$lib/components/typeMsg.svelte';
	import { onDestroy } from 'svelte';
	import { req } from '$lib/req';
	import { enc, randNum } from '$lib/utils';
	import { msg, status } from '$lib/store';

	let wt = 0;
	let w = $state(0);
	let mf;
	let ftt = $state('');
	let usr = $state('');
	let ke = $state(1),
		bk = $state(0),
		br = $state();
	let ft = $state();
	let pwd = $state('');
	let iu = $state(),
		ip = $state();
	let dis = $derived(usr.length < 2 || pwd.length < 4 || pwd.length > 30 || usr.length > 20);
	const setMsg = (m) => {
		msg.set(m);
	};
	const t = setInterval(() => {
		if (wt > 0) {
			wt = wt - 1;
		}
	}, 1e3);
	onDestroy(() => clearInterval(t));

	async function login() {
		if (!usr || !pwd) return;
		w = 1;
		const v = randNum();
		const u = await enc((await enc(usr)) + v);
		const p = await enc((await enc(pwd)) + v);
		req('login', [u, p, v])
			.then(() => {
				status.set(1);
			})
			.catch(({ data }) => {
				if (typeof data === 'number' && data > 0)
					setMsg(`Please try again in ${data / 1e3} seconds.`);
				else setMsg('wrong user name or password');
			})
			.finally(() => {
				w = 0;
			});
	}

	function nx(e) {
		if (e.code === 'Enter') {
			if (this === iu) {
				ip.focus();
			} else {
				if (!dis) {
					login();
				}
			}
		}
	}

	function go() {
		ke = Math.random();
		const {
			offsetLeft: lf,
			offsetWidth: w0,
			offsetParent: { offsetWidth: w1 }
		} = br;
		mf = (120 * lf) / 220;
		const lft = +getComputedStyle(br).left.replace('px', '');
		const step = 20;
		if (!bk) {
			ft = lft - step;
			if (lf <= w0) bk = 1;
		} else {
			ft = lft + step;
			if (lf + w0 > w1) bk = 0;
		}
		ftt = `transform:translate3d(${mf}px,0,0)`;
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>
<div class="g" transition:fade|global>
	<div class="bg"></div>
	<div class="cc">
		<div class="bx">
			<LD act={w} />
			<div class="msg" style={ftt}>
				<Tm defaultText="Have a nice day !" />
			</div>
			<div class="br" style={`left:${ft}px`} class:bk bind:this={br}>
				{#if $msg}
					<div class="v"></div>
				{/if}
				{#key ke}<i in:jump|global={{ y: -12, duration: 120 }}></i>{/key}
			</div>
			<div class="l">
				<h1>
					LOGIN
					<a href="/">
						<i/>
						<i/>
					</a>
				</h1>
				<div class="r" class:a={usr}>
					<input oninput={go} bind:value={usr} bind:this={iu} onkeydown={nx} type="text" />
					<label>Username</label>
				</div>
				<form class="r" class:a={pwd} autocomplete="off">
					<input
						bind:value={pwd}
						bind:this={ip}
						onkeydown={nx}
						type="password"
						autocomplete="new-password"
						oninput={go}
					/>
					<label>Password</label>
				</form>
				<button class:dis onclick={login}>Login</button>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.l {
		display: flex;
		flex-direction: column;
		gap: 36px;
		position: absolute;
		inset:  24px;
	}

	.v {
		position: absolute;
		opacity: 0.8;
		transform: rotate(-50deg);
		background: white;
		height: 1px;
		width: 13px;
		border-radius: 3px;
		bottom: 102px;
		left: 50px;
	}

	.msg {
		transition: 0.3s ease-in-out;
		color: white;
		width: 200px;
		transform: translate3d(50px, 0, 0);
		text-align: center;
		bottom: 450px;
		position: absolute;
		font-size: 20px;
	}

	.br {
		transform: translate3d(-50%, 0, 0);
		left: 50%;
		top: -60px;
		width: 64px;
		height: 64px;
		position: absolute;
		transition: 0.1s ease-in-out;

		&.bk {
			transform: translate3d(-50%, 0, 0) rotateY(180deg);

			.v {
				left: 10px;
				transform: rotate(50deg);
			}
		}
	}

	.dis {
		opacity: 0.5;
		pointer-events: none;
	}

	.g,
	.bg {
		width: 100%;
		height: 100%;
		background: var(--bg3);
	}

	.bg {
		background: url('$lib/components/img/bg.jpg') bottom center;
		background-size: cover;
		position: absolute;
		top: 0;
		left: 0;
		opacity: 0.5;
	}

  .cc {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
    background: rgb(10 15 25 / 0.5);
  }

	label {
		font-size: 15px;
		pointer-events: none;
	}
  h1 {
		margin-bottom: 16px;
		width: 100%;
		z-index: 10;
    display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 14px;
	  color: #7d93ac;
		font-family: monospace;
		font-weight: 800;
		letter-spacing: 3px;
	}
	a {
		padding: 0;
    width: 12px;
    height: 12px;
		cursor: pointer;
		z-index: 999;
    transition: .2s ease-in-out;
    background-color: #f82c21;
    border-radius: 50%;
    display: flex;
		line-height: 1;
    align-items: center;
    justify-content: center;
    text-decoration: none;
		transform: scale(.8);
		i{
			position: absolute;
			width: 1px;
			height: 80%;
      background: transparent;
			display: block;
			left: 50%;
			top: 50%;
			translate: -50% -50%;
			transform: rotate(45deg);
			&+i{
				transform: rotate(-45deg);
			}
		}
		&:after{
			content: '';
			display: block;
			inset: -8px;
			position: absolute;
		}
    &:hover {
			transform: scale(1);
      background-color: #ff5f56;
			i{
				background: rgb(0 0 0 / 0.5);
			}
    }
    &:active {
      background-color: #bf433f;
    }
  }

	.bx {
		border-radius: 24px;
		width: 280px;
		height: 346px;
		border: 1px solid rgb(108 163 246 / 0.15);
		background: var(--bg7);
		box-shadow: rgba(0, 0, 0, 0.7) 0 4px 24px -4px,
		rgba(0, 0, 0, 0.4) 0 15px 60px;
	}

	.r {
		display: block;
		input {
			text-align: center;
			padding: 0 32px;
			background: var(--bg2);
			width: 100%;
			border: 1px solid rgb(108 163 246 / 0.03);
			color: #d3dbe8;
			border-radius: 50px;
			transition: ease-in-out 0.3s;
		}
	}

	label {
		font-family: monospace;
		font-weight: 200;
		text-transform: uppercase;
		transition:
            color 0.2s ease-in-out,
						transform 0.4s linear,
						left .6s .2s ease-in-out;
		position: absolute;
		left: 32px;
		top: 0;
		line-height: 1;
		pointer-events: none;
		display: flex;
		align-items: center;
		height: 100%;
		color: rgb(118 143 181 / 0.5);
	}
  input:focus {
		box-shadow: 0 0 0 1px rgb(96 172 236 / 0.9);
	}
	input:focus + label,
	.a label {
		left: 0;
		transform: translateY(-80%) scale(.8);
		font-size: 13px;
    color: rgb(141 174 223 / 0.4);
	}

	button {
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: 0.3s ease-in-out;
		height: 48px;
		border-radius: 48px;
		flex-shrink: 0;
		&:focus {
      box-shadow: 0 0 6px rgb(102 144 225 / 0.9);
		}
	}

	i {
		transform: translate3d(0, 0, 0);
		position: absolute;
		left: 0;
		bottom: 0;
		background: url('$lib/components/img/fav.png') center no-repeat;
		background-size: 100% auto;
		width: inherit;
		height: inherit;
	}
</style>
