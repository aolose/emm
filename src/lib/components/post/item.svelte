<script>
	import { bgColor } from '$lib/utils';

	export let p = {};
	export let path;
	const { banner, slug, title, desc, content, createAt } = p;
	const sty = banner ? `background-image:url(/res/_${banner})` : '';
	const tm = new Date(createAt);
	const y = tm.getFullYear();
	const m = tm.getMonth() + 1;
	const d = tm.getDate();
	const showY = new Date().getFullYear() !== y;
	let ds;
	$: {
		ds = (desc || content || '').substring(0, 60);
	}
</script>

<div class="s p" style={`background-color:${bgColor(createAt)}`}>
	<div class="x" style={sty} />
	<div class="t">
		{m}/{d}
		{#if showY} {y}{/if}
	</div>
	<a class="f" href={`/post${path}/${slug}`}>
		<div class="c" class:ex={!banner} />
		<h1>{title}</h1>
		<h1>{title}</h1>
		<div class="ss" />
		<p>{ds}...</p>
	</a>
</div>

<style lang="scss">
	@import '../../break';

	.x {
		transition: 2s ease-in-out;
		position: absolute;
		left: -3px;
		right: -3px;
		top: -3px;
		bottom: -3px;
		border-radius: 3px;
		background: url('../img/1.jpg') center no-repeat;
		background-size: cover;
		filter: grayscale(0.5) blur(3px);
		opacity: 0.3;
		@include s() {
			filter: grayscale(0.5) blur(2px);
		}
	}

	.p {
		overflow: hidden;
		border-radius: 3px;
		width: 300px;
		height: 240px;
		transition: 0.3s ease-in-out;
		z-index: 20;
		position: relative;
		padding: 20px;
		margin: 10px;
		@include s() {
			width: 95%;
			margin: 10px auto;
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
				filter: grayscale(0.1) blur(1px);
			}
		}
	}

	h1 {
		transform: translate3d(0, 0, 0);
		transition: 0.5s ease-in-out;
		font-size: 24px;
		text-shadow: rgba(0, 0, 0, 0.1) 1px 1px 3px;
		color: #ddd;
		font-weight: 100;
		position: absolute;
		left: 20px;
		right: 90px;
		top: 20px;
		word-break: break-all;
		& + h1 {
			opacity: 0;
			font-size: 30px;
			width: 80%;
			text-align: center;
			left: 50%;
			top: 50%;
			transform: translate3d(-50%, -50%, 0);
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
		word-break: break-all;
		white-space: normal;
		text-overflow: ellipsis;
		line-height: 1.5;
		margin-top: 3px;
		font-size: 15px;
		color: #fcfcfc;
		opacity: 0.5;
		font-weight: 100;
	}

	.t {
		top: 20px;
		right: 10px;
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
		background: linear-gradient(177deg, rgba(30, 48, 63, 0.2), rgba(6, 9, 25, 0.7));
	}
</style>
