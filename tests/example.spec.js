import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173';

test.use({ navigationTimeout: 10000 });

test.describe('Orthomed E2E Gold Tests', () => {

    test('Scenario 1: Full Login Flow and Create Appointment', async ({ page }) => {
        await page.goto(APP_URL);

        // 2. Login automat
        await page.getByRole('button', { name: 'Log In' }).click();
        await page.locator('input[type="email"]').fill('doctor@orthomed.com');
        await page.locator('input[type="password"]').fill('parola123');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page.locator('.appointments-table')).toBeVisible({ timeout: 7000 });
        await page.getByRole('button', { name: '+ New Appointment' }).click();
        await page.locator('input[type="text"]').nth(0).fill('Robot Playwright');
        await page.locator('input[type="date"]').fill('2026-12-31');
        await page.locator('input[type="text"]').nth(1).fill('Titanium Arm');
        await page.getByRole('button', { name: 'Save Appointment' }).click();
        await expect(page.locator('.appointments-table')).toBeVisible();
        await page.locator('.page-number').filter({ hasText: '2' }).click();

        await expect(page.locator('table')).toContainText('Robot Playwright');
    });

    test('Scenario 2: Switch between Tabular and Visual Views', async ({ page }) => {

        await page.goto(APP_URL);
        await page.getByRole('button', { name: 'Log In' }).click();
        await page.locator('input[type="email"]').fill('doctor@orthomed.com');
        await page.locator('input[type="password"]').fill('parola123');
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page.locator('.appointments-table')).toBeVisible({ timeout: 7000 });

        await page.getByRole('button', { name: 'Visual View' }).click();


        const chart = page.locator('.recharts-surface').first();
        await expect(chart).toBeVisible();
        await expect(page.locator('h2')).toContainText('Statistics');
    });

    test('Scenario 3: Cookies and Recovery Plan', async ({ page }) => {

        await page.goto(APP_URL);
        await page.getByRole('button', { name: 'Log In' }).click();
        await page.locator('input[type="email"]').fill('doctor@orthomed.com');
        await page.locator('input[type="password"]').fill('parola123');
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page.locator('.appointments-table')).toBeVisible({ timeout: 7000 });


        await page.locator('.btn-icon').first().click();
        await expect(page.locator('.detail-title')).toContainText('Appointment Details');

        await page.getByRole('button', { name: '< Back to Appointments' }).click();

        await expect(page.locator('.activity-banner')).toBeVisible();

        const recoveryBtn = page.getByRole('button', { name: 'My Recovery' });
        await recoveryBtn.click();
        await expect(page.locator('.recovery-main-title')).toBeVisible();

        await page.getByRole('button', { name: '< Back' }).click();


    });

});