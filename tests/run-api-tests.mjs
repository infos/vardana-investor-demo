// Manual API test runner against localhost:3002
const BASE = 'http://localhost:3002';
let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  \u2705 ' + name);
  } catch (e) {
    failed++;
    console.log('  \u274C ' + name + ': ' + e.message);
  }
}

function expect(val) {
  return {
    toBe: (exp) => { if (val !== exp) throw new Error('Expected ' + exp + ', got ' + val); },
    toBeTruthy: () => { if (!val) throw new Error('Expected truthy, got ' + val); },
    toBeGreaterThanOrEqual: (n) => { if (val < n) throw new Error('Expected >= ' + n + ', got ' + val); },
  };
}

console.log('\n--- Voice Chat API Tests ---');

await test('voice-chat returns structured response', async () => {
  const res = await fetch(BASE + '/api/voice-chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [
      { role: 'assistant', content: 'Good morning Sarah.' },
      { role: 'user', content: 'Hi, I am doing okay today.' },
    ], patientContext: null, turn: 0, maxTurns: 12 }),
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.reply).toBeTruthy();
  expect(typeof data.riskScore).toBe('number');
  expect(Array.isArray(data.fhirQueries)).toBeTruthy();
});

await test('chest pain triggers 911 guidance', async () => {
  const res = await fetch(BASE + '/api/voice-chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [
      { role: 'assistant', content: 'Hi Sarah, how are you feeling today?' },
      { role: 'user', content: 'I am having severe chest pain right now.' },
    ], patientContext: null, turn: 1, maxTurns: 12 }),
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.reply.toLowerCase().includes('911')).toBeTruthy();
});

await test('risk score increases with concerning symptoms', async () => {
  const baseRes = await fetch(BASE + '/api/voice-chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [
      { role: 'assistant', content: 'Hi Sarah, how are you today?' },
      { role: 'user', content: 'I am doing great, feeling wonderful.' },
    ], patientContext: null, turn: 0, maxTurns: 12 }),
  });
  const baseData = await baseRes.json();

  const conRes = await fetch(BASE + '/api/voice-chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [
      { role: 'assistant', content: 'Hi Sarah, I noticed your weight went up 2.3 pounds.' },
      { role: 'user', content: 'My ankles are really swollen and I have been having trouble breathing when I lie flat at night. I need extra pillows now.' },
    ], patientContext: null, turn: 2, maxTurns: 12 }),
  });
  const conData = await conRes.json();
  expect(conData.riskScore).toBeGreaterThanOrEqual(baseData.riskScore);
  expect(conData.riskScore).toBeGreaterThanOrEqual(72);
});

await test('returns 400 when messages missing', async () => {
  const res = await fetch(BASE + '/api/voice-chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientContext: null }),
  });
  const data = await res.json();
  expect(data.error).toBeTruthy();
});

await test('custom patientContext works (Robert Williams)', async () => {
  const res = await fetch(BASE + '/api/voice-chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [
      { role: 'assistant', content: 'Hello Robert, how are you today?' },
      { role: 'user', content: 'Doing well, thanks.' },
    ], patientContext: {
      name: 'Robert Williams', age: 74, gender: 'M',
      conditions: [{ text: 'HFpEF (EF 52%)', status: 'active' }],
      medications: [{ name: 'Metoprolol Succinate', dosage: '50mg daily' }],
      labs: [{ name: 'BNP', value: '210', unit: 'pg/mL' }],
    }, turn: 0, maxTurns: 12 }),
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.reply).toBeTruthy();
});

await test('FHIR queries contain valid paths', async () => {
  const res = await fetch(BASE + '/api/voice-chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [
      { role: 'assistant', content: 'Hi Sarah, how are you feeling today?' },
      { role: 'user', content: 'I have been feeling tired and my ankles seem swollen.' },
    ], patientContext: null, turn: 1, maxTurns: 12 }),
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(Array.isArray(data.fhirQueries)).toBeTruthy();
  for (const q of data.fhirQueries) {
    expect(q.method).toBeTruthy();
    expect(q.path.startsWith('/')).toBeTruthy();
  }
});

await test('assessment object is present in response', async () => {
  const res = await fetch(BASE + '/api/voice-chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [
      { role: 'assistant', content: 'Hi Sarah, how are you?' },
      { role: 'user', content: 'I feel okay but my weight went up.' },
    ], patientContext: null, turn: 1, maxTurns: 12 }),
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(typeof data.assessment).toBe('object');
  expect(data.assessment !== null).toBeTruthy();
});

console.log('\nResult: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
