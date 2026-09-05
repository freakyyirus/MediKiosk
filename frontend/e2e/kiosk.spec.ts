import { test, expect, Page } from '@playwright/test';

/**
 * End-to-end click-through of the frontend's demo journey.
 * Runs against `npm run preview` (a production build) with no backend —
 * the app falls back to mock data offline, so these pass without a DB.
 * For a full-stack run: deploy the backend, set VITE_API_URL, and rebundle
 * (see backend/scripts/smoke_test.py for the API half).
 */

async function gotoAndWait(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

test('landing page: hero + primary CTAs', async ({ page }) => {
  await gotoAndWait(page, '/');
  await expect(page).toHaveTitle(/MediKiosk/i);
  // Hero illustration (editorial patient+doctor scene) renders
  await expect(page.getByRole('img', { name: /patient speaks/i })).toBeVisible();
  // Primary CTAs
  await expect(page.getByRole('link', { name: /See How It Works/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Watch 2-Min Demo/i })).toBeVisible();
  // Nav pip to the kiosk portal
  await expect(page.getByRole('navigation')).toContainText(/Kiosk|Portals/i);
});

test('kiosk palette: public journey starts', async ({ page }) => {
  await gotoAndWait(page, '/kiosk/home');
  await expect(page.getByText(/Start Health Check/i)).toBeVisible();
  await page.getByRole('button', { name: /Start Health Check/i }).click();
  await expect(page).toHaveURL(/\/kiosk\/language/);
});

test('kiosk body-map triage click-through (F1)', async ({ page }) => {
  await gotoAndWait(page, '/kiosk/body-map');
  await expect(page.getByRole('img', { name: /body part/i })).toBeVisible();
  // Kiosk defaults to Hindi — select Chest (छाती) via the legend chip
  await page.getByRole('button', { name: 'छाती', exact: true }).click();
  // F1: department hint appears (cardiology) behind the Hindi label
  await expect(page.getByText('हृदय विभाग')).toBeVisible();
  // Answer the chest symptom question and confirm the part
  await page.getByRole('button', { name: 'सीने में दर्द' }).click();
  await page.getByRole('button', { name: /सही है — आगे बढ़ें/i }).click();
  // Back on the map, the interview step is re-enabled
  await page.getByRole('button', { name: /Continue to Interview/i }).click();
  await expect(page).toHaveURL(/\/kiosk\/interview/);
});

test('protected routes gate unauthenticated users', async ({ page }) => {
  await gotoAndWait(page, '/hospital/data-retention');
  // ProtectedRoute redirects to /login when not authenticated
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});