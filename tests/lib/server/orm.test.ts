import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

// Import order: load models before DB to avoid decorator race
import { Res } from '../../../src/lib/server/model';
import { DB } from '../../../src/lib/server/db/sqlite3';
import { model, sqlVal } from '../../../src/lib/server/utils';

let db: DB;

beforeAll(() => {
	db = new DB(':memory:');
	db.createTables();
});

afterAll(() => {
	db.db.close();
});

describe('ORM - DB class (in-memory SQLite)', () => {
	describe('save() and get()', () => {
		it('inserts a row and retrieves by primary key', () => {
			const res = new Res();
			res.name = 'test.png';
			res.type = 'image/png';
			res.size = 1024;
			res.md5 = 'abc123';

			db.save(res);
			expect(res.id).toBeGreaterThan(0);

			const fetched = db.get(model(Res, { id: res.id }));
			expect(fetched).toBeDefined();
			expect(fetched!.name).toBe('test.png');
			expect(fetched!.size).toBe(1024);
		});
	});

	describe('page()', () => {
		it('paginates with parameterized LIMIT', () => {
			for (let i = 0; i < 5; i++) {
				const r = new Res();
				r.name = 'page_' + i + '.png';
				r.md5 = 'md5_page_' + i;
				db.save(r);
			}

			const page1 = db.page(Res, 1, 2, ['id asc']);
			expect(page1.length).toBe(2);

			const page2 = db.page(Res, 2, 2, ['id asc']);
			expect(page2.length).toBe(2);

			const ids1 = new Set(page1.map((r) => r.id));
			const ids2 = new Set(page2.map((r) => r.id));
			for (const id of ids1) {
				expect(ids2.has(id)).toBe(false);
			}
		});
	});

	describe('sqlVal()', () => {
		it('converts booleans to numbers', () => {
			expect(sqlVal([true, false])).toEqual([1, 0]);
		});
		it('passes through strings and numbers', () => {
			expect(sqlVal(['hello', 42, null])).toEqual(['hello', 42, null]);
		});
	});
});
