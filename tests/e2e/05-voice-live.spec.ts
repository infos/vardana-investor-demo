import { test, expect } from '@playwright/test';
import { navigateToVoiceSetup, isChatAvailable } from '../helpers/test-utils';

// Live demo tests require ANTHROPIC_API_KEY for the voice-chat endpoint.
// Tests skip gracefully when the key is not configured locally.

test.describe('Live Voice Demo (text input fallback)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await navigateToVoiceSetup(page, 'Sarah Chen');
  });

  test('start live demo shows AI greeting in transcript', async ({ page }) => {
    const chatOk = await isChatAvailable('http://localhost:3001');
    test.skip(!chatOk, 'ANTHROPIC_API_KEY not configured — live demo cannot run');
    test.setTimeout(60_000);
    await page.getByText('Start Live Demo').first().click();
    await expect(
      page.getByText('Good morning', { exact: false }).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test('can type in text input and submit', async ({ page }) => {
    const chatOk = await isChatAvailable('http://localhost:3001');
    test.skip(!chatOk, 'ANTHROPIC_API_KEY not configured — live demo cannot run');
    test.setTimeout(60_000);
    await page.getByText('Start Live Demo').first().click();
    const textInput = page.locator('input[placeholder*="Type"]');
    await expect(textInput.first()).toBeVisible({ timeout: 30_000 });
    await textInput.first().fill('Hi, I am feeling okay today.');
    await textInput.first().press('Enter');
    await expect(
      page.getByText('I am feeling okay today', { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('DOB verification accepts correct date ("July 14 1958")', async ({ page }) => {
    const chatOk = await isChatAvailable('http://localhost:3001');
    test.skip(!chatOk, 'ANTHROPIC_API_KEY not configured — live demo cannot run');
    test.setTimeout(90_000);
    await page.getByText('Start Live Demo').first().click();
    const textInput = page.locator('input[placeholder*="Type"]');
    await expect(textInput.first()).toBeVisible({ timeout: 30_000 });
    await textInput.first().fill('Hi, I am doing fine.');
    await textInput.first().press('Enter');
    await expect(
      page.getByText('date of birth', { exact: false }).first()
    ).toBeVisible({ timeout: 30_000 });
    await textInput.first().fill('July 14 1958');
    await textInput.first().press('Enter');
    await expect(
      page.getByText('verified', { exact: false }).first()
    ).toBeVisible({ timeout: 30_000 });
  });
});
