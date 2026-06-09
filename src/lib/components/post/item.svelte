<script>
	import { bgColor, clipWords, resUrl } from '$lib/utils';
	import { h } from '$lib/store';

	let { p = {}, path } = $props();
	const { banner, slug, title, desc, createAt } = p;
	const tm = new Date(createAt);
	const y = tm.getFullYear();
	const m = tm.getMonth() + 1;
	const d = tm.getDate();
	const showY = new Date().getFullYear() !== y;
	let ds = $derived(clipWords(desc, 60));
</script>

<div class="s p" style={`background-color:${bgColor(createAt, 0.6, 70)}`}>
	<div
		class="x"
		style={banner
			? `background-image:url(${p.bannerR2Synced ? resUrl($h.r2PublicDomain, p.bannerR2Key || banner, true, true) : `/res/_${banner}`})`
			: undefined}
	></div>
	<div class="t">
		{m}/{d}
		{#if showY}
			{y}{/if}
	</div>
	<a class="f" href={`/post${path}/${slug}`}>
		<div class="c" class:ex={!banner}></div>
		<h1>{title}</h1>
		<h1>{title}</h1>
		<div class="ss"></div>
		<p>{ds}...</p>
	</a>
</div>

<style lang="scss">
	@use '../../break' as *;

	.x {
		transition: 1.4s ease-in-out;
		position: absolute;
		inset: -3px;
		background: url('../img/1.jpg') center no-repeat;
		background-size: cover;
		filter: grayscale(0.5) blur(3px);
		opacity: 0.15;
		@include s() {
			filter: grayscale(0.5) blur(2px);
		}
	}

	.p {
		box-shadow: rgba(0, 0, 0, 0.7) 0 4px 16px -4px;
		overflow: hidden;
		border-radius: 32px;
		width: 300px;
		height: 240px;
		transition: 0.3s ease-in-out;
		z-index: 20;
		position: relative;
		padding: 24px;
		margin: 12px;
		@include s() {
			width: 100%;
			margin: 10px 0;
		}

		&:hover {
			h1 {
				opacity: 0;

				& + h1 {
					opacity: 1;
				}
			}

			p {
				opacity: 0;
			}

			.x {
				transform: scale(1.05);
				filter: grayscale(0.1) blur(0px);
				opacity: 0.3;
			}
		}
	}

	h1 {
		transform: translate3d(0, 0, 0);
		transition: 0.5s ease-in-out;
		font-size: 20px;
		text-shadow: rgba(0, 0, 0, 0.1) 1px 1px 3px;
		overflow: hidden;
		display: -webkit-box;
		line-clamp: 3;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		color: #ddd;
		font-weight: 100;
		position: absolute;
		left: 24px;
		right: 90px;
		top: 24px;

		& + h1 {
			opacity: 0;
			font-size: 24px;
			width: 80%;
			text-align: center;
			left: 50%;
			top: 50%;
			transform: translate3d(-50%, -50%, 0);
			line-clamp: 4;
			-webkit-line-clamp: 4;
		}
	}

	.ss {
		flex: 1;
	}

	p {
		transition: 0.5s ease-in-out;
		margin-bottom: 10px;
		display: flex;
		overflow: hidden;
		white-space: normal;
		overflow-wrap: break-word;
		text-overflow: ellipsis;
		line-height: 1.5;
		margin-top: 3px;
		font-size: 15px;
		color: #fcfcfc;
		opacity: 0.5;
		font-weight: 100;
	}

	.t {
		top: 28px;
		right: 20px;
		color: #fff;
		text-shadow: rgba(0, 0, 0, 0.39) 1px 1px 3px;
		font-size: 12px;
		padding: 0 10px;
		border-radius: 10px 10px 0 0;
		height: 20px;
		position: absolute;
		justify-content: flex-end;
		font-weight: 100;
		display: flex;
		align-items: center;
		opacity: 0.4;
	}

	.y {
		margin-bottom: 5px;
		font-size: 12px;
		color: #6a889b;
	}

	.f {
		transition: 0.3s ease-in-out;
		flex-direction: column;
		display: flex;
		text-decoration: none;
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		border-radius: inherit;
		padding: inherit;
	}
</style>
