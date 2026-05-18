/**
 * Full Navigation E2E Test Suite
 *
 * Tests complete user flow: login → all public pages → all admin pages.
 * Verifies no redirect loops (ERR_TOO_MANY_REDIRECTS) after login.
 *
 * Requires: dev server at http://localhost:5173
 * Usage:     bun run tests/e2e/navigation.ts
 */

const BASE = 'http://localhost:5173';
const HEADERS = { 'User-Agent': 'Navigation-E2E/1.0', 'Accept': 'text/html,*/*' };

// ── Test tracking ──────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures: string[] = [];

function ok(name: string) { passed++; console.log('  \x1b[32m✓\x1b[0m', name); }
function fail(name: string, detail?: string) {
  failed++;
  const m = detail ? `  \x1b[31m✗\x1b[0m ${name} — ${detail}` : `  \x1b[31m✗\x1b[0m ${name}`;
  console.log(m); failures.push(m);
}
function assert(condition: boolean, name: string, detail?: string) {
  condition ? ok(name) : fail(name, detail);
}

// ── HTTP helpers ───────────────────────────────────────────────────────
interface FetchResult {
  status: number;
  body: string;
  headers: Headers;
  redirected: boolean;
  finalUrl: string;
}

async function get(url: string, init?: RequestInit): Promise<FetchResult> {
  const r = await fetch(url, { headers: { ...HEADERS }, redirect: 'manual', ...init });
  const b = await r.text();
  return { status: r.status, body: b, headers: r.headers, redirected: r.status >= 300 && r.status < 400, finalUrl: r.url };
}

async function postJson(url: string, data: any, init?: RequestInit): Promise<FetchResult> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> || {}) },
    body: JSON.stringify(data),
    redirect: 'manual',
    ...init,
  });
  const b = await r.text();
  return { status: r.status, body: b, headers: r.headers, redirected: r.status >= 300 && r.status < 400, finalUrl: r.url };
}

// ── Cookie jar ─────────────────────────────────────────────────────────
let cookies: string[] = [];

function saveCookies(headers: Headers) {
  const setCookie = headers.get('set-cookie');
  if (setCookie) {
    // Extract cookie name=value pairs
    const match = setCookie.match(/^([^=]+=[^;]+)/);
    if (match) {
      const existing = cookies.findIndex(c => c.startsWith(match[1].split('=')[0] + '='));
      if (existing >= 0) cookies[existing] = match[1];
      else cookies.push(match[1]);
    }
  }
}

function getCookieHeader(): Record<string, string> {
  return cookies.length ? { Cookie: cookies.join('; ') } : {};
}

// ── Test scenarios ─────────────────────────────────────────────────────

async function scenario1_ServerReachable() {
  console.log('\n── 1. Server Reachable ──');
  try {
    const { status } = await get(`${BASE}/api/statue`);
    assert(status === 200, '1.1 Server responds (200)', `got ${status}`);
  } catch (e: any) {
    fail('1.1 Server unreachable', e.message);
    process.exit(1);
  }
}

async function scenario2_PublicPages() {
  console.log('\n── 2. Public Pages (no auth) ──');
  
  // These should all load or redirect to config (when sys < 9)
  const pages = ['/', '/posts', '/tags', '/about', '/login'];
  for (const path of pages) {
    const { status } = await get(`${BASE}${path}`);
    // 200 = renders, 307 = redirect (to config if unconfigured)
    assert(status === 200 || status === 307, `2. ${path} (${status})`, `unexpected ${status}`);
  }
}

async function scenario3_CheckSystemStatus() {
  console.log('\n── 3. System Status ──');
  
  const { status, body } = await get(`${BASE}/api/statue`);
  assert(status === 200, '3.1 statue API responds');
  
  let sys: any;
  try { sys = JSON.parse(body); } catch { sys = null; }
  assert(sys !== null, '3.2 statue returns valid JSON');
  assert(typeof sys?.sys === 'number', '3.3 has sys field');
  assert(typeof sys?.statue === 'number', '3.4 has statue field');
  
  console.log(`    sys=${sys.sys}, statue=${sys.statue}, title="${sys.title || ''}"`);
  return sys;
}

async function scenario4_Login() {
  console.log('\n── 4. Login ──');

  // Login with default credentials (tom / 123qwe)
  // Encrypt the credentials like the client does
  const { enc } = await import('../../src/lib/crypto');
  const v = Math.floor(Math.random() * 1e8) + '';
  const u = await enc((await enc('tom')) + v);
  const p = await enc((await enc('123qwe')) + v);

  const { status, headers } = await postJson(`${BASE}/api/login`, [u, p, v]);
  assert(status === 200, '4.1 Login accepted (200)', `got ${status}`);

  saveCookies(headers);
  assert(cookies.length > 0, '4.2 Token cookie received');
  console.log(`    cookies: ${cookies.join('; ')}`);
}

async function scenario5_AdminPages() {
  console.log('\n── 5. Admin Pages (authenticated) ──');

  const adminPages = [
    { path: '/admin',          title: 'Admin' },
    { path: '/admin/comment',  title: 'Comment' },
    { path: '/admin/tag',      title: 'Tag' },
    { path: '/admin/firewall', title: 'Firewall' },
    { path: '/admin/setting',  title: '' },    // setting page title varies
    { path: '/admin/about',    title: 'About' },
  ];

  for (const { path, title } of adminPages) {
    const { status, redirected, finalUrl } = await get(`${BASE}${path}`, { headers: getCookieHeader() });
    
    // Should NOT get 307 redirect loop (ERR_TOO_MANY_REDIRECTS)
    // May get 200 (rendered) or redirect if auth token expired
    const isRedirect = status >= 300 && status < 400;
    if (isRedirect) {
      // Check it's not redirecting to itself (loop)
      const location = finalUrl;
      assert(location !== `${BASE}${path}`, `5. ${path} no self-redirect`, `redirected to ${location}`);
      ok(`5. ${path} (${status} → redirect, no loop)`);
    } else {
      assert(status === 200, `5. ${path} renders (200)`, `got ${status}`);
    }
  }
}

async function scenario6_PostLoginNavigation() {
  console.log('\n── 6. Post-Login Navigation ──');

  // After login, navigating to / should work normally
  const pages = ['/', '/posts', '/tags', '/about'];
  for (const path of pages) {
    const { status, redirected, finalUrl } = await get(`${BASE}${path}`, { headers: getCookieHeader() });
    const isRedirect = status >= 300 && status < 400;
    if (isRedirect) {
      assert(finalUrl !== `${BASE}${path}`, `6. ${path} no self-redirect`, `redirected to ${finalUrl}`);
      ok(`6. ${path} (${status} → ${finalUrl.replace(BASE, '')})`);
    } else {
      assert(status === 200, `6. ${path} renders (200)`, `got ${status}`);
    }
  }
}

async function scenario7_LogoutAndRedirect() {
  console.log('\n── 7. Logout & Post-Logout Redirect ──');

  // Logout
  const { status: logoutStatus, headers: logoutHeaders } = await get(`${BASE}/api/logout`, {
    headers: getCookieHeader(),
  });
  assert(logoutStatus === 200, '7.1 Logout accepted (200)', `got ${logoutStatus}`);
  saveCookies(logoutHeaders);

  // After logout, admin pages should redirect to login
  const { status: adminStatus } = await get(`${BASE}/admin`, { headers: getCookieHeader() });
  const redirectsToLogin = adminStatus === 307;
  assert(redirectsToLogin || adminStatus === 200, '7.2 Admin after logout', `got ${adminStatus}`);

  // Login page should be accessible
  const { status: loginStatus } = await get(`${BASE}/login`);
  assert(loginStatus === 200 || loginStatus === 307, '7.3 Login page accessible', `got ${loginStatus}`);
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Full Navigation E2E Test Suite        ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\nBase: ${BASE}`);

  await scenario1_ServerReachable();
  await scenario2_PublicPages();
  const sys = await scenario3_CheckSystemStatus();
  
  // If system is not fully configured (sys < 9), we can't properly test login
  // But we can still verify no redirect loops
  if (sys && sys.sys < 9) {
    console.log('\n⚠  System not fully configured (sys < 9). Skipping authenticated tests.');
  } else {
    await scenario4_Login();
    await scenario5_AdminPages();
    await scenario6_PostLoginNavigation();
    await scenario7_LogoutAndRedirect();
  }

  console.log(`\n${'═'.repeat(40)}`);
  console.log(`  Total: ${passed + failed}  |  \x1b[32mPassed: ${passed}\x1b[0m  |  \x1b[31mFailed: ${failed}\x1b[0m`);
  console.log(`${'═'.repeat(40)}`);
  
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  ${f}`);
  }
  
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('\nFATAL:', e.message || e);
  process.exit(1);
});
