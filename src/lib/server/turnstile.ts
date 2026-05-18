/**
 * Cloudflare Turnstile — verification and cookie signing utilities.
 *
 * Turnstile siteverify API: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
import { sys } from '$lib/server/index';
import { getCookie, setCookie, resp } from '$lib/server/utils';

// ---------------------------------------------------------------------------
// Cookie constants
// ---------------------------------------------------------------------------

const TS_COOKIE = '_tsv';
const TS_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TS_VERIFY_TIMEOUT = 5000; // 5s

// ---------------------------------------------------------------------------
// HMAC helpers (Bun built-in)
// ---------------------------------------------------------------------------

/** Derive a signing key from the Turnstile secret (falls back to a random key if not configured). */
function getSigningKey(): string {
	return (sys.tsSecret || 'turnstile-not-configured') + ':cookie-sign';
}

/** Sign a payload with HMAC-SHA256, return hex. */
function hmacSign(payload: string): string {
	const hasher = new Bun.CryptoHasher('sha256', getSigningKey());
	hasher.update(payload);
	return hasher.digest('hex');
}

// ---------------------------------------------------------------------------
// Cookie create / verify
// ---------------------------------------------------------------------------

export function signTsCookie(ip: string): string {
	const ts = Date.now().toString(36);
	const sig = hmacSign(`${ip}:${ts}`);
	return `${ip}|${ts}|${sig}`;
}

export function verifyTsCookie(cookie: string, ip: string): boolean {
	const parts = cookie.split('|');
	if (parts.length !== 3) return false;
	const [cip, ts, sig] = parts;
	if (cip !== ip) return false;

	// Check expiry
	const ttl = (sys.tsVerifyTTL || 1800) * 1000;
	const then = parseInt(ts, 36);
	if (Date.now() - then > ttl) return false;

	// Check signature
	return hmacSign(`${ip}:${ts}`) === sig;
}

// ---------------------------------------------------------------------------
// Set / clear cookie on Response
// ---------------------------------------------------------------------------

export function setTsCookie(response: Response, ip: string): void {
	const value = signTsCookie(ip);
	const ttl = (sys.tsVerifyTTL || 1800);
	setCookie(response, TS_COOKIE, value, Date.now() + ttl * 1000);
}

export function getTsCookie(req: Request): string | undefined {
	return getCookie(req, TS_COOKIE);
}

// ---------------------------------------------------------------------------
// Cloudflare siteverify call
// ---------------------------------------------------------------------------

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
	const secret = sys.tsSecret;
	if (!secret || secret === '-') return false;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TS_VERIFY_TIMEOUT);

	try {
		const form = new FormData();
		form.set('secret', sys.tsSecret);
		form.set('response', token);
		if (ip) form.set('remoteip', ip);

		const res = await fetch(TS_VERIFY_URL, {
			method: 'POST',
			body: form,
			signal: controller.signal,
		});

		const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
		return data.success === true;
	} catch (e) {
		console.error('[turnstile] siteverify error:', e);
		return false;
	} finally {
		clearTimeout(timer);
	}
}

// ---------------------------------------------------------------------------
// Challenge response builders
// ---------------------------------------------------------------------------

/**
 * Build a 307 redirect to the challenge page for browser page requests.
 */
export function challengeResponseRedirect(redirectUrl: string): Response {
	const params = new URLSearchParams({
		redirect: redirectUrl,
	});
	const url = `/ts-challenge?${params.toString()}`;
	return new Response('', {
		status: 307,
		headers: new Headers({ location: url }),
	});
}

/**
 * Build a 403 JSON response for API / fetch requests.
 */
export function challengeResponseJson(originalUrl: string): Response {
	const params = new URLSearchParams({
		redirect: originalUrl,
	});
	return resp(
		{ tsChallenge: true, challengeUrl: `/ts-challenge?${params.toString()}` },
		403,
	);
}

/**
 * Choose the right challenge response based on whether the request targets the API.
 */
export function challengeResponse(originalUrl: string, isApi: boolean): Response {
	return isApi ? challengeResponseJson(originalUrl) : challengeResponseRedirect(originalUrl);
}

// ---------------------------------------------------------------------------
// Cookie-only verification — no server-side IP tracking.
// Cloudflare Turnstile decides whether to challenge based on risk.
// ---------------------------------------------------------------------------

export function isTsVerified(req: Request, ip: string): boolean {
	// Turnstile must be enabled and configured
	const siteKey = sys.tsSiteKey;
	const secret = sys.tsSecret;
	// Treat unset or default '-' as not configured
	if (!sys.tsEnabled || !siteKey || siteKey === '-' || !secret || secret === '-') return true;

	// Trusted bots identified by Cloudflare transform rules — skip challenge for SEO
	const isClientBot = req.headers.get('X-Client-Bot') === 'true';
	const botCategory = req.headers.get('X-Verified-Bot-Category');
	const trustedCategories = ['Search Engine Crawler', 'Page Preview', 'Feed Fetcher', 'Archiver'];
	if (isClientBot && botCategory && trustedCategories.includes(botCategory)) return true;

	const cookie = getTsCookie(req);
	return !!(cookie && verifyTsCookie(cookie, ip));
}