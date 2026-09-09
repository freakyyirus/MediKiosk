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
  // Primary CTA into the kiosk portal
  await expect(page.getByRole('link', { name: /Kiosk|Patient Check-in|Start/i }).first()).toBeVisible();
  // "Watch 2-Min Demo" is desktop-visible (the "See How It Works" text is the mobile-only twin)
  await expect(page.getByText(/Watch 2-Min Demo/i)).toBeVisible();
  // Nav pip to the kiosk portal
  await expect(page.getByRole('navigation')).toContainText(/Kiosk|Portals/i);
});

test('landing page (mobile): See How It Works link visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndWait(page, '/');
  await expect(page.getByText(/See How It Works/i)).toBeVisible();
});

test('kiosk palette: public journey starts', async ({ page }) => {
  await gotoAndWait(page, '/kiosk/home');
  await expect(page.getByText(/Start Health Check/i)).toBeVisible();
  await page.getByRole('button', { name: /Start Health Check/i }).click();
  await expect(page).toHaveURL(/\/kiosk\/language/);
});

test('kiosk flow: legacy fragmented routes funnel into combined anatomy flow', async ({ page }) => {
  // Old /kiosk/body-map and /kiosk/interview now redirect to the combined flow
  await gotoAndWait(page, '/kiosk/body-map');
  await expect(page).toHaveURL(/\/kiosk\/anatomy/);

  await gotoAndWait(page, '/kiosk/interview');
  await expect(page).toHaveURL(/\/kiosk\/anatomy/);

  await gotoAndWait(page, '/kiosk/summary');
  await expect(page).toHaveURL(/\/kiosk\/anatomy/);
});

test('kiosk anatomy: body map shows and prompts for selection', async ({ page }) => {
  await gotoAndWait(page, '/kiosk/anatomy');
  // The anatomy flow first shows the "patient details" step
  await expect(page.getByRole('heading', { name: /Tell us about you|अपने बारे में बताएं/i })).toBeVisible();
  // Enter basic details to reach the consent step
  await page.getByPlaceholder(/Full name|पूरा नाम/i).fill('Test Patient');
  await page.getByPlaceholder(/Mobile|मोबाइल/i).fill('9876543210');
  await page.getByRole('button', { name: /Continue|आगे बढ़ें/i }).click();
  // Consent step: grant all required permissions, then continue
  await expect(page.getByRole('heading', { name: /Your Consent|आपकी सहमति/i })).toBeVisible();
  await page.getByRole('button', { name: /Medical Data Collection|मेडिकल डेटा संग्रह/i }).click();
  await page.getByRole('button', { name: /AI-Assisted Analysis|एआई/i }).click();
  await page.getByRole('button', { name: /Physician Review|चिकित्सक/i }).click();
  await page.getByRole('button', { name: /Continue|जारी रखें/i }).click();
  // Body-map prompt appears
  await expect(page.getByRole('heading', { name: /Touch Where You Have|समस्या वाले/i })).toBeVisible();
});

test('kiosk flow: 5-step stepper (Language → Basic Details → Health Check → Documents → Done)', async ({ page }) => {
  await gotoAndWait(page, '/kiosk/anatomy');
  // The combined flow shows all 5 pills
  await expect(page.locator('.step-pill')).toHaveCount(5);
  await expect(page.locator('.step-pill').first()).toContainText(/Language|भाषा/i);
  await expect(page.locator('.step-pill').nth(1)).toContainText(/Basic Details|मूल विवरण/i);
  await expect(page.locator('.step-pill').nth(2)).toContainText(/Health Check|स्वास्थ्य/i);
  await expect(page.locator('.step-pill').nth(3)).toContainText(/Documents|दस्तावेज़/i);
  await expect(page.locator('.step-pill').nth(4)).toContainText(/Done|पूर्ण/i);
  // "Basic Details" is the active step while filling the details form
  await expect(page.locator('.step-pill.active')).toContainText(/Basic Details|मूल विवरण/i);
});

test('protected routes gate unauthenticated users', async ({ page }) => {
  await gotoAndWait(page, '/hospital/data-retention');
  // ProtectedRoute redirects to /login when not authenticated
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});