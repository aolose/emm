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
				if (data) setMsg(`Please try again in ${data / 1e3} seconds.`);
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
				{#key ke}<i in:jump|global={{ y: -18, duration: 150 }}></i>{/key}
			</div>
			<div class="l">
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
			<a href="/">Back to home</a>
		</div>
	</div>
</div>

<style lang="scss">
	.l {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		padding: 36px 0 0 0;
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
		bottom: 150%;
		position: absolute;
		font-size: 20px;
	}

	.br {
		transform: translate3d(-50%, 0, 0);
		left: 50%;
		top: -75px;
		width: 80px;
		height: 80px;
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

	label {
		font-size: 15px;
		pointer-events: none;
	}

	a {
		position: absolute;
		bottom: -50px;
		color: var(--darkgrey-h);
		right: 50%;
		transform: translateX(50%);

		&:hover {
			color: #8db2e9;
		}
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
		backdrop-filter: blur(5px);
		background: rgba(20, 25, 35, 0.9);
	}

	.bx {
		border-radius: 16px;
		width: 300px;
		height: 290px;
		background: var(--bg0);
		box-shadow: rgba(0, 0, 0, 0.3) 0 20px 40px -10px;
	}

	.r {
		display: block;
		width: 80%;
		margin: 20px auto 30px;

		input {
			padding: 0 5px;
			background: none;
			height: 30px;
			width: 100%;
			border: 0;
			color: #d3dbe8;
			border-radius: 0;
			border-bottom: 1px solid #1d314a;
			transition: ease-in-out 0.3s;
		}
	}

	label {
		transition: 0.3s ease-in-out;
		position: absolute;
		left: 10px;
		top: 0;
		color: #497998;
	}

	input:focus + label,
	.a label {
		left: 3px;
		top: -20px;
		font-size: 13px;
	}

	button {
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 30px auto 0;
		cursor: pointer;
		transition: 0.3s ease-in-out;
		width: 80%;
		height: 40px;
		border-radius: 111px;
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
