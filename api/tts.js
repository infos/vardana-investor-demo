// TTS API — Cartesia Sonic (blob endpoint, full buffer returned)
// Used by: scripted/recorded demo preload, failsafe pre-cache
// For live streaming playback, see api/cartesia-tts.js

// ── Healthcare text normalizer for TTS pronunciation ──
function normalizeForTTS(text) {
  let t = text;

  // Emergency numbers: "911" → "nine one one"
  t = t.replace(/\b911\b/g, 'nine one one');

  // Blood pressure: "158/98" → "158 over 98"
  t = t.replace(/(\d{2,3})\/(\d{2,3})/g, '$1 over $2');

  // Lab values with units: "186 mg/dL" → "186 milligrams per deciliter"
  t = t.replace(/\bmg\/dL\b/gi, 'milligrams per deciliter');
  t = t.replace(/\bmmHg\b/gi, 'millimeters of mercury');
  t = t.replace(/\bBPM\b/g, 'beats per minute');

  // Medical abbreviations
  t = t.replace(/\bHFrEF\b/g, 'H F ref');
  t = t.replace(/\bNYHA\b/g, 'N Y H A');
  t = t.replace(/\bCHF\b/g, 'congestive heart failure');
  t = t.replace(/\bHTN\b/g, 'hypertension');
  t = t.replace(/\bT2DM\b/g, 'type 2 diabetes');
  t = t.replace(/\bBP\b/g, 'blood pressure');
  t = t.replace(/\bHR\b/g, 'heart rate');
  t = t.replace(/\bSpO2\b/g, 'oxygen saturation');
  t = t.replace(/\bACE\b/g, 'ace');
  t = t.replace(/\bARB\b/g, 'A R B');
  t = t.replace(/\bEF\b/g, 'ejection fraction');

  // Medication pronunciation hints (plain-text aliases)
  t = t.replace(/\bLisinopril\b/gi, 'ly-SIN-oh-pril');
  t = t.replace(/\bMetoprolol\b/gi, 'meh-TOE-pro-lol');
  t = t.replace(/\bFurosemide\b/gi, 'fyoor-OH-seh-mide');
  t = t.replace(/\bAmlodipine\b/gi, 'am-LOD-ih-peen');
  t = t.replace(/\bMetformin\b/gi, 'met-FOR-min');
  t = t.replace(/\bAtorvastatin\b/gi, 'ah-TOR-vah-stah-tin');
  t = t.replace(/\bLosartan\b/gi, 'low-SAR-tan');
  t = t.replace(/\bHydralazine\b/gi, 'hy-DRAL-ah-zeen');
  t = t.replace(/\bCarvedilol\b/gi, 'car-VED-ih-lol');
  t = t.replace(/\bSpironolactone\b/gi, 'speer-oh-no-LAK-tone');

  return t;
}

const CARTESIA_KEY = (process.env.CARTESIA_API_KEY || '').trim();

// Canonical Cartesia voice IDs — used by both /api/tts (blob) and /api/cartesia-tts (stream)
const CARTESIA_VOICES = {
  AI: 'f9836c6e-a0bd-460e-9d3c-f7299fa60f94',
  Sarah: 'e07c00bc-4134-4eae-9ea4-1a55fb45746b',
  Marcus: 'a5136bf9-224c-4d76-b823-52bd5efcffcc',
};

async function cartesiaTTS(text, speaker) {
  const res = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      'X-API-Key': CARTESIA_KEY,
      'Cartesia-Version': '2025-04-16',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: 'sonic',
      transcript: text,
      voice: {
        mode: 'id',
        id: CARTESIA_VOICES[speaker] || CARTESIA_VOICES.AI,
      },
      output_format: {
        container: 'mp3',
        sample_rate: 24000,
        bit_rate: 128000,
      },
      language: 'en',
      generation_config: {
        speed: speaker === 'AI' ? 0.78 : (speaker === 'Marcus' ? 0.80 : 0.65),
        emotion: 'calm',
      },
    }),
  });
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j?.message || j?.error || ''; } catch {}
    throw new Error(`Cartesia ${res.status}${detail ? ': ' + detail : ''}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { text, speaker } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });

  if (!CARTESIA_KEY) {
    return res.status(503).json({ error: 'CARTESIA_API_KEY not configured' });
  }

  // Normalize medical terms and numbers for better TTS pronunciation
  const normalizedText = normalizeForTTS(text);

  try {
    const audioBuf = await cartesiaTTS(normalizedText, speaker || 'AI');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-TTS-Provider', 'cartesia');
    res.status(200).send(audioBuf);
  } catch (err) {
    console.error('[TTS] Cartesia call failed:', err.message);
    return res.status(503).json({ error: `TTS failed — ${err.message}` });
  }
}
