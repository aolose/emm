/**
 * Lightweight request body validation helpers.
 * No runtime dependencies — validates that required fields
 * exist and match expected JavaScript types.
 */

type FieldError = { field: string; expected: string; received: string };

const typeOf = (v: unknown): string =>
	v === null ? 'null' : v === undefined ? 'undefined' : Array.isArray(v) ? 'array' : typeof v;

function checkField(
	obj: Record<string, unknown>,
	field: string,
	expected: string,
	errors: FieldError[]
): void {
	const v = obj[field];
	if (v === undefined || v === null) {
		errors.push({ field, expected, received: typeOf(v) });
	} else if (expected !== 'any' && typeOf(v) !== expected) {
		errors.push({ field, expected, received: typeOf(v) });
	}
}

/** Validate an object against a { field: type } schema */
export function validate(
	data: unknown,
	schema: Record<string, string>
): { ok: true; data: Record<string, unknown> } | { ok: false; errors: FieldError[] } {
	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		return { ok: false, errors: [{ field: '(root)', expected: 'object', received: typeOf(data) }] };
	}
	const obj = data as Record<string, unknown>;
	const errors: FieldError[] = [];
	for (const [field, type] of Object.entries(schema)) {
		checkField(obj, field, type, errors);
	}
	if (errors.length > 0) return { ok: false, errors };
	return { ok: true, data: obj };
}

/** Format errors for API responses */
export function formatErrors(errors: FieldError[]): string {
	return errors.map((e) => `${e.field}: expected ${e.expected}, got ${e.received}`).join('; ');
}

// ---- Pre-built schemas ----

export const setAdminSchema = { usr: 'string', pwd: 'string' };
export const postSaveSchema = { title: 'string', content: 'string' };
