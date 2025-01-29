<script lang="ts">
	import { stopPropagation } from 'svelte/legacy';

	import { confirm, selectFile } from '$lib/store';
	import { fade } from 'svelte/transition';
	import { diffObj, getErr } from '$lib/utils';
	import { req } from '$lib/req';
	import Pls from '$lib/components/post/rSelect.svelte';
	import List from '$lib/components/post/rList.svelte';
	import { onMount } from 'svelte';

	let { close, setTag = $bindable() } = $props();
	let ok = $state();
	let cancel = $state();
	let show = $state(false);
	let edit = $state();
	let opened = 0;

	function setPost() {
		opened = 1;
		edit(d._posts)
			.then((a) => {
				if (a !== undefined) d._posts = a;
			})
			.finally(() => (opened = 0));
	}

	let d = $state({});

	function sel() {
		selectFile(1, 'image/*').then((a) => {
			const id = a?.[0]?.id;
			if (id) d.banner = '' + id;
		});
	}

	onMount(() => {
		setTag = (a) => {
			if (!a) {
				show = false;
				return;
			}
			const n = { ...a };
			d = { ...a };
			show = !!a;
			if (opened) setPost();
			return new Promise((r) => {
				ok = () => {
					const o = n.id ? diffObj(n, d) : d;
					if (o && d.id === n.id) {
						o.id = d.id;
						req('tag', o)
							.then((c) => {
								if (c) Object.assign(d, c);
								r(d);
								close();
							})
							.catch((e) => confirm(getErr(e), '', 'ok'));
					}
				};
				cancel = () => {
					close();
					r();
				};
			}).finally(() => {
				show = false;
			});
		};
	});
</script>

{#if show}
	<div class="b" transition:fade|global>
		<div class="t">
			<button class="icon i-close" onclick={cancel}></button>
			<button class="s" onclick={ok}>save</button>
		</div>
		<div class="c">
			<div class="r">
				<span>name</span>
				<input bind:value={d.name} />
			</div>
			<div class="r">
				<span>desc</span>
				<div class="x">
					<p>{d.desc || ''}</p>
					<textarea bind:value={d.desc}></textarea>
				</div>
			</div>
			<div class="r">
				<span>banner</span>
				<div
					class="p icon"
					onclick={sel}
					class:i-pic={!d.banner}
					style:background-image={d.banner ? `url(/res/_${d.banner})` : ''}
				>
					{#if d.banner}
						<button onclick={stopPropagation(() => (d.banner = null))} class="icon i-close"
						></button>
					{/if}
				</div>
			</div>
			<div class="r">
				<span>posts</span>
				<Pls bind:items={d._posts} inline={1} />
				<button onclick={setPost} class="icon i-ed"></button>
			</div>
		</div>
		<List type={0} bind:select={edit} />
	</div>
{/if}

<style lang="scss">
  @use 'sass:color';

  @use '../../../lib/break' as *;

  .b {
    display: flex;
    flex-direction: column;
    flex: 1;
    max-width: 600px;
    height: 100%;
    background: var(--bg2);

    :global {
      .a {
        .t {
          height: 75px;
          @include s() {
            height: auto;
          }
        }
      }
    }
  }

  input,
  .x,
  textarea,
  .i-ed,
  .p {
    flex-grow: 1;
    border: 1px solid rgba(140, 181, 236, 0.1);
  }

  .x {
    max-height: 400px;

    p,
    textarea {
      padding: 0 10px;
      border: none;
      min-height: 34px;
      white-space: pre-wrap;
      word-break: break-all;
      width: 100%;
      font-size: 13px;
      line-height: 34px;
    }

    textarea {
      resize: none;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }

    p {
      padding-top: 34px;
      opacity: 0;
      pointer-events: none;
    }
  }

  .c {
    overflow-y: auto;
    padding-bottom: 20px;
    padding-top: 40px;
  }

  .p {
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    color: color.adjust(#fff, $alpha: -0.8);
    cursor: pointer;
    transition: 0.2s;
    background: center no-repeat;
    background-size: contain;

    &:hover {
      color: #6c7a93;
    }

    button {
      color: #6c7a93;
      position: absolute;
      top: 0;
      right: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: #ffffff;
      }
    }

    .i-close {
      text-shadow: #000 1px 1px;
    }
  }

  .t {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 75px;
    padding: 0 20px;
    border-bottom: 1px solid var(--bg1);

    .i-close {
      color: #485c6c;
      font-size: 20px;

      &:hover {
        color: #7987a2;
      }
    }
  }

  .s {
    cursor: pointer;
    border-radius: 100px;
    font-size: 16px;
    color: #485c6c;
    padding: 5px 20px;
    border: 1px solid currentColor;
    transition: 0.2s;

    &:hover {
      color: #7a91bb;
    }
  }

  .i-ed {
    flex-grow: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    border-left: 0;
    background: var(--bg2);
    color: #6c7a93;
    font-size: 18px;
    @include s() {
      width: 30px;
    }

    &:hover {
      background: var(--bg1);
    }
  }

  .r {
    display: flex;
    flex-wrap: wrap;
    padding: 10px 50px;

    span {
      line-height: 30px;
      width: 100px;
    }

    &:global {
      .v {
        min-height: 50px !important;
        padding: 10px !important;
      }
    }
  }
</style>
