/**
 * Cloudflare Upload 端到端测试脚本
 *
 * 测试流程:
 *   1. 直接调用 CF API 验证 token 有效性
 *   2. 通过 Admin API 保存/读取 CF 配置
 *   3. 创建触发规则 (rate-limit trigger + cfUpload)
 *   4. 用 X-Forwarded-For 伪造 IP 发送批量请求触发限流
 *   (注意: 测试路径不能是 Turnstile 保护的 /, /posts, /post/*, /tags, /tag/*)
 *   5. 直接调用 CF API 查询列表确认 IP 已上报
 *
 * 用法:
 *   bun run scripts/test-cf-upload.ts
 *
 * 前置: 服务器需已运行，且已知 admin 用户名/密码
 */

const BASE = 'http://localhost:4173';
const ADMIN_USER = process.env.EMM_USER || '';
const ADMIN_PASS = process.env.EMM_PASS || '';
const SESSION_COOKIE = process.env.EMM_COOKIE || '';

// 测试目标路径 — 不能用 Turnstile 保护路径 (/, /posts, /post/*, /tags, /tag/*)
const TEST_PATH = '/test-cf-trigger';
const TEST_RULE_PATH = TEST_PATH;

// CF 配置 — 通过环境变量传入，避免硬编码凭证
//   EMM_CF_ACCOUNT_ID / EMM_CF_API_TOKEN / EMM_CF_LIST_ID
const CF_ACCOUNT_ID = process.env.EMM_CF_ACCOUNT_ID || '';
const CF_API_TOKEN = process.env.EMM_CF_API_TOKEN || '';
const CF_LIST_ID = process.env.EMM_CF_LIST_ID || '';

// 测试用伪造 IP (TEST-NET-3, RFC 5737)
const TEST_IP = '203.0.113.99';

let sessionCookie = '';

function cfHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${CF_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function apiHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionCookie) h.Cookie = sessionCookie;
  return h;
}

async function apiPost(path: string, body?: unknown) {
  const res = await fetch(`${BASE}/api/${path}`, {
    method: 'POST',
    headers: apiHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get('set-cookie');
  if (sc) sessionCookie = sc.split(';')[0];
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${path} ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function apiGet(path: string) {
  const res = await fetch(`${BASE}/api/${path}`, {
    headers: apiHeaders(),
  });
  const sc = res.headers.get('set-cookie');
  if (sc) sessionCookie = sc.split(';')[0];
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${path} ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function apiDelete(path: string, body?: unknown) {
  const res = await fetch(`${BASE}/api/${path}`, {
    method: 'DELETE',
    headers: apiHeaders(),
    body: body !== undefined ? JSON.stringify(body) : body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${path} ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

// ============================================================
// Step 0: 登录 (需要加密，此处跳过自动登录)
// ============================================================
// Import actual enc function from project crypto module
import { enc, setPwdSalt } from '../src/lib/crypto';

// Read pwdSalt from the local SQLite database
async function readPwdSalt(): Promise<string> {
  try {
    const { Database } = await import('bun:sqlite');
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const dbCfg = resolve('.dbCfg');
    const dbPath = readFileSync(dbCfg, 'utf-8').trim();
    console.log(`  readPwdSalt DB path: ${dbPath}`);
    const db = new Database(dbPath);
    const row = db.query('SELECT pwdSalt FROM System WHERE id=1').get() as any;
    console.log(`  raw row: ${JSON.stringify(row)}, row.pwdSalt=${row?.pwdSalt}, row[0]=${row?.[0]}`);
    db.close();
    return (row?.pwdSalt && row.pwdSalt !== '-') ? String(row.pwdSalt) : '';
  } catch (e: any) {
    console.log(`  readPwdSalt error: ${e.message}`);
    return '';
  }
}

async function login() {
  if (SESSION_COOKIE) {
    sessionCookie = SESSION_COOKIE;
    console.log('  使用提供的 EMM_COOKIE');
    try { await apiGet('sys'); console.log('  Session valid'); return; } catch { sessionCookie = ''; }
  }

  // Read pwdSalt from local DB and set it for the enc function
  const salt = await readPwdSalt();
  setPwdSalt(salt);
  console.log(`  pwdSalt value: "${salt}" (length ${salt.length})`);
  if (salt) console.log(`  DB pwdSalt found`);
  else console.log('  Using legacy salt (no pwdSalt in DB)');

  // Try default credentials
  const user = ADMIN_USER || 'tom';
  const pass = ADMIN_PASS || '123qwe';
  const v = Math.floor(Math.random() * 1e9);
  const u = await enc(await enc(user) + v);
  const p = await enc(await enc(pass) + v);
  // Debug: print intermediate hashes
  const h1 = await enc(user);
  const h2 = await enc(h1 + v);
  console.log(`  Debug: enc('${user}')=${h1.slice(0,16)}...`);
  console.log(`  Debug: enc(enc('${user}')+${v}): u first 16=${u.slice(0,16)}...`);

  try {
    const res = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([u, p, v]),
    });
    const sc = res.headers.get('set-cookie');
    if (sc) {
      sessionCookie = sc.split(';')[0];
      console.log('  Login successful');
    } else {
      console.log('  Login failed — wrong credentials or system not initialized');
      console.log(`  尝试: EMM_USER=${user} EMM_PASS=${pass}`);
      return;
    }
  } catch (e: any) {
    console.log('  Login error:', e.message);
    return;
  }

  // Verify
  try {
    const info = await apiGet('sys');
    console.log('  Server reachable, sys cf fields:',
      Object.keys(info || {}).filter(k => k.startsWith('cf')));
  } catch {}
}

// ============================================================
// Step 1: 直接验证 CF Token
// ============================================================
async function testCfTokenDirect() {
  console.log('\n=== Step 1: 直接验证 CF API Token ===');
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/rules/lists?per_page=1`;
  try {
    const res = await fetch(url, {
      headers: cfHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as any;
    if (data.success) {
      console.log('✅ CF Token 有效');
      console.log(`   返回列表数: ${data.result?.length ?? 0}`);
      if (data.result?.[0]) {
        console.log(`   示例: ${data.result[0].name} (${data.result[0].id})`);
      }
    } else {
      console.log('❌ CF Token 无效:', JSON.stringify(data.errors || data));
    }
  } catch (e: any) {
    console.log('❌ CF API 请求失败:', e.message);
  }
}

// ============================================================
// Step 2: 通过 Admin API 测试 CF 配置保存/读取
// ============================================================
async function testCfConfigSaveRead() {
  console.log('\n=== Step 2: CF 配置保存/读取测试 ===');

  let before: any;
  try {
    before = await apiGet('sys');
    console.log(`  当前 cfAccountId: ${before.cfAccountId || '(空)'}`);
    console.log(`  当前 cfListId:    ${before.cfListId || '(空)'}`);
    console.log(`  当前 cfApiToken:  ${before.cfApiToken ? '***已设置***' : '(空)'}`);
  } catch (e: any) {
    console.log('⚠ 无法读取当前配置 (需 Admin 权限):', e.message);
    return;
  }

  const cfg: Record<string, string> = {
    cfAccountId: CF_ACCOUNT_ID,
    cfApiToken: CF_API_TOKEN,
    cfListId: CF_LIST_ID,
  };
  const merged = { ...before, ...cfg };

  try {
    await apiPost('sys', merged);
    console.log('✅ CF 配置保存成功');
  } catch (e: any) {
    console.log('❌ CF 配置保存失败:', e.message);
    return;
  }

  try {
    const after = await apiGet('sys');
    let ok = true;
    if (after.cfAccountId !== CF_ACCOUNT_ID) {
      console.log(`❌ cfAccountId 不一致: 期望 ${CF_ACCOUNT_ID}, 实际 ${after.cfAccountId}`);
      ok = false;
    }
    if (after.cfListId !== CF_LIST_ID) {
      console.log(`❌ cfListId 不一致: 期望 ${CF_LIST_ID}, 实际 ${after.cfListId}`);
      ok = false;
    }
    if (ok) console.log('✅ CF 配置读取验证通过');
  } catch (e: any) {
    console.log('⚠ 配置读取验证异常:', e.message);
  }

  // 验证 token
  try {
    const valid = await apiGet('cfValidate');
    console.log(`  cfValidate: ${valid.valid ? '✅ Token 有效' : '❌ Token 无效'}`);
  } catch (e: any) {
    console.log('⚠ cfValidate 异常:', e.message);
  }

  // 获取列表
  try {
    const lists = await apiGet('cfLists');
    console.log(`  可用 IP 列表: ${lists?.length ?? 0} 个`);
    for (const l of (lists || [])) {
      console.log(`    - ${l.name} (${l.id}) items: ${l.num_items}`);
    }
  } catch (e: any) {
    console.log('⚠ cfLists 异常:', e.message);
  }
}

// ============================================================
// Step 3: 创建触发规则 (带 cfUpload)
// ============================================================
async function createTriggerRule() {
  console.log('\n=== Step 3: 创建触发规则 (rate-limit + cfUpload) ===');

  const rule = {
    trigger: true,
    active: true,
    log: true,
    cfUpload: true,
    path: TEST_RULE_PATH,
    rate: '2/60',           // 60秒内2次即触发
    respId: -1,             // 默认 403
    mark: 'cf-upload-test',
    weight: 100,
  };

  console.log('  规则配置:', JSON.stringify(rule, null, 2));

  let ruleId: number;
  try {
    ruleId = await apiPost('rule', rule);
    console.log(`✅ 规则创建成功, ID: ${ruleId}`);
  } catch (e: any) {
    console.log('❌ 规则创建失败:', e.message);
    return null;
  }

  await new Promise(r => setTimeout(r, 500));
  return ruleId;
}

// ============================================================
// Step 4: 模拟请求触发限流
// ============================================================
async function triggerRateLimit(_ruleId: number | null) {
  console.log('\n=== Step 4: 模拟请求触发限流 ===');
  console.log(`  伪造 IP: ${TEST_IP}`);
  console.log('  发送 10 个连续请求 (触发 2/60 限流)...');

  const targetUrl = `${BASE}${TEST_PATH}`;

  for (let i = 1; i <= 10; i++) {
    try {
      const res = await fetch(targetUrl, {
        headers: {
          'X-Forwarded-For': TEST_IP,
          'User-Agent': 'CF-Upload-Test/1.0',
        },
        signal: AbortSignal.timeout(3000),
      });
      const marker = res.status >= 400 ? `⚠ BLOCKED` : `OK`;
      console.log(`  请求 #${i}: ${res.status} ${marker}`);
    } catch (e: any) {
      console.log(`  请求 #${i}: 失败 - ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 50));
  }

  console.log('  等待 3 秒让 CF 异步上传完成...');
  await new Promise(r => setTimeout(r, 3000));
}

// ============================================================
// Step 5: 直接查询 CF 列表确认 IP
// ============================================================
async function checkCfList() {
  console.log('\n=== Step 5: 查询 CF 列表确认 IP ===');

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/rules/lists/${CF_LIST_ID}/items?per_page=50`;
  try {
    const res = await fetch(url, {
      headers: cfHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as any;

    if (!data.success) {
      console.log('❌ CF 列表查询失败:', JSON.stringify(data.errors || data));
      return;
    }

    const items: Array<{ ip: string; comment?: string }> = data.result || [];
    console.log(`  列表共 ${items.length} 个 IP (显示前50)`);

    const found = items.find(item => item.ip === TEST_IP);
    if (found) {
      console.log(`✅ 找到测试 IP: ${found.ip}`);
      console.log(`   备注: ${found.comment || '(无)'}`);
    } else {
      console.log(`❌ 未找到测试 IP: ${TEST_IP}`);
      if (items.length > 0) {
        console.log('  列表中的 IP:');
        for (const item of items.slice(0, 10)) {
          console.log(`    - ${item.ip}  ${item.comment || ''}`);
        }
        if (items.length > 10) console.log(`    ... 共 ${items.length} 个`);
      }
    }
  } catch (e: any) {
    console.log('❌ CF API 请求失败:', e.message);
  }
}

// ============================================================
// 清理
// ============================================================
async function cleanup(ruleId: number | null) {
  if (!ruleId) return;
  console.log(`\n=== 清理: 删除测试规则 #${ruleId} ===`);
  try {
    await apiDelete('rules', ruleId.toString());
    console.log('✅ 测试规则已删除');
  } catch (e: any) {
    console.log('⚠ 清理失败:', e.message);
  }
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  Cloudflare Upload 端到端测试        ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`服务器: ${BASE}`);
  console.log(`CF Account: ${CF_ACCOUNT_ID}`);
  console.log(`CF List:    ${CF_LIST_ID}\n`);

  await login();
  await testCfTokenDirect();
  await testCfConfigSaveRead();

  const ruleId = await createTriggerRule();

  if (ruleId) {
    await triggerRateLimit(ruleId);
    await checkCfList();
    await cleanup(ruleId);
  }

  console.log('\n=== 测试完成 ===');
}

main().catch(e => {
  console.error('测试异常:', e);
  process.exit(1);
});