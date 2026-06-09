// Browser-native geolocation tool — uses the Geolocation API for
// true device-level positioning (hardware GPS / Wi-Fi / cell tower).
// Avoids IP-based lookups (blocked by Cloudflare human verification).
//
// Returns a structured status so the AI can gracefully handle denial:
//   SUCCESS      — coordinates obtained
//   USER_DENIED  — user clicked "Block" (AI should ask for city name)
//   TIMEOUT      — user ignored the prompt or signal was weak
//   SYSTEM_ERROR — browser doesn't support geolocation

export type LocationStatus = 'SUCCESS' | 'USER_DENIED' | 'TIMEOUT' | 'SYSTEM_ERROR';

export interface LocationResult {
	ok: boolean;
	status: LocationStatus;
	error?: string;
	latitude?: number;
	longitude?: number;
	accuracy?: number; // metres
}

let cached: LocationResult | null = null;
let pending: Promise<LocationResult> | null = null;

// ── Silent permission check (no prompt) ────────────────────────────

async function checkCurrentPermission(): Promise<'granted' | 'denied' | 'prompt'> {
	if (typeof window === 'undefined' || !navigator.permissions) return 'prompt';
	try {
		const result = await navigator.permissions.query({ name: 'geolocation' });
		return result.state;
	} catch {
		return 'prompt';
	}
}

// ── Actual geolocation call (will trigger browser prompt) ──────────

function requestBrowserLocation(): Promise<LocationResult> {
	return new Promise((resolve) => {
		if (typeof window === 'undefined' || !navigator.geolocation) {
			return resolve({
				ok: false,
				status: 'SYSTEM_ERROR',
				error: 'Browser does not support HTML5 Geolocation'
			});
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					ok: true,
					status: 'SUCCESS',
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					accuracy: position.coords.accuracy
				});
			},
			(error) => {
				switch (error.code) {
					case error.PERMISSION_DENIED:
						resolve({
							ok: false,
							status: 'USER_DENIED',
							error: 'User denied the location permission request'
						});
						break;
					case error.TIMEOUT:
						resolve({
							ok: false,
							status: 'TIMEOUT',
							error: 'Location request timed out (user may have ignored the prompt)'
						});
						break;
					default:
						resolve({
							ok: false,
							status: 'SYSTEM_ERROR',
							error: error.message
						});
						break;
				}
			},
			{
				enableHighAccuracy: false, // Wi-Fi / cell tower is fast; GPS not needed
				timeout: 7000,
				maximumAge: 60_000 // reuse browser-cached position up to 1 min old
			}
		);
	});
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Preload location on mount — but only attempt if the user has
 * already granted permission (no prompt).  This keeps the first
 * AI tool call fast without scaring the user with a premature popup.
 */
export function preloadLocation(): void {
	if (cached || pending) return;
	checkCurrentPermission().then((perm) => {
		if (perm !== 'granted') return;
		pending = requestBrowserLocation().then((r) => {
			if (r.ok) cached = r;
			pending = null;
			return r;
		});
	});
}

/**
 * Called by the AI tool — returns cached result or triggers location flow.
 *
 * The AI's System Prompt instructs it: if status is USER_DENIED or TIMEOUT,
 * gracefully ask for city name instead of showing a technical error.
 */
export async function getUserLocation(bypassCache = false): Promise<LocationResult> {
	if (cached && !bypassCache) return cached;
	if (pending) return pending;

	// If user already denied at browser level, return immediately
	const perm = await checkCurrentPermission();
	if (perm === 'denied') {
		return {
			ok: false,
			status: 'USER_DENIED',
			error: 'User has permanently disabled location for this site in browser settings'
		};
	}

	pending = requestBrowserLocation().then((result) => {
		if (result.ok) cached = result;
		pending = null;
		return result;
	});

	return pending;
}
