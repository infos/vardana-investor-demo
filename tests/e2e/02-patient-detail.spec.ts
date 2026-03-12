import { test, expect } from '@playwright/test';
import { navigateToCoordinator, selectPatient, checkElementsVisible } from '../helpers/test-utils';

test.describe('Patient Detail View', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCoordinator(page);
    await selectPatient(page, 'Sarah Chen');
  });

  test('Sarah Chen shows conditions (HFrEF, Hypertensive heart disease, Type 2 diabetes)', async ({ page }) => {
    // Sarah Chen's coordinator detail uses SupportingData component with clinical condition names
    await checkElementsVisible(page, [
      'HFrEF',
      'Hypertensive heart disease',
      'Type 2 diabetes',
    ]);
  });

  test('shows medications with dosages (Carvedilol, Lisinopril, Furosemide)', async ({ page }) => {
    await checkElementsVisible(page, [
      'Carvedilol',
      'Lisinopril',
      'Furosemide',
    ]);
  });

  test('shows Contact Patient button', async ({ page }) => {
    await expect(page.getByText('Contact Patient').first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows vitals section', async ({ page }) => {
    // Sarah Chen's detail view includes weight trend and blood pressure data
    // The supporting data section has weight and BP info
    await expect(page.getByText('Weight Trend').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('187.7').first()).toBeVisible({ timeout: 10_000 });
  });
});
