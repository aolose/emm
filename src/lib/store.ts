import { writable, get, readable } from 'svelte/store';
import { Upload } from 'upload';
import Compressor from 'compressorjs';
import { randNum } from '$lib/utils';

const user = writable({
	token: 'test'
});

export const getProgress = (f: fileInfo) => {
	let b = 0;
	return readable(f.up, (set) => {
		const c = requestAnimationFrame(() => {
			const up = f.up;
			if (b !== up) {
				b = up;
				set(up);
			}
		});
		return () => {
			cancelAnimationFrame(c);
		};
	});
};

type fileInfo = {
	id: number;
	size: number;
	name: string;
	type: string;
	up: number;
	abort: () => void;
};
export const upFiles = writable([] as fileInfo[]);

export const filesUpload = (files: FileList) => {
	// todo
	for (const f of files) {
		const t = f.type;
		const o: fInfo = {
			name: f.name,
			file: f
		};
		if (t.startsWith('image/') && f.size > 1000) {
			new Compressor(f, {
				quality: 0.8,
				mimeType: 'image/webp',
				success(file: File | Blob) {
					o.file = file;
					up(o);
				},
				error() {
					up(o);
				}
			});
		} else up(o);
	}
};

type fInfo = {
	name: string;
	file: Blob;
};
const up = (info: fInfo) => {
	const token = get(user).token;
	if (!token) return;
	const f = new FormData();
	Object.entries(info).forEach(([k, v]) => f.set(k, v));
	const up = new Upload({
		url: '/api/up',
		form: f,
		headers: {
			auth: token
		}
	});
	const id = -randNum();
	const clean = () => {
		upFiles.update((u) => {
			return u.filter((u) => u.id !== id);
		});
	};
	const v = {
		id,
		name: info.name,
		type: info.file.type,
		size: info.file.size,
		up: 0,
		abort() {
			clean();
			up.abort();
		}
	};

	upFiles.update((u) => u.concat(v));
	up.on('progress', (p) => {
		p = p * 100;
		v.up = p;
		if (p === 100) clean();
	});
	up.upload().then((r) => {
		console.log(r);
	});
	return v;
};
