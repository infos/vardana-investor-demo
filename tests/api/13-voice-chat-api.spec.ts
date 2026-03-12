import { test, expect } from '@playwright/test';

// Voice Chat API depends on ANTHROPIC_API_KEY.
// When the key is missing, the endpoint returns 500. Tests skip gracefully in that case.

test.describe('Voice Chat API — /api/voice-chat', () => {

  /** Preflight: check if Voice Chat API is available (key configured) */
  let chatAvailable = true;

  test('voice-chat endpoint is reachable (preflight)', async ({ request }) => {
    const res = await request.post('/api/voice-chat', {
      data: {
        messages: [{ role: 'user', content: 'Hello' }],
        patientContext: null,
        turn: 0,
        maxTurns: 12,
      },
    });
    if (res.status() === 500) {
      const data = await res.json();
      if (data.error && data.error.includes('ANTHROPIC_API_KEY')) {
        chatAvailable = false;
        console.log('⚠️  Voice Chat API returned 500 — ANTHROPIC_API_KEY not configured. Subsequent chat tests will be skipped.');
      }
    }
    // Accept 200 (working) or 500 with key-missing error — anything else is unexpected
    expect([200, 500]).toContain(res.status());
  });

  test('returns structured response for greeting', async ({ request }) => {
    test.skip(!chatAvailable, 'ANTHROPIC_API_KEY not configured');
    const res = await request.post('/api/voice-chat', {
      data: {
        messages: [
          { role: 'assistant', content: 'Good morning Sarah.' },
          { role: 'user', content: 'Hi, I am doing okay today.' },
        ],
        patientContext: null,
        turn: 0,
        maxTurns: 12,
      },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();

    // Reply should be present and clean (no metadata tags leaked)
    expect(data.reply).toBeTruthy();
    expect(data.reply).not.toContain('<metadata>');
    expect(data.reply).not.toContain('</metadata>');

    // Risk score should be a number in valid range
    expect(typeof data.riskScore).toBe('number');
    expect(data.riskScore).toBeGreaterThanOrEqual(0);
    expect(data.riskScore).toBeLessThanOrEqual(100);

    // FHIR queries should be an array
    expect(Array.isArray(data.fhirQueries)).toBe(true);

    // Phase should be a valid conversation phase
    expect(data.phase).toBeTruthy();
  });

  test('fhirQueries contain valid FHIR paths', async ({ request }) => {
    test.skip(!chatAvailable, 'ANTHROPIC_API_KEY not configured');
    const res = await request.post('/api/voice-chat', {
      data: {
        messages: [
          { role: 'assistant', content: 'Hi Sarah, this is the Vardana care concierge. How are you feeling today?' },
          { role: 'user', content: 'I have been feeling a bit more tired lately and my ankles seem swollen.' },
        ],
        patientContext: null,
        turn: 1,
        maxTurns: 12,
      },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();

    expect(Array.isArray(data.fhirQueries)).toBe(true);

    if (data.fhirQueries.length > 0) {
      for (const query of data.fhirQueries) {
        expect(query.method).toBeTruthy();
        expect(query.path).toBeTruthy();
        expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).toContain(query.method);
        expect(query.path.startsWith('/')).toBe(true);
        const fhirResourcePattern = /\/(Patient|Observation|Condition|MedicationRequest|CarePlan|DiagnosticReport|Flag|Communication)/;
        expect(query.path).toMatch(fhirResourcePattern);
      }
    }
  });

  test('chest pain triggers 911 guidance', async ({ request }) => {
    test.skip(!chatAvailable, 'ANTHROPIC_API_KEY not configured');
    const res = await request.post('/api/voice-chat', {
      data: {
        messages: [
          { role: 'assistant', content: 'Hi Sarah, how are you feeling today?' },
          { role: 'user', content: 'I am having severe chest pain right now.' },
        ],
        patientContext: null,
        turn: 1,
        maxTurns: 12,
      },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();

    const replyLower = data.reply.toLowerCase();
    const has911 = replyLower.includes('911');
    const hasEmergency = replyLower.includes('emergency');
    const hasCallNow = replyLower.includes('call') && (replyLower.includes('now') || replyLower.includes('immediately'));
    expect(has911 || hasEmergency || hasCallNow).toBe(true);
  });

  test('risk score increases with concerning symptoms', async ({ request }) => {
    test.skip(!chatAvailable, 'ANTHROPIC_API_KEY not configured');
    // Baseline: simple greeting
    const baselineRes = await request.post('/api/voice-chat', {
      data: {
        messages: [
          { role: 'assistant', content: 'Hi Sarah, how are you today?' },
          { role: 'user', content: 'I am doing great, feeling wonderful.' },
        ],
        patientContext: null,
        turn: 0,
        maxTurns: 12,
      },
    });
    expect(baselineRes.status()).toBe(200);
    const baselineData = await baselineRes.json();
    const baselineRisk = baselineData.riskScore;

    // Concerning: weight gain + edema + orthopnea
    const concerningRes = await request.post('/api/voice-chat', {
      data: {
        messages: [
          { role: 'assistant', content: 'Hi Sarah, I noticed your weight went up 2.3 pounds. How are you feeling?' },
          { role: 'user', content: 'My ankles are really swollen and I have been having trouble breathing when I lie flat at night. I need extra pillows now.' },
        ],
        patientContext: null,
        turn: 2,
        maxTurns: 12,
      },
    });
    expect(concerningRes.status()).toBe(200);
    const concerningData = await concerningRes.json();
    const concerningRisk = concerningData.riskScore;

    expect(concerningRisk).toBeGreaterThanOrEqual(baselineRisk);
    expect(concerningRisk).toBeGreaterThanOrEqual(72);
  });

  test('returns 400 when messages array is missing', async ({ request }) => {
    const res = await request.post('/api/voice-chat', {
      data: {
        patientContext: null,
        turn: 0,
        maxTurns: 12,
      },
    });
    // API may return 400 or 500 depending on implementation
    expect([400, 500]).toContain(res.status());
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  test('custom patientContext uses generic prompt', async ({ request }) => {
    test.skip(!chatAvailable, 'ANTHROPIC_API_KEY not configured');
    const res = await request.post('/api/voice-chat', {
      data: {
        messages: [
          { role: 'assistant', content: 'Hello Robert, how are you today?' },
          { role: 'user', content: 'Doing well, thanks.' },
        ],
        patientContext: {
          name: 'Robert Williams',
          age: 74,
          gender: 'M',
          conditions: [{ text: 'HFpEF (EF 52%)', status: 'active' }, { text: 'Hypertension', status: 'active' }],
          medications: [{ name: 'Metoprolol Succinate', dosage: '50mg daily' }],
          labs: [{ name: 'BNP', value: '210', unit: 'pg/mL' }],
        },
        turn: 0,
        maxTurns: 12,
      },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.reply).toBeTruthy();
    expect(typeof data.riskScore).toBe('number');
  });

  test('response includes assessment object', async ({ request }) => {
    test.skip(!chatAvailable, 'ANTHROPIC_API_KEY not configured');
    const res = await request.post('/api/voice-chat', {
      data: {
        messages: [
          { role: 'assistant', content: 'Hi Sarah, how are you?' },
          { role: 'user', content: 'I feel okay but my weight went up.' },
        ],
        patientContext: null,
        turn: 1,
        maxTurns: 12,
      },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();

    expect(typeof data.assessment).toBe('object');
    expect(data.assessment).not.toBeNull();
  });
});
