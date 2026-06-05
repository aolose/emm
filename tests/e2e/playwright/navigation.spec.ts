/**
 * EMM Admin Navigation E2E Tests (Playwright)
 *
 * Tests: public pages accessible, login → admin pages → logout.
 * Requires: dev server at http://localhost:5173
 *           test DB seeded with tom / 123qwe
 */
import { test, expect } from '@playwright/test';

test.describe('Public Pages (unauthenticated)', () => {
	test('home page loads', async ({ page }) => {
		await page.goto('/');
		await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
	});

	test('posts page loads', async ({ page }) => {
		await page.goto('/posts');
		await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
	});

	test('login page loads', async ({ page }) => {
		await page.context().clearCookies();
		await page.goto('/login');
		await expect(page.locator('button:has-text("Login")')).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Admin flow (authenticated)', () => {
	test('full cycle: login → admin pages → logout', async ({ page }) => {
		// Login via UI
		await page.context().clearCookies();
		await page.goto('/login');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('button:has-text("Login")')).toBeVisible({ timeout: 5000 });

		await page.fill('input[type="text"]', 'tom');
		await page.fill('input[type="password"]', '123qwe');
		await page.click('button:has-text("Login")');
		await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

		// Navigate admin pages — all should be accessible
		const adminPages = [
			'/admin',
			'/admin/comment',
			'/admin/tag',
			'/admin/firewall',
			'/admin/setting'
		];
		for (const path of adminPages) {
			await page.goto(path);
			expect(page.url()).not.toContain('/login');
		}

		// Logout
		await page.goto('/api/logout');
		// Admin should now redirect to login
		await page.goto('/admin');
		await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
	});
});
