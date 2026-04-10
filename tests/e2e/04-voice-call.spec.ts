import { test, expect } from '@playwright/test';
import { navigateToVoiceSetup, takeScreenshot, isTtsAvailable } from '../helpers/test-utils';

// Scripted demo tests require Cartesia TTS API to generate audio.
// Tests skip gracefully when CARTESIA_API_KEY is not configured locally.

test.describe('Scripted Voice Demo (Sarah Chen)', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToVoiceSetup(page, 'Sarah Chen');
  });

  test('start scripted demo shows loading progress', async ({ page }) => {
    // Click the scripted demo button — loading UI shows regardless of TTS availability
    await page.getByText('Start Scripted Demo', { exact: false }).first().click();
    // Loading screen shows "Generating audio" and a progress indicator
    await expect(page.getByText('Generating audio').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('%', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('scripted demo plays through transcript', async ({ page }) => {
    const ttsOk = await isTtsAvailable('http://localhost:3001');
    test.skip(!ttsOk, 'TTS API keys not configured — scripted demo cannot generate audio');
    test.setTimeout(120_000);
    await page.getByText('Start Scripted Demo', { exact: false }).first().click();
    await expect(
      page.getByText('Good morning Sarah', { exact: false }).first()
    ).toBeVisible({ timeout: 90_000 });
    await expect(
      page.getByText('ankles', { exact: false }).first()
    ).toBeVisible({ timeout: 60_000 });
  });

  test('FHIR activity log populates during call', async ({ page }) => {
    const ttsOk = await isTtsAvailable('http://localhost:3001');
    test.skip(!ttsOk, 'TTS API keys not configured — scripted demo cannot generate audio');
    test.setTimeout(120_000);
    await page.getByText('Start Scripted Demo', { exact: false }).first().click();
    await expect(page.getByText('FHIR Activity').first()).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText('Identity verified', { exact: false }).first()
    ).toBeVisible({ timeout: 90_000 });
  });

  test('patient chart visible in right panel (DOB, conditions, meds)', async ({ page }) => {
    const ttsOk = await isTtsAvailable('http://localhost:3001');
    test.skip(!ttsOk, 'TTS API keys not configured — scripted demo cannot generate audio');
    test.setTimeout(120_000);
    await page.getByText('Start Scripted Demo', { exact: false }).first().click();
    await expect(page.getByText('Patient Chart').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('July 14, 1958').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('HFpEF', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Carvedilol').first()).toBeVisible({ timeout: 10_000 });
  });

  test('call eventually reaches done state', async ({ page }) => {
    const ttsOk = await isTtsAvailable('http://localhost:3001');
    test.skip(!ttsOk, 'TTS API keys not configured — scripted demo cannot generate audio');
    test.setTimeout(120_000);
    await page.getByText('Start Scripted Demo', { exact: false }).first().click();
    await expect(
      page.getByText('Call completed', { exact: false }).first()
    ).toBeVisible({ timeout: 110_000 });
    await takeScreenshot(page, 'scripted-demo-done');
  });
});
