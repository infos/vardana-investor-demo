import { test, expect } from '@playwright/test';
import { navigateToCoordinator, checkElementsVisible } from '../helpers/test-utils';

test.describe('Care Coordinator Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCoordinator(page);
  });

  test('renders patient roster with 4 patients', async ({ page }) => {
    await checkElementsVisible(page, [
      'Sarah Chen',
      'Robert Williams',
      'Maria Gonzalez',
      'James Thompson',
    ]);
  });

  test('shows risk levels for patients', async ({ page }) => {
    // Sarah Chen has risk 72 (high), Robert 34 (low), Maria 45 (moderate), James 22 (low)
    // Risk scores are rendered as "{score}/100"
    await expect(page.getByText('72/100').first()).toBeVisible();
    await expect(page.getByText('34/100').first()).toBeVisible();
    await expect(page.getByText('45/100').first()).toBeVisible();
    await expect(page.getByText('22/100').first()).toBeVisible();
  });

  test('clicking patient opens detail view', async ({ page }) => {
    await page.getByText('Sarah Chen').first().click();
    // Patient detail view shows the patient name as a heading and additional info
    await expect(page.getByText('Day 15').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Contact Patient').first()).toBeVisible({ timeout: 10_000 });
  });

  test('header shows Care Coordinator and Nurse Rachel Kim', async ({ page }) => {
    await expect(page.getByText('Care Coordinator').first()).toBeVisible();
    await expect(page.getByText('Nurse Rachel Kim').first()).toBeVisible();
  });
});
