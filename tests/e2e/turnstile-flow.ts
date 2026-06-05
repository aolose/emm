const BASE = 'http://localhost:5173';
let passed = 0,
	failed = 0;
function ok(n) {
	passed++;
	console.log('  OK', n);
}
function fail(n, r) {
	failed++;
	console.log('  FAIL', n, r);
}

const headers = { 'User-Agent': 'Turnstile-E2E-Test/1.0', Accept: 'text/html,*/*' };

async function main() {
	console.log('\n=== Turnstile E2E ===\n');

	// 1. Send 3 requests (populate log cache)
	console.log('1. Sending 3 requests to populate logs');
	for (let i = 1; i <= 3; i++) {
		const r = await fetch(BASE, { headers });
		console.log(`   req ${i}: status ${r.status}`);
		await new Promise((r) => setTimeout(r, 100));
	}
	ok('3 requests sent');

	// 2. 4th request should trigger challenge (307)
	console.log('\n2. 4th request → expect 307');
	const r4 = await fetch(BASE, { headers, redirect: 'manual' });
	const loc = r4.headers.get('location') || '';
	if (r4.status === 307 && loc.includes('/ts-challenge')) {
		ok('307 → challenge');
	} else {
		fail('trigger', `status ${r4.status} loc:${loc.substring(0, 50)}`);
	}

	// 3. Challenge page renders
	console.log('\n3. Challenge page');
	const cp = await fetch(BASE + '/ts-challenge?redirect=/&siteKey=1x00000000000000000000AA', {
		headers
	});
	const html = await cp.text();
	html.includes('ts-widget') ? ok('page rendered') : fail('page');

	// 4. Verify via API
	console.log('\n4. POST /api/tsVerify');
	const vr = await fetch(BASE + '/api/tsVerify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token: 'test-token' })
	});
	const vb = await vr.json();
	vb.success ? ok('verify OK') : fail('verify', JSON.stringify(vb));

	// 5. Cookie check
	console.log('\n5. Cookie');
	const ck = vr.headers.get('set-cookie') || '';
	ck.includes('_tsv=') ? ok('cookie set') : fail('cookie');

	console.log(`\n=== ${passed} pass, ${failed} fail ===\n`);
	process.exit(failed ? 1 : 0);
}
main();
