<script>
	let { value = $bindable(), min = 0, time = 'mm:hh:ss' } = $props();
	const pad = {
		year: 4,
		month: 2,
		day: 2,
		hour: 2,
		minute: 2,
		second: 2
	};
	let year = 1970;
	let month = 0;
	let day = 0;
	let hour = 0;
	let minute = 0;
	let second = 0;
	let bfValue = -1;
	const ns = {};
	let tm = -1;
	const setValue = () => {
		Object.values(ns).forEach((n) => n.setValue());
		clearTimeout(tm);
		tm = setTimeout(() => {
			value = new Date(year, month, day, hour, minute, second).getTime();
		}, 30);
	};
	const readValue = () => {
		const d = new Date(value);
		const _y = d.getFullYear();
		const _m = d.getMonth();
		const _d = d.getDate();
		const _h = d.getHours();
		const _mi = d.getMinutes();
		const _s = d.getSeconds();
		if (_y !== year) year = _y;
		if (_m !== month) month = _m;
		if (_d !== day) day = _d;
		if (_h !== hour) hour = _h;
		if (_mi !== minute) minute = _mi;
		if (_s !== second) second = _s;
		if (!time) {
			hour = minute = second = 0;
		} else {
			time.split(':').forEach((a) => {
				if (a.startsWith('m')) {
					pad.minute = a.length;
				} else if (a.startsWith('h')) {
					pad.hour = a.length;
				} else if (a.startsWith('s')) {
					pad.second = a.length;
				}
			});
		}
		Object.values(ns).forEach((n) => n.getValue());
	};
	const num = (node, val) => {
		const fn = (node, val) => {
			const mx = pad[val];
			node.setValue = () => {
				let max = 9999;
				let min = 0;
				switch (val) {
					case 'year':
						max = 2999;
						min = 1970;
						break;
					case 'month':
						min = 1;
						max = 12;
						break;
					case 'day':
						min = 1;
						max = 31;
						break;
					case 'hour':
						max = 23;
						break;
					case 'minute':
						max = 59;
						break;
					case 'second':
						max = 59;
						break;
				}
				let va = +node.value || 0;
				if (va > max) va = max;
				else if (va < min) va = min;
				switch (val) {
					case 'year':
						year = va;
						break;
					case 'month':
						month = va - 1;
						break;
					case 'day':
						day = va;
						break;
					case 'hour':
						hour = va;
						break;
					case 'minute':
						minute = va;
						break;
					case 'second':
						second = va;
						break;
				}
			};
			node.getValue = () => {
				switch (val) {
					case 'year':
						node.value = `${year}`.padStart(mx, '0');
						break;
					case 'month':
						node.value = `${month + 1}`.padStart(mx, '0');
						break;
					case 'day':
						node.value = `${day}`.padStart(mx, '0');
						break;
					case 'hour':
						node.value = `${hour}`.padStart(mx, '0');
						break;
					case 'minute':
						node.value = `${minute}`.padStart(mx, '0');
						break;
					case 'second':
						node.value = `${second}`.padStart(mx, '0');
						break;
				}
			};
			node.oninput = node.onchange = () => {
				const { selectionStart, selectionEnd } = node;
				const v = node.value.replace(/[^0-9]/g, '');
				node.value = v;
				node.selectionStart = selectionStart;
				node.selectionEnd = selectionEnd;
			};
			node.onkeyup = (e) => {
				const code = e.code;
				const { selectionStart, selectionEnd } = node;
				node.value = node.value.slice(0, mx);
				node.selectionStart = selectionStart;
				node.selectionEnd = selectionEnd;
				if (selectionStart >= mx || /enter|tab/i.test(code)) {
					const nx = node.nextElementSibling?.nextElementSibling;
					if (nx && nx instanceof HTMLInputElement) {
						nx.focus();
						nx.selectionStart = nx.selectionEnd = 0;
					}
				}
				if (selectionStart === 0 && /Backspace/.test(code)) {
					const px = node.previousElementSibling?.previousElementSibling;
					if (px && px instanceof HTMLInputElement) {
						px.focus();
						px.selectionStart = px.selectionEnd = mx;
					}
				}
			};
			node.onblur = setValue;
			node.maxlength = mx;
			ns[val] = node;
			node.getValue();
		};
		fn(node, val);
		return {
			update: fn
		};
	};
	$effect(() => {
		if (!value) value = new Date(1970, 0, 1).getDate();
		if (min && value < min) value = min;
		if (bfValue !== value) {
			bfValue === value;
			readValue();
		}
	});
</script>

<div class="a">
	<input use:num={'year'} /><span>/</span>
	<input use:num={'month'} /><span>/</span>
	<input use:num={'day'} /><span></span>
	{#if time}
		<input use:num={'hour'} /><span>:</span>
		<input use:num={'minute'} /><span>:</span>
		<input use:num={'second'} />
	{/if}
</div>

<style lang="scss">
	.a {
		flex-grow: 1;
		display: flex;
		align-items: center;
	}

	span {
		padding: 0 2px;
	}

	input {
		flex-grow: 1;
		font-size: 13px;
		text-align: center;
		padding: 0 6px;
		width: 28px;
		border: 1px solid rgba(140, 181, 236, 0.1);
		background: var(--bg3);
		height: 40px;

		&:first-child {
			width: 45px;
		}
	}
</style>
