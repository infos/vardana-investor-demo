import { test, expect } from '@playwright/test';
import {
  navigateToCoordinator,
  checkNoOverflow,
  checkElementsVisible,
  takeScreenshot,
} from '../helpers/test-utils';

test.describe('Landscape Orientations — Responsive', () => {

  test('iPad landscape — dashboard fits', async ({ page }) => {
    // iPad Pro 11 landscape: swap width/height
    await page.setViewportSize({ width: 1366, height: 1024 });

    await navigateToCoordinator(page);

    // Dashboard should render cleanly at this wide viewport
    await expect(page.getByText('Patient Roster')).toBeVisible();
    await checkNoOverflow(page);

    // All patients should be visible
    const patientNames = ['Sarah Chen', 'Robert Williams', 'Maria Gonzalez', 'James Thompson'];
    await checkElementsVisible(page, patientNames);

    await takeScreenshot(page, 'ipad-landscape-dashboard');
  });

  test('mobile landscape — basic usability', async ({ page }) => {
    // iPhone-class landscape: wide but short
    await page.setViewportSize({ width: 812, height: 375 });

    await navigateToCoordinator(page);

    // The roster should at least be accessible, though vertical space is very limited
    await expect(page.getByText('Patient Roster')).toBeVisible();

    // At least one patient name should be visible or scrollable to
    await expect(page.getByText('Sarah Chen').first()).toBeAttached();

    // Horizontal overflow is the main concern in landscape
    await checkNoOverflow(page);

    await takeScreenshot(page, 'mobile-landscape-dashboard');
  });
});
