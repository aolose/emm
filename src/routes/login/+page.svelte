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
	let w = 0;

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

	let dis;
	let ke = 1,
		bk = 0,
		br;
	let ft;
	let mf;
	let ftt = '';
	let usr = '';
	let pwd = '';
	let iu, ip;
	$: {
		dis = usr.length < 2 || pwd.length < 4 || pwd.length > 30 || usr.length > 20;
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

<div class="g" transition:fade>
	<div class="bg" />
	<div class="cc">
		<div class="bx">
			<LD act={w} />
			<div class="msg" style={ftt}>
				<Tm defaultText="Have a nice day !" />
			</div>
			<div class="br" style={`left:${ft}px`} class:bk bind:this={br}>
				{#if $msg}
					<div class="v" />
				{/if}
				{#key ke}<i in:jump={{ y: -18, duration: 150 }} />{/key}
			</div>
			<div class="l">
				<div class="r" class:a={usr}>
					<input on:input={go} bind:value={usr} bind:this={iu} on:keydown={nx} type="text" />
					<label>Username</label>
				</div>
				<form class="r" class:a={pwd} autocomplete="off">
					<input
						bind:value={pwd}
						bind:this={ip}
						on:keydown={nx}
						type="password"
						autocomplete="new-password"
						on:input={go}
					/>
					<label>Password</label>
				</form>
				<button class:dis on:click={login}>Login</button>
			</div>
			<a href="/">{'<  '}Home</a>
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
		padding: inherit;
	}

	.ti {
		top: 50%;
		left: 0;
		right: 0;
		transform: translate3d(0, -50%, 0);
		position: absolute;
		color: #5d6879;
		white-space: pre-wrap;
		font-size: 16px;
		text-align: center;
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

		&.bk {
			transform: translate3d(-50%, 0, 0) rotateY(180deg);

			.v {
				left: 10px;
				transform: rotate(50deg);
			}
		}

		width: 80px;
		height: 80px;
		position: absolute;
		transition: 0.1s ease-in-out;
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
		bottom: -40px;
		color: var(--darkgrey-h);
		text-decoration: none;
		left: 15px;

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
		padding: 30px;
		width: 340px;
		height: 260px;
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
			border-bottom: 1px solid #1d314a;
			transition: ease-in-out 0.3s;

			&:focus {
				border-color: #1c93ff;
			}
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
		border: 1px solid currentColor;
		color: #67a2d2;
		width: 80%;
		height: 40px;
		border-radius: 3px;

		&:hover {
			color: #000;
			background: #67a2d2;
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
