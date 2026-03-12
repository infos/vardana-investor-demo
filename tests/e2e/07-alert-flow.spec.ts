import { test, expect } from '@playwright/test';
import { navigateToVoiceSetup, takeScreenshot, isTtsAvailable } from '../helpers/test-utils';

// Alert flow tests require TTS for the scripted demo to play through to the alert point.
// Tests skip gracefully when TTS keys are not configured locally.

test.describe('Alert Flow During Scripted Demo', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToVoiceSetup(page, 'Sarah Chen');
  });

  test('during scripted demo, alert generates', async ({ page }) => {
    const ttsOk = await isTtsAvailable('http://localhost:3001');
    test.skip(!ttsOk, 'TTS API keys not configured — scripted demo cannot generate audio');
    test.setTimeout(120_000);
    await page.getByText('Start Scripted Demo', { exact: false }).first().click();
    await expect(
      page.getByText('P1 ALERT', { exact: false }).first()
    ).toBeVisible({ timeout: 110_000 });
    await expect(
      page.getByText('Flag', { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
    await takeScreenshot(page, 'alert-generated');
  });

  test('risk score increases during conversation', async ({ page }) => {
    const ttsOk = await isTtsAvailable('http://localhost:3001');
    test.skip(!ttsOk, 'TTS API keys not configured — scripted demo cannot generate audio');
    test.setTimeout(120_000);
    await page.getByText('Start Scripted Demo', { exact: false }).first().click();
    await expect(page.getByText('Decompensation Risk').first()).toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator('text=/8[0-9]|84/').first()
    ).toBeVisible({ timeout: 110_000 });
    await takeScreenshot(page, 'risk-score-increased');
  });
});
