import { test, expect } from '@playwright/test';

// TTS API depends on ELEVENLABS_API_KEY or CARTESIA_API_KEY.
// When keys are missing, the endpoint returns 503. Tests skip gracefully in that case.

test.describe('TTS API — /api/elevenlabs-tts', () => {

  /** Preflight: check if TTS API is available (keys configured) */
  let ttsAvailable = true;

  test('TTS endpoint is reachable (preflight)', async ({ request }) => {
    const res = await request.post('/api/elevenlabs-tts', {
      data: { text: 'test', speaker: 'AI' },
    });
    if (res.status() === 503) {
      ttsAvailable = false;
      console.log('⚠️  TTS API returned 503 — API keys not configured. Subsequent TTS tests will be skipped.');
    }
    // Accept 200 (working) or 503 (keys missing) — anything else is a real error
    expect([200, 503]).toContain(res.status());
  });

  test('returns audio for AI speaker', async ({ request }) => {
    test.skip(!ttsAvailable, 'TTS API keys not configured');
    const res = await request.post('/api/elevenlabs-tts', {
      data: { text: 'Hello, this is a test.', speaker: 'AI' },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('audio');
    const body = await res.body();
    expect(body.length).toBeGreaterThan(1000);
  });

  test('returns audio for Patient speaker', async ({ request }) => {
    test.skip(!ttsAvailable, 'TTS API keys not configured');
    const res = await request.post('/api/elevenlabs-tts', {
      data: { text: 'I am feeling a little tired today.', speaker: 'Sarah' },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('audio');
    const body = await res.body();
    expect(body.length).toBeGreaterThan(1000);
  });

  test('returns valid MP3 data (check header bytes)', async ({ request }) => {
    test.skip(!ttsAvailable, 'TTS API keys not configured');
    const res = await request.post('/api/elevenlabs-tts', {
      data: { text: 'Testing audio format.', speaker: 'AI' },
    });
    expect(res.status()).toBe(200);
    const body = await res.body();

    // MP3 files start with either:
    // - ID3 tag: bytes 0x49 0x44 0x33 ("ID3")
    // - MPEG frame sync: 0xFF followed by 0xE0+
    const b0 = body[0];
    const b1 = body[1];
    const b2 = body[2];
    const hasID3 = b0 === 0x49 && b1 === 0x44 && b2 === 0x33;
    const hasMPEGSync = b0 === 0xFF && (b1 & 0xE0) >= 0xE0;
    expect(hasID3 || hasMPEGSync).toBe(true);
  });

  test('handles empty text gracefully', async ({ request }) => {
    const res = await request.post('/api/elevenlabs-tts', {
      data: { text: '', speaker: 'AI' },
    });
    // Empty text should return 400 (text required)
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('handles missing text field', async ({ request }) => {
    const res = await request.post('/api/elevenlabs-tts', {
      data: { speaker: 'AI' },
    });
    // Missing text should return 400
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('text');
  });

  test('handles long text', async ({ request }) => {
    test.skip(!ttsAvailable, 'TTS API keys not configured');
    const longText = 'This is a longer sentence to test that the TTS API can handle paragraphs of text. ' +
      'Sarah, I want to let you know that your care coordinator Nurse Rachel Kim will be reaching out ' +
      'to follow up on the weight changes we discussed. In the meantime, please continue to weigh ' +
      'yourself each morning and keep track of your sodium intake.';
    const res = await request.post('/api/elevenlabs-tts', {
      data: { text: longText, speaker: 'AI' },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('audio');
    const body = await res.body();
    expect(body.length).toBeGreaterThan(5000);
  });

  test('defaults to AI voice when speaker not specified', async ({ request }) => {
    test.skip(!ttsAvailable, 'TTS API keys not configured');
    const res = await request.post('/api/elevenlabs-tts', {
      data: { text: 'Testing default speaker.' },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('audio');
  });
});
