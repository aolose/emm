import { describe, it, expect } from 'bun:test';

/**
 * End-to-end test: simulate blogExp → HTTP transfer → restore/unZip
 * complete roundtrip, now with gzip-compressed database (d.gz).
 */
describe('Blog backup — full roundtrip test (d.gz gzip)', () => {
	it('Bun.Archive generated format detection', async () => {
		const entries: Record<string, string | Uint8Array> = {
			'.dbCfg': 'hello',
			'd.gz': Bun.gzipSync(new Uint8Array([1, 2, 3, 4, 5]))
		};
		const archive = new Bun.Archive(entries);
		const bytes = await archive.bytes();

		console.log(
			'First 16 bytes:',
			[...bytes.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join(' ')
		);
		console.log('Total size:', bytes.length);

		// Verify can be re-parsed
		const restored = new Bun.Archive(bytes);
		const filesMap = await restored.files();
		expect(filesMap.size).toBe(2);
		expect(await filesMap.get('.dbCfg')!.text()).toBe('hello');
	});

	it('d.gz gzip roundtrip: compress → archive → extract → decompress', async () => {
		const original = new Uint8Array([0x53, 0x51, 0x4c, 0x69, 0x74, 0x65]);
		const entries: Record<string, string | Uint8Array> = {
			'.dbCfg': '/path/to/db.sqlite',
			'd.gz': Bun.gzipSync(original),
			'u/photo.jpg': new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
			't/thumb.jpg': new Uint8Array([0x89, 0x50, 0x4e, 0x47])
		};
		const archive = new Bun.Archive(entries);
		const bytes = await archive.bytes();

		// Simulate HTTP transfer: ArrayBuffer → Uint8Array
		const transmitted = new Uint8Array(bytes.buffer.slice(0));
		expect(transmitted.length).toBe(bytes.length);

		// Extract
		const restored = new Bun.Archive(transmitted);
		const filesMap = await restored.files();

		expect(filesMap instanceof Map).toBe(true);
		expect(filesMap.size).toBe(4);

		// Verify all files
		const dbCfg = filesMap.get('.dbCfg');
		expect(dbCfg).toBeDefined();
		expect(await dbCfg!.text()).toBe('/path/to/db.sqlite');

		// d.gz: decompress and verify
		const dbGz = filesMap.get('d.gz');
		expect(dbGz).toBeDefined();
		const compressed = new Uint8Array(await dbGz!.arrayBuffer());
		const decompressed = Bun.gunzipSync(
			compressed as Uint8Array<ArrayBuffer>
		) as unknown as Uint8Array;
		expect(decompressed.length).toBe(6);
		expect([...decompressed]).toEqual([...original]);

		// Images are NOT compressed — byte-for-byte identical
		const photo = filesMap.get('u/photo.jpg');
		expect(photo).toBeDefined();
		const photoBuf = new Uint8Array(await photo!.arrayBuffer());
		expect(photoBuf[0]).toBe(0xff);
		expect(photoBuf[1]).toBe(0xd8);

		const thumb = filesMap.get('t/thumb.jpg');
		expect(thumb).toBeDefined();
		const thumbBuf = new Uint8Array(await thumb!.arrayBuffer());
		expect(thumbBuf[0]).toBe(0x89);
	});

	it('simulate unZip Entry read interface (d.gz)', async () => {
		const entries: Record<string, string | Uint8Array> = {
			'.dbCfg': 'hello',
			'd.gz': Bun.gzipSync(new Uint8Array([1, 2, 3]))
		};
		const archive = new Bun.Archive(entries);
		const bytes = await archive.bytes();

		const restored = new Bun.Archive(bytes);
		const filesMap = await restored.files();

		type Entry = { filename: string; read: () => Promise<Uint8Array> };
		const files: Entry[] = [];
		for (const [filename, file] of filesMap) {
			files.push({
				filename,
				read: async () => new Uint8Array(await file.arrayBuffer())
			});
		}

		expect(files.length).toBe(2);

		const dbCfg = files.find((a) => a.filename === '.dbCfg');
		expect(dbCfg).toBeDefined();
		const cfgBytes = await dbCfg!.read();
		expect(new TextDecoder().decode(cfgBytes)).toBe('hello');

		const dbGz = files.find((a) => a.filename === 'd.gz');
		expect(dbGz).toBeDefined();
		const dbCompressed = await dbGz!.read();
		const dbBytes = Bun.gunzipSync(
			dbCompressed as Uint8Array<ArrayBuffer>
		) as unknown as Uint8Array;
		expect([...dbBytes]).toEqual([1, 2, 3]);
	});

	it('empty entries roundtrip', async () => {
		const archive = new Bun.Archive({});
		const bytes = await archive.bytes();
		expect(bytes.length).toBeGreaterThan(0);

		const restored = new Bun.Archive(bytes);
		const filesMap = await restored.files();
		expect(filesMap.size).toBe(0);
	});

	it('large file roundtrip (>1KB) with d.gz', async () => {
		const largeData = new Uint8Array(4096);
		for (let i = 0; i < largeData.length; i++) {
			largeData[i] = i & 0xff;
		}

		const entries: Record<string, string | Uint8Array> = {
			'.dbCfg': 'db_path_' + 'x'.repeat(200),
			'd.gz': Bun.gzipSync(largeData)
		};
		const archive = new Bun.Archive(entries);
		const bytes = await archive.bytes();

		const restored = new Bun.Archive(bytes);
		const filesMap = await restored.files();
		expect(filesMap.size).toBe(2);

		const dbGz = filesMap.get('d.gz');
		expect(dbGz).toBeDefined();
		const compressed = new Uint8Array(await dbGz!.arrayBuffer());
		const dbRestored = Bun.gunzipSync(
			compressed as Uint8Array<ArrayBuffer>
		) as unknown as Uint8Array;
		expect(dbRestored.length).toBe(4096);
		expect(dbRestored[0]).toBe(0);
		expect(dbRestored[4095]).toBe(0xff);
	});

	it('Chinese filename roundtrip', async () => {
		const entries: Record<string, string | Uint8Array> = {
			'file name with spaces.txt': 'hello',
			'中文文件名.txt': '你好'
		};
		const archive = new Bun.Archive(entries);
		const bytes = await archive.bytes();

		const restored = new Bun.Archive(bytes);
		const filesMap = await restored.files();

		expect(filesMap.has('file name with spaces.txt')).toBe(true);
		expect(await filesMap.get('file name with spaces.txt')!.text()).toBe('hello');
	});

	it('real bun:sqlite serialize() → gzip → d.gz roundtrip', async () => {
		const { Database } = await import('bun:sqlite');
		const tmpDb = new Database(':memory:');
		tmpDb.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
		tmpDb.run('INSERT INTO test VALUES (1, ?)', ['hello']);
		tmpDb.run('INSERT INTO test VALUES (2, ?)', ['world']);
		const serialized = tmpDb.serialize();
		tmpDb.close();

		const entries: Record<string, string | Uint8Array> = {
			'.dbCfg': '/tmp/test.db',
			'd.gz': Bun.gzipSync(new Uint8Array(serialized))
		};
		const archive = new Bun.Archive(entries);
		const bytes = await archive.bytes();

		const restored = new Bun.Archive(bytes);
		const filesMap = await restored.files();
		expect(filesMap.size).toBe(2);

		// d.gz → decompress → must equal original serialized data
		const dGz = filesMap.get('d.gz');
		expect(dGz).toBeDefined();
		const compressed = new Uint8Array(await dGz!.arrayBuffer());
		const decompressed = Bun.gunzipSync(
			compressed as Uint8Array<ArrayBuffer>
		) as unknown as Uint8Array;
		expect(decompressed.length).toBe(serialized.length);
		expect([...decompressed]).toEqual([...serialized]);
	});

	it('images are NOT gzip compressed in d.gz workflow', async () => {
		const imageData = new Uint8Array(1024);
		for (let i = 0; i < imageData.length; i++) imageData[i] = i & 0xff;

		const entries: Record<string, string | Uint8Array> = {
			'd.gz': Bun.gzipSync(new Uint8Array([1, 2, 3])),
			'u/img.png': imageData
		};
		const archive = new Bun.Archive(entries);
		const bytes = await archive.bytes();

		const restored = new Bun.Archive(bytes);
		const filesMap = await restored.files();

		// Image bytes stored as-is (no gzip)
		const img = filesMap.get('u/img.png');
		expect(img).toBeDefined();
		const imgBytes = new Uint8Array(await img!.arrayBuffer());
		expect([...imgBytes]).toEqual([...imageData]);

		// d.gz → decompress → original data
		const dbGz = filesMap.get('d.gz');
		expect(dbGz).toBeDefined();
		const dbCompressed = new Uint8Array(await dbGz!.arrayBuffer());
		const dbDecompressed = Bun.gunzipSync(
			dbCompressed as Uint8Array<ArrayBuffer>
		) as unknown as Uint8Array;
		expect([...dbDecompressed]).toEqual([1, 2, 3]);
	});
});
