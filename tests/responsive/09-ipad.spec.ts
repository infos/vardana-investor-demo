import { test, expect } from '@playwright/test';
import {
  navigateToCoordinator,
  selectPatient,
  navigateToVoiceSetup,
  checkNoOverflow,
  checkElementsVisible,
  takeScreenshot,
} from '../helpers/test-utils';

test.describe('iPad Pro 11 (1024x1366 portrait) — Responsive', () => {
  test.beforeEach(async ({ page }) => {
    // iPad Pro 11 portrait viewport — device config sets this, but ensure it
    await page.setViewportSize({ width: 1024, height: 1366 });
  });

  test('dashboard is usable on iPad', async ({ page }) => {
    await navigateToCoordinator(page);

    // Core dashboard elements should render
    await expect(page.getByText('Patient Roster')).toBeVisible();
    await checkNoOverflow(page);
  });

  test('patient names visible on roster', async ({ page }) => {
    await navigateToCoordinator(page);

    const patientNames = ['Sarah Chen', 'Robert Williams', 'Maria Gonzalez', 'James Thompson'];
    await checkElementsVisible(page, patientNames);
  });

  test('voice call screen fits without horizontal overflow', async ({ page }) => {
    await navigateToVoiceSetup(page, 'Sarah Chen');

    // Verify setup screen loads
    await expect(page.getByText('Start Live Demo')).toBeVisible();

    // Check no overflow on the voice setup screen
    await checkNoOverflow(page);
  });

  test('take screenshot for visual comparison', async ({ page }) => {
    await navigateToCoordinator(page);
    await takeScreenshot(page, 'ipad-dashboard');

    // Navigate to patient detail
    await selectPatient(page, 'Sarah Chen');
    await takeScreenshot(page, 'ipad-patient-detail');

    // Navigate to voice setup
    await navigateToVoiceSetup(page, 'Sarah Chen');
    await takeScreenshot(page, 'ipad-voice-setup');
  });
});
