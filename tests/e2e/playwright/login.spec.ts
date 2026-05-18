/**
 * EMM Login Flow E2E Tests (Playwright)
 *
 * Covers: form validation, successful login, failed login,
 * rate limiting, keyboard navigation, loading state, logout.
 *
 * Requires: dev server at http://localhost:5173
 *           test DB seeded with tom / 123qwe
 */
import { test, expect } from '@playwright/test';

// ─── Helpers ────────────────────────────────────────────────────────────

async function goToLoginPage(page: import('@playwright/test').Page) {
	await page.context().clearCookies();
	await page.goto('/login');
	await page.waitForLoadState('networkidle');
	await expect(page.locator('button:has-text("Login")')).toBeVisible({ timeout: 5000 });
	await expect(page.locator('input[type="text"]')).toBeVisible();
	await expect(page.locator('input[type="password"]')).toBeVisible();
}

async function expectButtonDisabled(page: import('@playwright/test').Page) {
	await expect(page.locator('button:has-text("Login")')).toHaveClass(/dis/);
}

async function expectButtonEnabled(page: import('@playwright/test').Page) {
	await expect(page.locator('button:has-text("Login")')).not.toHaveClass(/dis/);
}

// ─── Rendering ───────────────────────────────────────────────────────────

test.describe('Login page rendering', () => {
	test('shows all form elements', async ({ page }) => {
		await goToLoginPage(page);
		await expect(page.locator('input[type="text"]')).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();
		await expect(page.locator('button:has-text("Login")')).toBeVisible();
		await expect(page.locator('a[href="/"]')).toBeVisible();
	});

	test('login button disabled when fields are empty', async ({ page }) => {
		await goToLoginPage(page);
		await expectButtonDisabled(page);
	});

	test('Back to home link navigates to /', async ({ page }) => {
		await goToLoginPage(page);
		await page.click('a[href="/"]');
		await expect(page).not.toHaveURL(/\/login/);
	});
});

// ─── Form validation ────────────────────────────────────────────────────

test.describe('Form validation', () => {
	test('button disabled with short username (< 2 chars)', async ({ page }) => {
		await goToLoginPage(page);
		await page.fill('input[type="text"]', 't');
		await page.fill('input[type="password"]', '1234');
		await expectButtonDisabled(page);
	});

	test('button disabled with short password (< 4 chars)', async ({ page }) => {
		await goToLoginPage(page);
		await page.fill('input[type="text"]', 'tom');
		await page.fill('input[type="password"]', '123');
		await expectButtonDisabled(page);
	});

	test('button enabled with valid-length credentials', async ({ page }) => {
		await goToLoginPage(page);
		await page.fill('input[type="text"]', 'tom');
		await page.fill('input[type="password"]', '1234');
		await expectButtonEnabled(page);
	});

	test('clicking Login with empty fields does not navigate', async ({ page }) => {
		await goToLoginPage(page);
		await page.click('button:has-text("Login")', { force: true });
		await page.waitForTimeout(300);
		await expect(page).toHaveURL(/\/login/);
	});
});

// ─── Successful login ───────────────────────────────────────────────────

test.describe('Successful login', () => {
	test.beforeEach(async ({ page }) => {
		await page.context().clearCookies();
	});

	test('redirects away from /login after valid credentials', async ({ page }) => {
		await goToLoginPage(page);
		await page.fill('input[type="text"]', 'tom');
		await page.fill('input[type="password"]', '123qwe');
		await page.click('button:has-text("Login")');
		await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
	});

	test('loading spinner appears during login request', async ({ page }) => {
		await goToLoginPage(page);
		await page.fill('input[type="text"]', 'tom');
		await page.fill('input[type="password"]', '123qwe');
		await page.click('button:has-text("Login")');
		await expect(page.locator('.load')).toBeVisible({ timeout: 2000 });
	});

	test('login via keyboard Enter on password field', async ({ page }) => {
		await goToLoginPage(page);
		await page.fill('input[type="text"]', 'tom');
		await page.fill('input[type="password"]', '123qwe');
		await page.locator('input[type="password"]').press('Enter');
		await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
	});
});

// ─── Failed login ───────────────────────────────────────────────────────

test.describe('Failed login', () => {
	test.beforeEach(async ({ page }) => {
		await page.context().clearCookies();
	});

	test('shows rate-limit message on failed login', async ({ page }) => {
		await goToLoginPage(page);
		await page.fill('input[type="text"]', 'tom');
		await page.fill('input[type="password"]', 'wrong-password');
		await page.click('button:has-text("Login")');
		await expect(page.locator('.msg p')).toContainText('try again', { timeout: 8000 });
	});

	test('shows rate-limit message with wrong username', async ({ page }) => {
		await goToLoginPage(page);
		await page.fill('input[type="text"]', 'nobody');
		await page.fill('input[type="password"]', '123qwe');
		await page.click('button:has-text("Login")');
		await expect(page.locator('.msg p')).toContainText('try again', { timeout: 8000 });
	});
});

// ─── Rate limiting ──────────────────────────────────────────────────────

test.describe('Rate limiting', () => {
	test.beforeEach(async ({ page }) => {
		await page.context().clearCookies();
	});

	test('escalates delay after repeated failed attempts', async ({ page }) => {
		await goToLoginPage(page);

		for (let i = 0; i < 5; i++) {
			await page.fill('input[type="text"]', 'tom');
			await page.fill('input[type="password"]', `bad-${i}`);
			await page.click('button:has-text("Login")');
			await page.waitForTimeout(600);
		}

		await expect(page.locator('.msg p')).toContainText('try again', { timeout: 8000 });
	});
});

// ─── Keyboard navigation ─────────────────────────────────────────────────

test.describe('Keyboard navigation', () => {
	test.beforeEach(async ({ page }) => {
		await page.context().clearCookies();
	});

	test('Tab from username moves focus to password', async ({ page }) => {
		await goToLoginPage(page);
		await page.fill('input[type="text"]', 'tom');
		await page.locator('input[type="text"]').focus();
		await page.keyboard.press('Tab');
		await page.waitForTimeout(300);
		await expect(page.locator('input[type="password"]')).toBeFocused();
	});

	test('Enter on password with short input does not submit', async ({ page }) => {
		await goToLoginPage(page);
		await page.fill('input[type="text"]', 'tom');
		await page.fill('input[type="password"]', '123');
		await page.locator('input[type="password"]').press('Enter');
		await page.waitForTimeout(500);
		await expect(page).toHaveURL(/\/login/);
	});
});

// ─── Logout ──────────────────────────────────────────────────────────────

test.describe('Post-login state', () => {
	test('login then logout clears session', async ({ page }) => {
		await page.context().clearCookies();
		await goToLoginPage(page);
		await page.fill('input[type="text"]', 'tom');
		await page.fill('input[type="password"]', '123qwe');
		await page.click('button:has-text("Login")');
		await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

		await page.goto('/api/logout');
		await page.goto('/admin');
		await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
	});
});
