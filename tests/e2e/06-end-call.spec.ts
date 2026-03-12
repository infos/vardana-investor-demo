import { test, expect } from '@playwright/test';
import { navigateToVoiceSetup, takeScreenshot, isTtsAvailable } from '../helpers/test-utils';

// End call tests require TTS for the scripted demo to play.
// Tests skip gracefully when TTS keys are not configured locally.

test.describe('End Call Flow', () => {
  test('end call button visible during call', async ({ page }) => {
    const ttsOk = await isTtsAvailable('http://localhost:3001');
    test.skip(!ttsOk, 'TTS API keys not configured — scripted demo cannot generate audio');
    test.setTimeout(120_000);
    await navigateToVoiceSetup(page, 'Sarah Chen');
    await page.getByText('Start Scripted Demo', { exact: false }).first().click();
    await expect(
      page.getByText('Good morning Sarah', { exact: false }).first()
    ).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText('End Call').first()).toBeVisible({ timeout: 10_000 });
  });

  test('after scripted demo ends, done state appears', async ({ page }) => {
    const ttsOk = await isTtsAvailable('http://localhost:3001');
    test.skip(!ttsOk, 'TTS API keys not configured — scripted demo cannot generate audio');
    test.setTimeout(120_000);
    await navigateToVoiceSetup(page, 'Sarah Chen');
    await page.getByText('Start Scripted Demo', { exact: false }).first().click();
    await expect(
      page.getByText('Call completed', { exact: false }).first()
    ).toBeVisible({ timeout: 110_000 });
    await expect(
      page.getByText('Return to Dashboard').first()
    ).toBeVisible({ timeout: 10_000 });
    await takeScreenshot(page, 'call-done-state');
  });
});
