import { test, expect } from '@playwright/test';
import {
  navigateToCoordinator,
  selectPatient,
  navigateToVoiceSetup,
  checkNoOverflow,
  checkElementsVisible,
  takeScreenshot,
  isTtsAvailable,
} from '../helpers/test-utils';

test.describe('Desktop 1440x900 — Responsive', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure desktop viewport (should already be set by playwright.config chromium project)
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('dashboard renders without horizontal overflow', async ({ page }) => {
    await navigateToCoordinator(page);
    await checkNoOverflow(page);
    await takeScreenshot(page, 'desktop-dashboard');
  });

  test('patient roster shows all 4 patients', async ({ page }) => {
    await navigateToCoordinator(page);

    const patientNames = ['Sarah Chen', 'Robert Williams', 'Maria Gonzalez', 'James Thompson'];
    await checkElementsVisible(page, patientNames);

    // Verify the roster heading is present
    await expect(page.getByText('Patient Roster')).toBeVisible();
  });

  test('voice call setup screen renders properly', async ({ page }) => {
    await navigateToVoiceSetup(page, 'Sarah Chen');

    // Verify the setup screen has both demo mode options
    await checkElementsVisible(page, ['Start Live Demo', 'Start Scripted Demo']);
    await checkNoOverflow(page);
    await takeScreenshot(page, 'desktop-voice-setup');
  });

  test('voice call 3-column layout renders', async ({ page }) => {
    const ttsOk = await isTtsAvailable('http://localhost:3001');
    test.skip(!ttsOk, 'TTS API keys not configured — scripted demo cannot generate audio');
    test.setTimeout(120_000);
    await navigateToVoiceSetup(page, 'Sarah Chen');
    await page.getByText('Start Scripted Demo').click();

    // Wait for the call to actually start playing (transcript appears)
    await expect(
      page.getByText('Good morning Sarah', { exact: false }).first()
    ).toBeVisible({ timeout: 90_000 });

    // Verify the 3-column layout elements exist:
    await expect(page.getByText('VARDANA AI')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Decompensation Risk')).toBeVisible();
    await checkNoOverflow(page);
    await takeScreenshot(page, 'desktop-voice-call');
  });
});
