import {DB} from "./sqlite3";
import * as assert from "assert";

// test('index page has expected h1', async ({ page }) => {
// 	await page.goto('/');
// 	expect(await page.textContent('h1')).toBe('Welcome to SvelteKit');
// });
let db: DB

describe('create table', function () {
    beforeEach(() => {
        db = new DB('test.db')
    })
    afterEach(() => {
        db.close()
    })

    function getTables() {
        // skip database table check in idea 
        const schema ='sqlite_schema'
        return new Promise<string[]>(r => {
            db.db.all(`SELECT name
                       FROM ${schema}
                       WHERE type = 'table'
                       ORDER BY name`,
                (a, tables) => {
                    r(tables.map(a => a.name))
                })
        })
    }

    it('create tables', async function () {
        const nameA = await db.createTables()
        const nameB = await getTables()
        nameA.sort()
        nameB.sort()
        assert.deepEqual(nameA,nameB)
    });

    it('drop tables', async function () {
        await db.dropTables()
        const nameB = await getTables()
        assert.deepEqual([],nameB)
    });
})


