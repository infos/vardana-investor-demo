/**
 * 5 Live Demo Browser Scenarios — runs in real Chromium on localhost
 * Tests the full conversation flow: greeting → DOB → symptoms → AI response
 *
 * Usage: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome node tests/browser-scenarios.mjs
 */
import { chromium } from 'playwright';

const CHROME_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';
const BASE_URL = 'http://localhost:3001';
const TIMEOUT = 60_000;

let passed = 0, failed = 0;
const results = [];

async function runScenario(name, steps) {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox', '--disable-gpu',
      '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
      '--no-proxy-server',
    ],
  });
  const context = await browser.newContext({
    permissions: ['microphone'],
    viewport: { width: 1440, height: 900 },
  });

  // Headless Chromium stubs — must run before any page scripts
  await context.addInitScript(() => {
    // navigator.mediaDevices doesn't exist in headless — create it
    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: () => Promise.resolve(new MediaStream()) },
        writable: true,
      });
    } else {
      navigator.mediaDevices.getUserMedia = () => Promise.resolve(new MediaStream());
    }
    // Kill AudioContext entirely — native decodeAudioData prototype stubs are unreliable
    // in headless Chrome. Without AudioContext, playAudioUrl always uses the HTML5 Audio
    // fallback path, which we can stub reliably.
    delete window.AudioContext;
    delete window.webkitAudioContext;
    // Stub HTML5 Audio to fire onended after play() is called
    window.Audio = function(src) {
      const audio = {
        volume: 1, onended: null, onerror: null, ontimeupdate: null,
        duration: 0.1, currentTime: 0, src: src || '',
        play() {
          const self = this;
          setTimeout(() => { if (self.onended) self.onended(); }, 50);
          return Promise.resolve();
        },
        pause() {},
      };
      return audio;
    };
    // Stub speechSynthesis to resolve immediately
    if (window.speechSynthesis) {
      window.speechSynthesis.speak = function(utt) {
        setTimeout(() => { if (utt.onend) utt.onend(); }, 50);
      };
      window.speechSynthesis.cancel = function() {};
    }
    // SpeechRecognition → auto-fail so text input fallback activates (fast — 10ms)
    const FakeSR = function() {};
    FakeSR.prototype.start = function() {
      setTimeout(() => { if (this.onerror) this.onerror({ error: 'not-allowed' }); }, 10);
    };
    FakeSR.prototype.abort = function() {};
    FakeSR.prototype.stop = function() {};
    window.SpeechRecognition = FakeSR;
    window.webkitSpeechRecognition = FakeSR;
  });

  const page = await context.newPage();
  const start = Date.now();

  try {
    // Block external requests that would hang behind the proxy
    await page.route('**/*.googleapis.com/**', route => route.abort());
    await page.route('**/*.gstatic.com/**', route => route.abort());

    // Mock TTS — return a tiny WAV (headless Chrome can decode this)
    await page.route('**/api/elevenlabs-tts', async route => {
      // Minimal 44-byte WAV header + 0 data frames = instant silent audio
      const wav = Buffer.alloc(44);
      wav.write('RIFF', 0); wav.writeUInt32LE(36, 4); wav.write('WAVE', 8);
      wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
      wav.writeUInt16LE(1, 22); wav.writeUInt32LE(22050, 24); wav.writeUInt32LE(22050, 28);
      wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write('data', 36); wav.writeUInt32LE(0, 40);
      await route.fulfill({ status: 200, contentType: 'audio/wav', body: wav });
    });

    // Navigate to voice setup for Sarah Chen
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForSelector('text=Care Coordinator', { timeout: 15_000 });
    await page.getByText('Care Coordinator').first().click();
    await page.waitForSelector('text=Patient Roster', { timeout: 10_000 });
    await page.getByText('Sarah Chen').first().click();
    await page.waitForTimeout(500);
    await page.getByText('Contact Patient').first().click();
    await page.waitForTimeout(500);
    await page.getByText('Initiate Voice Call Now').first().click();
    await page.waitForSelector('text=Start Live Demo', { timeout: 10_000 });

    // Start live demo
    await page.getByText('Start Live Demo').first().click();

    // Wait for text input to appear (means AI greeting is playing/played)
    const textInput = page.locator('input[placeholder*="Type"]');
    await textInput.first().waitFor({ timeout: 30_000 });

    // Run scenario-specific steps
    await steps(page, textInput);

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    passed++;
    results.push({ name, status: 'PASS', duration });
    console.log(`  \u2705 ${name} (${duration}s)`);
  } catch (e) {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    failed++;
    results.push({ name, status: 'FAIL', duration, error: e.message });
    console.log(`  \u274C ${name} (${duration}s): ${e.message.slice(0, 150)}`);
    try { await page.screenshot({ path: `tests/screenshots/fail-${name.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}.png` }); } catch {}
  } finally {
    await browser.close();
  }
}

// Helper: type patient response and press Enter
// Wait briefly so the app can set up _liveTextResolve after audio playback + speech recognition fail
async function say(textInput, text, page) {
  if (page) await page.waitForTimeout(400);
  await textInput.first().fill(text);
  await textInput.first().press('Enter');
}

// Helper: wait for AI text to appear in transcript
async function waitForAI(page, text, timeout = TIMEOUT) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout });
}

console.log('\n\u2550'.repeat(60));
console.log('  VARDANA BROWSER SCENARIOS \u2014 5 Live Demo Tests (Chromium)');
console.log('\u2550'.repeat(60) + '\n');

// ═══════════════════════════════════════════════════════════════
// SCENARIO 1: Happy path — greeting → DOB verified → symptoms → assessment
// ═══════════════════════════════════════════════════════════════
await runScenario('S1: Happy path (DOB verified, stable patient)', async (page, textInput) => {
  // Wait for AI greeting
  await waitForAI(page, 'Good morning');

  // Patient greets back
  await say(textInput, 'Hi, I am feeling pretty good today.', page);

  // AI should ask for DOB (this was the broken flow we fixed!)
  await waitForAI(page, 'date of birth');

  // Patient gives correct DOB
  await say(textInput, 'July 14, 1958', page);

  // AI should confirm identity verified
  await waitForAI(page, 'verified');

  // Patient responds to symptoms check
  await say(textInput, 'No, I feel fine. No swelling or shortness of breath.', page);

  // AI should respond with clinical assessment
  await page.waitForTimeout(10_000); // wait for LLM + TTS
  const bodyText = await page.locator('body').textContent();
  if (!bodyText.toLowerCase().includes('verified')) throw new Error('Never saw identity verification');
});

// ═══════════════════════════════════════════════════════════════
// SCENARIO 2: Wrong DOB → retry → correct DOB
// ═══════════════════════════════════════════════════════════════
await runScenario('S2: Wrong DOB then correct DOB on retry', async (page, textInput) => {
  await waitForAI(page, 'Good morning');
  await say(textInput, 'Hello, doing okay.', page);
  await waitForAI(page, 'date of birth');

  // Give wrong DOB first
  await say(textInput, 'March 5, 1960', page);
  await waitForAI(page, "didn't match");

  // Give correct DOB
  await say(textInput, 'July 14, 1958', page);
  await waitForAI(page, 'verified');
});

// ═══════════════════════════════════════════════════════════════
// SCENARIO 3: Patient reports concerning symptoms (edema + dyspnea)
// ═══════════════════════════════════════════════════════════════
await runScenario('S3: Concerning symptoms (edema + breathing difficulty)', async (page, textInput) => {
  await waitForAI(page, 'Good morning');
  await say(textInput, 'Not great honestly.', page);
  await waitForAI(page, 'date of birth');
  await say(textInput, '7/14/1958', page);
  await waitForAI(page, 'verified');

  // Report concerning symptoms
  await say(textInput, 'My ankles are really swollen and I have been having trouble breathing, especially when I try to lie flat at night.', page);

  // AI should respond with clinical concern — wait for response
  await page.waitForTimeout(15_000);
  const bodyText = await page.locator('body').textContent();
  const lower = bodyText.toLowerCase();
  // Should mention risk assessment or care team given the symptoms
  const hasRiskLanguage = lower.includes('risk') || lower.includes('concern') || lower.includes('care team') || lower.includes('coordinator') || lower.includes('notify') || lower.includes('important') || lower.includes('swelling');
  if (!hasRiskLanguage) throw new Error('AI did not express clinical concern for serious symptoms');
});

// ═══════════════════════════════════════════════════════════════
// SCENARIO 4: DOB fails 3 times → call ends gracefully
// ═══════════════════════════════════════════════════════════════
await runScenario('S4: DOB fails 3 times — graceful call end', async (page, textInput) => {
  await waitForAI(page, 'Good morning');
  await say(textInput, 'Hi there.', page);
  await waitForAI(page, 'date of birth');

  // Fail DOB 3 times
  await say(textInput, 'January 1, 1990', page);
  await waitForAI(page, "didn't match");

  await say(textInput, 'February 2, 1985', page);
  await waitForAI(page, 'one more time', TIMEOUT);

  await say(textInput, 'December 25, 1970', page);

  // Should see identity verification failure message
  await waitForAI(page, 'verify your identity', TIMEOUT);
});

// ═══════════════════════════════════════════════════════════════
// SCENARIO 5: Scripted demo — plays through transcript with TTS audio
// ═══════════════════════════════════════════════════════════════
await runScenario('S5: Scripted demo plays through transcript', async (page, textInput) => {
  // Go back to setup — need to restart since we already clicked Start Live Demo
  // Actually, let's navigate fresh for scripted demo
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.waitForSelector('text=Care Coordinator', { timeout: 15_000 });
  await page.getByText('Care Coordinator').first().click();
  await page.waitForSelector('text=Patient Roster', { timeout: 10_000 });
  await page.getByText('Sarah Chen').first().click();
  await page.waitForTimeout(500);
  await page.getByText('Contact Patient').first().click();
  await page.waitForTimeout(500);
  await page.getByText('Initiate Voice Call Now').first().click();
  await page.waitForSelector('text=Start Scripted Demo', { timeout: 10_000 });

  // Start scripted demo
  await page.getByText('Start Scripted Demo').first().click();

  // Should show loading progress
  const loadingOrTranscript = await Promise.race([
    page.getByText('Loading', { exact: false }).first().waitFor({ timeout: 15_000 }).then(() => 'loading'),
    page.getByText('Good morning', { exact: false }).first().waitFor({ timeout: 15_000 }).then(() => 'transcript'),
  ]);

  if (loadingOrTranscript === 'loading') {
    // Wait for transcript to start playing
    await waitForAI(page, 'Good morning', 60_000);
  }

  // Wait a few seconds for more transcript lines
  await page.waitForTimeout(5_000);
  const bodyText = await page.locator('body').textContent();
  if (!bodyText.includes('Good morning')) throw new Error('Scripted demo did not play transcript');
});

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n' + '\u2500'.repeat(60));
console.log(`  Result: ${passed} passed, ${failed} failed`);
console.log('\u2500'.repeat(60));
for (const r of results) {
  const icon = r.status === 'PASS' ? '\u2705' : '\u274C';
  console.log(`  ${icon}  ${r.name.padEnd(50)} ${r.duration}s`);
  if (r.error) console.log(`      \u2514\u2500 ${r.error.slice(0, 120)}`);
}
console.log('\u2550'.repeat(60) + '\n');

process.exit(failed > 0 ? 1 : 0);
