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
		'Content-Type': 'application/json',
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
			signal: AbortSignal.timeout(5000),
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
			signal: AbortSignal.timeout(5000),
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
			signal: AbortSignal.timeout(5000),
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
			signal: AbortSignal.timeout(10000),
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

/** Get async bulk operation status. */
export async function getOperationStatus(opId: string): Promise<CfOpStatus | null> {
	if (!sys.cfAccountId || !sys.cfApiToken) return null;
	try {
		const res = await fetch(accountUrl(`/rules/lists/bulk_operations/${opId}`), {
			headers: cfHeaders(),
			signal: AbortSignal.timeout(5000),
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
