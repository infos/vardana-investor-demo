// TTS API — Voice synthesis with primary + fallback providers
const TTS_API_KEY = (process.env.TTS_API_KEY || process.env.ELEVENLABS_API_KEY || '').trim();
const CARTESIA_KEY = (process.env.CARTESIA_API_KEY || '').trim();

// Voice IDs — override Marcus via MARCUS_VOICE_ID env var for custom recordings
const TTS_VOICES = {
  AI: '0fbdXLXuDBZXm2IHek4L',
  Sarah: 'RGb96Dcl0k5eVje8EBch',
  Marcus: process.env.MARCUS_VOICE_ID || 'TX3LPaxmHKxFdv7VOQHJ',
};

// Cartesia fallback voices
const CARTESIA_VOICES = {
  AI: 'f786b574-daa5-4673-aa0c-cbe3e8534c02',
  Sarah: '6ccbfb76-1fc6-48f7-b71d-91ac6298247b',
  Marcus: '421b3369-f63f-4b03-8980-37a44df1d4e8',
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
        speed: speaker === 'AI' ? 0.95 : 0.85,
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
        speed: speaker === 'AI' ? 0.85 : 1.0,
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

  try {
    let audioBuf;
    let ttsProvider = 'none';

    // Primary voice synthesis provider
    if (TTS_API_KEY) {
      try {
        audioBuf = await primaryTTS(text, speaker || 'AI');
        ttsProvider = 'primary';
      } catch (e) {
        console.error('[TTS] Primary failed, trying fallback:', e.message);
      }
    }

    // Fallback: Cartesia Sonic
    if (!audioBuf && CARTESIA_KEY) {
      try {
        audioBuf = await cartesiaTTS(text, speaker || 'AI');
        ttsProvider = 'cartesia';
      } catch (e) {
        console.error('[TTS] Fallback also failed:', e.message);
      }
    }

    if (!audioBuf) {
      return res.status(503).json({ error: 'All TTS providers unavailable. Set TTS_API_KEY or CARTESIA_API_KEY.' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuf.byteLength);
    res.setHeader('X-TTS-Provider', ttsProvider);
    return res.status(200).send(audioBuf);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
