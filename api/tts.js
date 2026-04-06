// TTS API — Voice synthesis with primary + fallback providers

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
const TTS_API_KEY = (process.env.TTS_API_KEY || process.env.ELEVENLABS_API_KEY || '').trim();
const CARTESIA_KEY = (process.env.CARTESIA_API_KEY || '').trim();

// Voice IDs — override Marcus via MARCUS_VOICE_ID env var for custom recordings
const TTS_VOICES = {
  AI: '0fbdXLXuDBZXm2IHek4L',
  Sarah: 'RGb96Dcl0k5eVje8EBch',
  Marcus: process.env.MARCUS_VOICE_ID || '9N8nIBnvZ0Hbs6qhIqpt',
};

// Cartesia fallback voices
const CARTESIA_VOICES = {
  AI: 'f9836c6e-a0bd-460e-9d3c-f7299fa60f94',
  Sarah: 'e07c00bc-4134-4eae-9ea4-1a55fb45746b',
  Marcus: 'a5136bf9-224c-4d76-b823-52bd5efcffcc',
};

async function primaryTTS(text, speaker) {
  const voiceId = TTS_VOICES[speaker] || TTS_VOICES.AI;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': TTS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: speaker === 'AI' ? 0.82 : 0.78,
        similarity_boost: 0.75,
        style: speaker === 'AI' ? 0.05 : 0.10,
        use_speaker_boost: true,
        speed: speaker === 'AI' ? 0.95 : (speaker === 'Marcus' ? 0.88 : 0.78),
      },
    }),
  });
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j?.detail?.message || j?.detail || ''; } catch {}
    throw new Error(`[TTS] Primary provider ${res.status}${detail ? ': ' + detail : ''}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

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
        speed: speaker === 'AI' ? 0.85 : (speaker === 'Marcus' ? 0.88 : 0.78),
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

  // Normalize medical terms and numbers for better TTS pronunciation
  const normalizedText = normalizeForTTS(text);

  try {
    let audioBuf;
    let ttsProvider = 'none';

    let primaryError = '';
    let fallbackError = '';

    // Primary voice synthesis provider (ElevenLabs handles pronunciation well, use original text)
    if (TTS_API_KEY) {
      try {
        audioBuf = await primaryTTS(text, speaker || 'AI');
        ttsProvider = 'primary';
      } catch (e) {
        primaryError = e.message;
        console.error('[TTS] Primary failed, trying fallback:', e.message);
      }
    }

    // Fallback: Cartesia Sonic (use normalized text for better pronunciation)
    if (!audioBuf && CARTESIA_KEY) {
      try {
        audioBuf = await cartesiaTTS(normalizedText, speaker || 'AI');
        ttsProvider = 'cartesia';
      } catch (e) {
        fallbackError = e.message;
        console.error('[TTS] Fallback also failed:', e.message);
      }
    }

    if (!audioBuf) {
      const hasKeys = !!(TTS_API_KEY || CARTESIA_KEY);
      const details = [primaryError && `primary: ${primaryError}`, fallbackError && `fallback: ${fallbackError}`].filter(Boolean).join('; ');
      return res.status(503).json({
        error: hasKeys
          ? `TTS failed — ${details || 'unknown'}`
          : 'All TTS providers unavailable. Set TTS_API_KEY or CARTESIA_API_KEY.',
      });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuf.byteLength);
    res.setHeader('X-TTS-Provider', ttsProvider);
    return res.status(200).send(audioBuf);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
