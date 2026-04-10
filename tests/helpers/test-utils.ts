import { Page, expect } from '@playwright/test';

/** Navigate to Care Coordinator dashboard from landing page */
export async function navigateToCoordinator(page: Page) {
  await page.goto('/');
  await page.getByText('Care Coordinator').first().click();
  await page.waitForSelector('text=Patient Roster', { timeout: 10_000 });
}

/** Select a patient from the roster by name */
export async function selectPatient(page: Page, name: string) {
  await page.getByText(name).first().click();
  // Wait for patient detail to appear
  await page.waitForTimeout(500);
}

/** Open voice call from patient detail - clicks Contact Patient then Initiate Voice Call Now */
export async function openVoiceCall(page: Page) {
  await page.getByText('Contact Patient').first().click();
  await page.waitForTimeout(500);
  // OutreachModal opens with Voice Call pre-selected, click "Initiate Voice Call Now"
  await page.getByText('Initiate Voice Call Now').first().click();
  await page.waitForTimeout(500);
}

/** Wait for the voice call setup screen to appear */
export async function waitForCallScreen(page: Page) {
  await page.waitForSelector('text=Start Live Demo', { timeout: 10_000 });
}

/** Get all transcript lines from the voice call */
export async function getTranscriptLines(page: Page): Promise<string[]> {
  const lines = await page.locator('[class*="transcript"] >> text=/./').allTextContents();
  return lines.filter(l => l.trim().length > 0);
}

/** Check that no horizontal overflow exists at current viewport */
export async function checkNoOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow).toBe(false);
}

/** Check that multiple text elements are visible on page */
export async function checkElementsVisible(page: Page, texts: string[]) {
  for (const text of texts) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  }
}

/** Take a named screenshot for visual comparison */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `tests/screenshots/${name}.png`, fullPage: false });
}

/** Navigate through full flow: landing → coordinator → patient → voice call setup */
export async function navigateToVoiceSetup(page: Page, patientName: string) {
  await navigateToCoordinator(page);
  await selectPatient(page, patientName);
  await openVoiceCall(page);
  await waitForCallScreen(page);
}

/** Check if TTS API is available (Cartesia key configured).
 *  Returns true if TTS works, false if 503 (key missing). */
let _ttsChecked: boolean | null = null;
export async function isTtsAvailable(baseURL: string): Promise<boolean> {
  if (_ttsChecked !== null) return _ttsChecked;
  try {
    const res = await fetch(`${baseURL}/api/cartesia-tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'test', speaker: 'AI' }),
    });
    _ttsChecked = res.status === 200;
  } catch {
    _ttsChecked = false;
  }
  return _ttsChecked;
}

/** Check if Voice Chat API is available (ANTHROPIC_API_KEY configured).
 *  Returns true if chat works, false if 500 (key missing). */
let _chatChecked: boolean | null = null;
export async function isChatAvailable(baseURL: string): Promise<boolean> {
  if (_chatChecked !== null) return _chatChecked;
  try {
    const res = await fetch(`${baseURL}/api/voice-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }], patientContext: null, turn: 0, maxTurns: 1 }),
    });
    _chatChecked = res.status === 200;
  } catch {
    _chatChecked = false;
  }
  return _chatChecked;
}
