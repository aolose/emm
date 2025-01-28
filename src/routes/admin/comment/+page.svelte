<script>
	import Select from '$lib/components/select.svelte';
	import { cmStatus, method } from '$lib/enum';
	import Item from './item.svelte';
	import Pg from '$lib/components/pg.svelte';
	import Ck from '$lib/components/check.svelte';
	import { onMount } from 'svelte';
	import { req } from '$lib/req';
	import Loading from '$lib/components/loading.svelte';
	import { getErr, watch } from '$lib/utils';
	import Detail from './detail.svelte';
	import { confirm, small } from '$lib/store';

	let view = 0;
	let sty = '';
	let status = -1;
	let total = 1;
	let page = 1;
	let allowCm = 0;
	let checkCm = 0;
	let cmWatch;
	let ld = 0;
	let sel;
	const cStatus = [
		[-1, 'All'],
		[cmStatus.Pending, 'Pending'],
		[cmStatus.Approve, 'Approve'],
		[cmStatus.Reject, 'Reject']
	];

	const ftWatch = watch(status);
	let ls = [];
	const filter = (id) => {
		if (id === 0) return (sel = 0);
		ls = ls.filter((a) => {
			if (id) return a.id !== id;
			return 1;
		});
	};

	function go(n = 1) {
		page = n;
		ld = 1;
		req('cmLs', { page, status }, { method: method.GET })
			.then(({ total: t, items }) => {
				total = t;
				ls = items;
			})
			.finally(() => {
				ld = 0;
			});
	}

	onMount(() => {
		req('alCm', undefined, { method: method.GET }).then((a) => {
			allowCm = +a[0];
			checkCm = +a[1];
			cmWatch = watch(allowCm, checkCm);
		});
		go();
	});
	$: {
		sty = $small && `transform:translate3d(${(-view * 100) / 2}%,0,0)`;
		ftWatch(() => {
			go();
		}, status);
		if (cmWatch)
			cmWatch(
				(cancel, _allowCm, _checkCm) => {
					req('alCm', '' + +allowCm + +checkCm).catch((e) => {
						cancel();
						confirm(getErr(e), '', 'ok');
						allowCm = _allowCm;
						checkCm = _checkCm;
					});
				},
				allowCm,
				checkCm
			);
	}
</script>

<div class="m">
	<div class="x" style={sty}>
		<div class="a">
			<div class="t">
				<h1>Comments</h1>
				<div class="b">
					<div>
						<span class="icon i-status" />
						<Select bind:value={status} items={cStatus} />
					</div>
				</div>
				<button class="icon i-refresh" on:click={() => go(page)} />
			</div>
			<div class="e">
				<div class="ls">
					<div>
						{#each ls as c}
							<div class="r">
								<Item
									d={c}
									ck={() => {
                    sel = c;
                    view = 1;
                  }}
								/>
							</div>
						{/each}
					</div>
				</div>
				<div class="p">
					<div>
						<Ck bind:value={allowCm} name="Allow comments" />
						<Ck bind:value={checkCm} name="Need review" />
					</div>
					<Pg {page} {total} {go} />
				</div>
				<Loading act={ld} />
			</div>
		</div>
		{#if sel}
			<Detail
				d={sel}
				{filter}
				close={() => {
          sel = view = 0;
        }}
			/>
		{/if}
	</div>
</div>

<style lang="scss">
  @use '../../../lib/break' as *;

  .m {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .x {
    width: 100%;
    height: 100%;
    background: var(--bg2);
    display: flex;
    transition: 0.3s ease-in-out;
    @include s() {
      width: 200%;
      .a {
        width: 50%;
      }
    }
  }

  .i-refresh {
    padding: 5px;
    margin-left: 20px;
  }

  .e {
    display: flex;
    flex-direction: column;
  }

  .ls,
  .e {
    flex-grow: 1;
  }

  .ls {
    & > div {
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;
      overflow: auto;
    }
  }

  .a {
    width: 400px;
    padding-bottom: 20px;
    display: flex;
    flex-direction: column;
    background: var(--bg1);
    height: 100%;
  }

  h1 {
    font-size: 18px;
    font-weight: 200;
    color: #54647a;
  }

  .t {
    height: 70px;
    padding: 0 25px;
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }

  .b {
    flex: 1;
    align-items: center;
    justify-content: flex-end;
    display: flex;
    flex-wrap: wrap;

    span {
      padding: 0 10px;
    }

    div {
      display: flex;
      height: 40px;
      align-items: center;
      flex-grow: 1;
      max-width: 150px;
    }
  }

  .p {
    border-top: 1px solid rgba(155, 155, 155, 0.05);
    display: flex;
    justify-content: space-between;
    padding: 10px 20px 0;
  }
</style>
