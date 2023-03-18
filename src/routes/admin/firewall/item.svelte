<script>
	import { str2Hds, time } from '$lib/utils';

	export let data = [];
	const [tm, ip, ph, hds, st, ct, mk, mt] = data;
	export let sel;
	export let ck;

	let exp = 0;
	$: hd = str2Hds(hds).filter(([a]) => (exp ? 1 : /^user-agent$/gi.test(a)));

	function col(n, s) {
		if (n < 300) return 0 === s;
		if (n >= 500) return 3 === s;
		if (n >= 400) return 2 === s;
		return 1 === s;
	}
</script>

<div class="r" class:act={sel.has(tm + ip)} on:click={ck(tm + ip)}>
	<div class="r0"><span>{time(tm)}</span></div>
	<div class="r1"><span>{ip}</span></div>
	<div class="r6"><span title={mt}>{(mt || '').toUpperCase()}</span></div>
	{#if st}
		<div class="r3">
			<span class:c0={col(st, 0)} class:c1={col(st, 1)} class:c2={col(st, 2)} class:c3={col(st, 3)}
				>{st}</span
			>
		</div>
	{/if}
	<div class="r2"><span title={ph}>{ph}</span></div>
	<div class="r6"><span title={ct}>{ct}</span></div>
	<div class="r4"><span>{mk || ''}</span></div>
	<div class="r5">
		<button
			class="icon"
			on:click|stopPropagation={() => (exp = 1 - exp)}
			class:i-add={!exp}
			class:i-no={exp}
		/>
		{#each hd as [k, v]}
			<div class="h">
				<span>{k}:</span>
				<span>{v}</span>
			</div>
		{/each}
	</div>
</div>

<style lang="scss">
	@import '../../../lib/break';

	.r {
		transition: 0.3s ease-in-out;
		background: var(--bg1);
		flex-wrap: wrap;
		display: flex;
		font-size: 13px;
		border-radius: 5px;
		@include s() {
			padding: 10px;
		}

		span {
			padding: 0 10px;
			transition: 0.3s ease-in-out;
			color: #72849b;
		}

		div {
			flex-grow: 1;
			transition: 0.3s ease-in-out;
			padding: 7px 10px 0;
			white-space: normal;
			word-break: break-all;
			height: 100%;
			min-height: 35px;
			align-self: center;
			@include s() {
				padding: 0;
			}
		}

		&:not(.act):hover {
			background: #233146;

			.r5 {
				span {
					color: #95a3c9;
				}
			}
		}

		.c0 {
			color: #13ad13;
		}

		.c1 {
			color: #b6a963;
		}

		.c2 {
			color: #e06914;
		}

		.c3 {
			color: #d33232;
		}
	}

	.r0 {
		width: 127px;

		span {
			font-size: 12px;
			color: #717d8c;
			white-space: nowrap;
		}
	}

	.r1 {
		width: 120px;
	}

	.r2 {
		width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		span {
			white-space: nowrap;
			color: #72849b;
		}
	}

	.r3 {
		width: 80px;
	}

	.r4 {
		flex-grow: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.r6 {
		overflow: hidden;
		text-overflow: ellipsis;
		width: 50px;
		span {
			white-space: nowrap;
		}
	}

	.r5 {
		background: var(--bg2);
		width: 100%;

		button {
			position: absolute;
			left: 10px;
			padding: 7px 10px;
			@include s() {
				left: 3px;
			}
			&:hover {
				color: #fff;
			}
		}

		span {
			padding: 0;
			color: #6c8598;
			opacity: 0.7;

			& + span {
				font-weight: 200;
				opacity: 1;
				padding-left: 10px;
			}
		}
	}

	.r {
		.r5 {
			@include s() {
				margin: -10px;
			}
			padding: 5px 10px 12px 35px;

			div {
				min-height: 0;
				line-height: 1.5;
			}
		}
	}

	.act {
		z-index: 90;
		background: #294272;

		span {
			color: #a8bfe5;
		}

		.r5 {
			background: #0e182c;

			span {
				color: #d4e3f5;
			}
		}
	}
</style>
