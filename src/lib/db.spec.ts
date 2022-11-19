import { DB } from './server/db/sqlite3';
import { Post } from './server/model';
import { describe, it, assert, beforeEach } from 'vitest';

let db: DB;

describe('test table', function () {
	beforeEach(() => {
		db = new DB('test.db');
	});

	it('drop tables', async function () {
		db.dropTables();
		const nameB = db.tables();
		assert.deepEqual([], nameB);
	});

	it('create tables', async function () {
		const nameA = db.createTables();
		const nameB = db.tables();
		nameA.sort();
		nameB.sort();
		assert.deepEqual(nameA, nameB);
	});

	it('test insert and update', async function () {
		db.createTables();
		const a = new Post();
		a.title = 'test';
		a.slug = '111';
		await db.save(a);
		a.title = 'update';
		await db.save(a);
		const v = db.get(a);
		assert.equal(a.title, v?.title);
	});
});
