<script>
	import Msg from '$lib/components/typeMsg.svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { msg } from '$lib/store';

	export let d;
	onMount(() => {
		let stop;
		if (d) {
			const c = d.split(/\n+/).filter((a) => !!a);
			const l = c.length;
			if (l) {
				const m = (ls, i) => {
					if (stop) return;
					const s = ls[i++ % ls.length];
					msg.set(s);
					setTimeout(
						() => {
							if (stop) return;
							m(ls, i);
						},
						s.length * 240 + 1e3
					);
				};
				m(c, 0);
			}
		}
		return () => {
			msg.set('');
			stop = 1;
		};
	});
</script>

<div class="b" transition:fade|global={{ duration: 200 }}>
	<div class="h">
		<div class="mg">
			<Msg defaultText={'welcome to my blog!'} />
			<i />
		</div>
		<div class="m" />
		<div class="s" />
		<div class="y" />
	</div>
	<div class="w">
		<div />
	</div>
	<div class="l">
		<div class="f f0">
			<div class="v" />
			<div class="v1" />
		</div>
		<div class="f f1">
			<div class="v" />
			<div class="v1" />
		</div>
	</div>
</div>

<style lang="scss">
  .mg {
    color: #fff;
    text-shadow: var(--bg2) 0 0 2px;
    font-size: 24px;
    text-align: center;
    left: -100%;
    right: -100%;
    position: absolute;
    bottom: 180%;
  }

  i {
    opacity: 0.8;
    bottom: -36px;
    transform: rotate(-15deg) translateX(-14px) !important;
    left: 50%;
    position: absolute;
    width: 1px;
    background: #fff;
    height: 16px;
  }

  $s: 3s;
  @keyframes bb {
    60% {
      transform: translate3d(15%, 0, 0);
    }
    0%,
    100% {
      transform: translate3d(-15%, 0, 0);
    }
  }

  @keyframes h {
    0%,
    100% {
      transform: rotate(2deg);
    }
    50% {
      transform: rotate(-6deg);
    }
  }

  @keyframes w {
    0%,
    16%,
    32%,
    48%,
    63%,
    100% {
      transform: skew(12deg) rotate(2deg);
    }
    8%,
    24%,
    40%,
    56% {
      transform: skew(-1deg);
    }
  }

  @keyframes f {
    0%,
    100% {
      transform: rotate(-15deg);
    }
    70% {
      transform: rotate(-40deg);
    }
  }

  .b {
    max-width: 100px;
    animation: bb infinite $s both;
    width: 100%;
    padding-top: 100%;
    transform: rotate(-15deg);
    border-radius: 50%;
    box-shadow: rgba(255, 255, 255, 0.5) 0 0 3px 1px;

    * {
      transform: translate3d(0, 0, 0);
      color: #fff;
      position: absolute;
      min-width: 1px;
    }
  }

  $w: 5%;
  .h,
  .s {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: currentColor;
    border-radius: 50%;
  }

  .h {
    animation: both $s h infinite;
  }

  .m {
    left: 34%;
    top: 28%;
    transform-origin: right bottom;
    transform: skew(60deg) rotateZ(19deg);
    height: 20%;
    width: 20%;
    background: yellow;
  }

  .y {
    width: 6%;
    height: 6%;
    border-radius: 50%;
    background: #000;
    left: 16%;
    top: 24%;
  }

  .w {
    right: 0;
    width: 66%;
    height: 66%;
    top: 46%;
    transform-origin: right top;
    overflow: hidden;
    transform: skew(3deg);
    animation: w infinite $s;

    div {
      top: -0;
      right: -111%;
      width: 150%;
      height: 150%;
      background: linear-gradient(-15deg, #3d7aa5, #424d67 50%);
      transform-origin: right top;
      transform: rotate(45deg);
    }
  }

  .l {
    top: 99%;
    left: 41%;
    width: 12%;
    height: 34%;
  }

  .f {
    border-radius: 100px;
    opacity: 0.5;
    width: 10%;
    height: 100%;
    left: 0;
    background: currentColor;
    transform-origin: top center;
    animation: f infinite $s both;
  }

  .f1 {
    left: 100%;
  }

  .v,
  .v1 {
    border-radius: 100px;
    bottom: -8%;
    transform-origin: top center;
    width: 90%;
    height: 30%;
    background: inherit;
    transform: rotate(45deg);
  }

  .v1 {
    transform: rotate(-45deg);
  }
</style>
