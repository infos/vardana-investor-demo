// TTS API — ElevenLabs primary, Cartesia Sonic fallback
// Streams audio chunks as they arrive to minimize TTFB latency
import { Readable } from 'stream';

const ELEVENLABS_KEY = (process.env.ELEVENLABS_API_KEY || '').trim();
const CARTESIA_KEY = (process.env.CARTESIA_API_KEY || '').trim();

// ElevenLabs voices
const ELEVENLABS_VOICES = { AI: '0fbdXLXuDBZXm2IHek4L', Sarah: 'RGb96Dcl0k5eVje8EBch', Marcus: 'pNInz6obpgDQGcFmaJgB' };

// Cartesia fallback voices
const CARTESIA_VOICES = {
  AI: 'f786b574-daa5-4673-aa0c-cbe3e8534c02',
  Sarah: '6ccbfb76-1fc6-48f7-b71d-91ac6298247b',
  Marcus: 'a0e99841-438c-4a64-b679-ae501e7d6091',
};

// Normalize text for natural spoken audio — applied before all TTS calls
function normalizeForSpeech(text) {
  return text
    .replace(/\b911\b/g, 'nine one one')   // prevent "nine hundred eleven"
    .replace(/\b(\d+)\/(\d+)\s*mmHg/g, '$1 over $2 millimeters of mercury')
    .replace(/\b(\d+)\/(\d+)\b(?!\s*mmHg)/g, (m, a, b) => /^\d{1,3}$/.test(a) && /^\d{1,3}$/.test(b) ? `${a} over ${b}` : m);
}

// Returns a streaming Response, or throws on non-OK status
async function fetchElevenLabs(text, speaker) {
  const voiceId = ELEVENLABS_VOICES[speaker] || ELEVENLABS_VOICES.AI;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_KEY,
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
        speed: speaker === 'AI' ? 0.95 : (speaker === 'Marcus' ? 0.88 : 0.85),
      },
    }),
  });
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j?.detail?.message || j?.detail || ''; } catch {}
    throw new Error(`ElevenLabs ${res.status}${detail ? ': ' + detail : ''}`);
  }
  return res;
}

// Returns a streaming Response, or throws on non-OK status
async function fetchCartesia(text, speaker) {
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
  return res;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { text: rawText, speaker } = req.body || {};
  if (!rawText) return res.status(400).json({ error: 'text required' });
  const text = normalizeForSpeech(rawText);

  try {
    let upstreamRes = null;
    let ttsProvider = 'none';

    // Primary: ElevenLabs (streaming endpoint)
    if (ELEVENLABS_KEY) {
      try {
        upstreamRes = await fetchElevenLabs(text, speaker || 'AI');
        ttsProvider = 'elevenlabs';
      } catch (e) {
        console.error('ElevenLabs TTS failed, trying Cartesia:', e.message);
      }
    }

    // Fallback: Cartesia Sonic
    if (!upstreamRes && CARTESIA_KEY) {
      try {
        upstreamRes = await fetchCartesia(text, speaker || 'AI');
        ttsProvider = 'cartesia';
      } catch (e) {
        console.error('Cartesia TTS also failed:', e.message);
      }
    }

    if (!upstreamRes) {
      return res.status(503).json({ error: 'All TTS providers unavailable. Set ELEVENLABS_API_KEY or CARTESIA_API_KEY.' });
    }

    // Stream chunks to client — audio playback starts on first chunk
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-TTS-Provider', ttsProvider);
    res.statusCode = 200;
    const readable = Readable.fromWeb(upstreamRes.body);
    readable.on('error', () => res.end());
    readable.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message });
    }
    res.end();
  }
}
