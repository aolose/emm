import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { DB } from '../../../src/lib/server/db/sqlite3';
import { model, sqlVal } from '../../../src/lib/server/utils';
import { Res } from '../../../src/lib/server/model';

let db: DB;

beforeAll(() => {
	db = new DB(':memory:');
	db.createTables();
});

afterAll(() => {
	db.db.close();
});

describe('ORM — DB class (in-memory SQLite)', () => {
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

		it('updates an existing row', () => {
			const res = new Res();
			res.name = 'original.png';
			res.md5 = 'md5-upd';
			db.save(res);

			res.name = 'updated.png';
			db.save(res);

			const fetched = db.get(model(Res, { id: res.id }));
			expect(fetched!.name).toBe('updated.png');
		});
	});

	describe('all()', () => {
		it('returns all rows of a model', () => {
			const before = db.all(model(Res)).length;

			const r1 = new Res(); r1.name = 'a.png'; r1.md5 = 'm1'; db.save(r1);
			const r2 = new Res(); r2.name = 'b.png'; r2.md5 = 'm2'; db.save(r2);

			const all = db.all(model(Res));
			expect(all.length).toBe(before + 2);
		});

		it('filters with WHERE clause', () => {
			const all = db.all(model(Res), 'name like ?', '%a.png');
			expect(all.every(r => r.name.includes('a.png'))).toBe(true);
		});
	});

	describe('count()', () => {
		it('counts rows', () => {
			const c = db.count(Res);
			expect(c).toBeGreaterThan(0);
		});

		it('counts with WHERE filter', () => {
			const c = db.count(Res, ['name like ?', '%nonexistent_xyz%']);
			expect(c).toBe(0);
		});
	});

	describe('page()', () => {
		it('paginates results with parameterized LIMIT', () => {
			for (let i = 0; i < 5; i++) {
				const r = new Res();
				r.name = `page_${i}.png`;
				r.md5 = `md5_page_${i}`;
				db.save(r);
			}

			const page1 = db.page(Res, 1, 2, ['id asc']);
			expect(page1.length).toBe(2);

			const page2 = db.page(Res, 2, 2, ['id asc']);
			expect(page2.length).toBe(2);

			const ids1 = new Set(page1.map(r => r.id));
			const ids2 = new Set(page2.map(r => r.id));
			for (const id of ids1) {
				expect(ids2.has(id)).toBe(false);
			}
		});

		it('handles large page number', () => {
			const empty = db.page(Res, 999, 10);
			expect(empty.length).toBe(0);
		});
	});

	describe('del() and delByPk()', () => {
		it('deletes a row by primary key', () => {
			const res = new Res();
			res.name = 'to_delete.png';
			res.md5 = 'md5_del';
			db.save(res);

			const changes = db.delByPk(Res, [res.id]).changes;
			expect(changes).toBe(1);

			const fetched = db.get(model(Res, { id: res.id }));
			expect(fetched).toBeUndefined();
		});
	});

	describe('sqlVal() helper', () => {
		it('converts booleans to numbers', () => {
			const result = sqlVal([true, false]);
			expect(result).toEqual([1, 0]);
		});

		it('converts Date to timestamp', () => {
			const d = new Date('2024-01-01');
			const result = sqlVal([d]);
			expect(result[0]).toBe(d.getTime());
		});

		it('passes through strings and numbers', () => {
			const result = sqlVal(['hello', 42, null]);
			expect(result).toEqual(['hello', 42, null]);
		});
	});
});
