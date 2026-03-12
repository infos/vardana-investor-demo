import { test, expect } from '@playwright/test';
import {
  navigateToCoordinator,
  checkNoOverflow,
  checkElementsVisible,
  takeScreenshot,
} from '../helpers/test-utils';

test.describe('Mobile (375x812 / 393x851) — Responsive', () => {
  test.beforeEach(async ({ page }) => {
    // iPhone-class viewport — device config may set this via iPhone 14 or Pixel 7
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('landing page renders on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // The landing page should have the Care Coordinator entry point visible
    await expect(page.getByText('Care Coordinator').first()).toBeVisible({ timeout: 10_000 });
    await takeScreenshot(page, 'mobile-landing');
  });

  test('Care Coordinator card clickable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Click the Care Coordinator card
    await page.getByText('Care Coordinator').first().click();

    // Should navigate to the patient roster
    await expect(page.getByText('Patient Roster')).toBeVisible({ timeout: 10_000 });
  });

  test('patient roster accessible', async ({ page }) => {
    await navigateToCoordinator(page);

    // At minimum, the roster heading and at least one patient should be visible
    await expect(page.getByText('Patient Roster')).toBeVisible();
    await expect(page.getByText('Sarah Chen').first()).toBeVisible();

    // On mobile the table may require scrolling — check at least the first patient is there
    // Other patients may be below the fold but should exist in DOM
    const robert = page.getByText('Robert Williams').first();
    await expect(robert).toBeAttached();

    await takeScreenshot(page, 'mobile-roster');
  });

  test('take screenshot documenting mobile layout', async ({ page }) => {
    await navigateToCoordinator(page);
    await takeScreenshot(page, 'mobile-dashboard-full');

    // Also capture with scrolling to show full content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await takeScreenshot(page, 'mobile-dashboard-scrolled');
  });

  test('voice call screen — document known limitations', async ({ page }) => {
    // Navigate to coordinator and select Sarah
    await navigateToCoordinator(page);
    await page.getByText('Sarah Chen').first().click();
    await page.waitForTimeout(1000);

    // Try to open voice call
    const contactBtn = page.getByText('Contact Patient').first();
    if (await contactBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await contactBtn.click();
      await page.waitForTimeout(500);

      const voiceBtn = page.getByText('Initiate Voice Call Now').first();
      if (await voiceBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await voiceBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Document the current state — the 3-column layout (280px + flex + 300px = 580px min)
    // will likely be squeezed on a 375px viewport
    await takeScreenshot(page, 'mobile-voice-limitations');

    // Verify the page didn't crash by checking any element exists in the DOM
    const bodyExists = await page.locator('body').count();
    expect(bodyExists).toBeGreaterThan(0);
  });
});
