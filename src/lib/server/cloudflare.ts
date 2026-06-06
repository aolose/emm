/**
 * Cloudflare Lists API client.
 *
 * API reference: https://developers.cloudflare.com/api/resources/rules/subresources/lists/
 *
 * All functions require cfAccountId + cfApiToken from sys settings.
 * Errors are logged and swallowed — never throw to the caller.
 */

import { sys } from '$lib/server/index';

const CF_BASE = 'https://api.cloudflare.com/client/v4';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CfList {
	id: string;
	name: string;
	kind: 'ip' | 'redirect' | 'hostname' | 'asn';
	num_items: number;
	description?: string;
}

interface CfListItem {
	id: string;
	ip: string;
	comment?: string;
}

interface CfOpStatus {
	id: string;
	status: 'pending' | 'running' | 'completed' | 'failed';
	error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cfHeaders(): Headers {
	return new Headers({
		Authorization: `Bearer ${sys.cfApiToken}`,
		'Content-Type': 'application/json'
	});
}

function accountUrl(path: string): string {
	return `${CF_BASE}/accounts/${sys.cfAccountId}${path}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Validate the CF API token by fetching account-level lists.
 *  Returns true if the token is valid and the account is accessible. */
export async function validateCfToken(): Promise<boolean> {
	if (!sys.cfAccountId || !sys.cfApiToken) return false;
	try {
		const res = await fetch(accountUrl('/rules/lists?per_page=1'), {
			headers: cfHeaders(),
			signal: AbortSignal.timeout(5000)
		});
		const data = (await res.json()) as { success: boolean };
		return data.success === true;
	} catch {
		return false;
	}
}

/** Fetch all IP lists in the account. */
export async function getCfLists(): Promise<CfList[]> {
	if (!sys.cfAccountId || !sys.cfApiToken) return [];
	try {
		const res = await fetch(accountUrl('/rules/lists'), {
			headers: cfHeaders(),
			signal: AbortSignal.timeout(5000)
		});
		const data = (await res.json()) as { success: boolean; result: CfList[] };
		if (!data.success) {
			console.error('[cf] getLists failed:', data);
			return [];
		}
		return (data.result || []).filter((l) => l.kind === 'ip');
	} catch (e) {
		console.error('[cf] getLists error:', e);
		return [];
	}
}

/** Fetch all items in a list. Returns existing IP items for dedup. */
export async function getListItems(listId: string): Promise<CfListItem[]> {
	if (!sys.cfAccountId || !sys.cfApiToken) return [];
	try {
		const res = await fetch(accountUrl(`/rules/lists/${listId}/items?per_page=100`), {
			headers: cfHeaders(),
			signal: AbortSignal.timeout(5000)
		});
		const data = (await res.json()) as { success: boolean; result: CfListItem[] };
		if (!data.success) {
			console.error('[cf] getListItems failed:', data);
			return [];
		}
		return data.result || [];
	} catch (e) {
		console.error('[cf] getListItems error:', e);
		return [];
	}
}

/** Add IPs to a list. Deduplicates against existing items first.
 *  Returns the async operation_id, or empty string on failure. */
export async function addIpsToList(
	listId: string,
	ips: string[],
	comment?: string
): Promise<string> {
	if (!sys.cfAccountId || !sys.cfApiToken || !ips.length) return '';

	try {
		// Dedup: fetch existing items
		const existing = await getListItems(listId);
		const existingIps = new Set(existing.map((a) => a.ip));
		const newEntries = ips
			.filter((ip) => !existingIps.has(ip))
			.map((ip) => ({ ip, comment: comment || 'auto-blocked' }));

		if (!newEntries.length) return '';

		const res = await fetch(accountUrl(`/rules/lists/${listId}/items`), {
			method: 'POST',
			headers: cfHeaders(),
			body: JSON.stringify(newEntries),
			signal: AbortSignal.timeout(10000)
		});
		const data = (await res.json()) as { success: boolean; result: { operation_id: string } };
		if (!data.success) {
			console.error('[cf] addIpsToList failed:', data);
			return '';
		}
		return data.result?.operation_id || '';
	} catch (e) {
		console.error('[cf] addIpsToList error:', e);
		return '';
	}
}

/** Add a single IP to the configured list. Convenience wrapper. */
export async function addIpToList(ip: string, comment?: string): Promise<string> {
	return addIpsToList(sys.cfListId, [ip], comment);
}

/** Remove IPs from a list by their IDs.
 *  Cloudflare deletes items by item ID, not by IP value. */
export async function removeIpsFromList(listId: string, itemIds: string[]): Promise<boolean> {
	if (!sys.cfAccountId || !sys.cfApiToken || !itemIds.length) return false;

	try {
		const res = await fetch(accountUrl(`/rules/lists/${listId}/items`), {
			method: 'DELETE',
			headers: cfHeaders(),
			body: JSON.stringify({ items: itemIds.map((id) => ({ id })) }),
			signal: AbortSignal.timeout(10000)
		});
		const data = (await res.json()) as { success: boolean };
		if (!data.success) {
			console.error('[cf] removeIpsFromList failed:', data);
			return false;
		}
		return true;
	} catch (e) {
		console.error('[cf] removeIpsFromList error:', e);
		return false;
	}
}

/** Get async bulk operation status. */
export async function getOperationStatus(opId: string): Promise<CfOpStatus | null> {
	if (!sys.cfAccountId || !sys.cfApiToken) return null;
	try {
		const res = await fetch(accountUrl(`/rules/lists/bulk_operations/${opId}`), {
			headers: cfHeaders(),
			signal: AbortSignal.timeout(5000)
		});
		const data = (await res.json()) as { success: boolean; result: CfOpStatus };
		if (!data.success) return null;
		return data.result;
	} catch {
		return null;
	}
}

/** Validate CF config completeness. */
export function isCfConfigured(): boolean {
	return !!(sys.cfAccountId && sys.cfApiToken && sys.cfListId);
}

// ===========================================================================
// R2 Storage (S3-compatible API)
// ===========================================================================

const R2_REGION = 'auto';
const R2_SERVICE = 's3';

function r2Endpoint(): string {
	return `https://${sys.r2AccountId}.r2.cloudflarestorage.com`;
}

function r2Url(key: string): string {
	return `${r2Endpoint()}/${sys.r2Bucket}/${key}`;
}

/** Check if R2 storage is fully configured and enabled. */
export function isR2Configured(): boolean {
	return !!(
		sys.r2Enabled &&
		sys.r2AccountId &&
		sys.r2AccessKeyId &&
		sys.r2SecretAccessKey &&
		sys.r2Bucket
	);
}

// ---------------------------------------------------------------------------
// AWS Signature V4 for S3
// ---------------------------------------------------------------------------

async function sha256(data: string | Uint8Array): Promise<string> {
	const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
	const hash = await crypto.subtle.digest('SHA-256', buf);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
	const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, [
		'sign'
	]);
	const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
	return new Uint8Array(sig);
}

async function getSignatureKey(
	secretKey: string,
	dateStamp: string,
	region: string,
	service: string
): Promise<Uint8Array> {
	const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretKey), dateStamp);
	const kRegion = await hmacSha256(kDate, region);
	const kService = await hmacSha256(kRegion, service);
	return await hmacSha256(kService, 'aws4_request');
}

interface SignedHeaders {
	Authorization: string;
	'x-amz-date': string;
	'x-amz-content-sha256': string;
}

async function signRequest(
	method: string,
	key: string,
	payloadSha256: string,
	extraHeaders?: Record<string, string>
): Promise<SignedHeaders> {
	const now = new Date();
	const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
	const dateStamp = amzDate.slice(0, 8);

	const host = `${sys.r2AccountId}.r2.cloudflarestorage.com`;
	const canonicalUri = `/${sys.r2Bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

	const signedHeaderNames = ['host', 'x-amz-content-sha256', 'x-amz-date'];
	if (extraHeaders) {
		for (const k of Object.keys(extraHeaders)) signedHeaderNames.push(k.toLowerCase());
	}
	signedHeaderNames.sort();

	const canonicalHeaders = signedHeaderNames
		.map((h) => {
			const v = h === 'host' ? host : h === 'x-amz-content-sha256' ? payloadSha256 : h === 'x-amz-date' ? amzDate : (extraHeaders?.[h] || '');
			return `${h}:${v}`;
		})
		.join('\n');

	const signedHeaders = signedHeaderNames.join(';');

	const canonicalRequest = [method, canonicalUri, '', canonicalHeaders + '\n', signedHeaders, payloadSha256].join('\n');

	const credentialScope = `${dateStamp}/${R2_REGION}/${R2_SERVICE}/aws4_request`;
	const stringToSign = [
		'AWS4-HMAC-SHA256',
		amzDate,
		credentialScope,
		await sha256(canonicalRequest)
	].join('\n');

	const signingKey = await getSignatureKey(sys.r2SecretAccessKey, dateStamp, R2_REGION, R2_SERVICE);
	const signature = Array.from(
		new Uint8Array(await hmacSha256(signingKey, stringToSign))
	)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	return {
		Authorization: `AWS4-HMAC-SHA256 Credential=${sys.r2AccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
		'x-amz-date': amzDate,
		'x-amz-content-sha256': payloadSha256
	};
}

// ---------------------------------------------------------------------------
// R2 Operations
// ---------------------------------------------------------------------------

/** Upload a file to R2. Returns true on success. */
export async function r2Put(key: string, buf: Uint8Array, contentType: string): Promise<boolean> {
	if (!isR2Configured()) return false;
	try {
		const payloadSha256 = await sha256(buf);
		const extraHeaders: Record<string, string> = {};
		if (contentType) extraHeaders['content-type'] = contentType;
		const signed = await signRequest('PUT', key, payloadSha256, extraHeaders);

		const res = await fetch(r2Url(key), {
			method: 'PUT',
			headers: {
				...signed,
				'content-type': contentType || 'application/octet-stream'
			},
			body: buf,
			signal: AbortSignal.timeout(30000)
		});
		if (!res.ok) {
			console.error(`[r2] PUT ${key} failed: ${res.status}`);
			return false;
		}
		return true;
	} catch (e) {
		console.error('[r2] PUT error:', e);
		return false;
	}
}

/** Delete a file from R2. Returns true on success. */
export async function r2Delete(key: string): Promise<boolean> {
	if (!isR2Configured()) return false;
	try {
		const payloadSha256 = 'UNSIGNED-PAYLOAD';
		const signed = await signRequest('DELETE', key, payloadSha256);

		const res = await fetch(r2Url(key), {
			method: 'DELETE',
			headers: signed,
			signal: AbortSignal.timeout(15000)
		});
		if (!res.ok && res.status !== 404) {
			console.error(`[r2] DELETE ${key} failed: ${res.status}`);
			return false;
		}
		return true;
	} catch (e) {
		console.error('[r2] DELETE error:', e);
		return false;
	}
}

/** Check if a file exists in R2. */
export async function r2Exists(key: string): Promise<boolean> {
	if (!isR2Configured()) return false;
	try {
		const payloadSha256 = 'UNSIGNED-PAYLOAD';
		const signed = await signRequest('HEAD', key, payloadSha256);

		const res = await fetch(r2Url(key), {
			method: 'HEAD',
			headers: signed,
			signal: AbortSignal.timeout(10000)
		});
		return res.ok;
	} catch {
		return false;
	}
}
