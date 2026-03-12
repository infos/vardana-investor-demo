import { test, expect } from '@playwright/test';
import { navigateToVoiceSetup, navigateToCoordinator, selectPatient, openVoiceCall, waitForCallScreen } from '../helpers/test-utils';

test.describe('Voice Call Setup', () => {
  test('Sarah Chen voice setup shows both Live Demo and Scripted Demo', async ({ page }) => {
    await navigateToVoiceSetup(page, 'Sarah Chen');
    await expect(page.getByText('Start Live Demo').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Start Scripted Demo', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Robert Williams voice setup shows both Live Demo and Scripted Demo', async ({ page }) => {
    await navigateToVoiceSetup(page, 'Robert Williams');
    await expect(page.getByText('Start Live Demo').first()).toBeVisible({ timeout: 10_000 });
    // Scripted demo is available for all non-Epic patients
    await expect(page.getByText('Start Scripted Demo', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('setup screen shows patient name', async ({ page }) => {
    await navigateToVoiceSetup(page, 'Sarah Chen');
    // The setup screen header shows "Voice Demo · AI Concierge Call · {patient.name}"
    // and the scenario card also shows the patient name
    await expect(page.getByText('Sarah Chen').first()).toBeVisible({ timeout: 10_000 });
  });
});
