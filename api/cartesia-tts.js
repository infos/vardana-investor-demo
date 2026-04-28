// Cartesia streaming TTS — pipes audio bytes to the client as they arrive
// from Cartesia. Used by the live demo for low-latency playback.
// For blob-style (full buffer) responses, see api/tts.js
import { Readable } from 'stream';

const CARTESIA_KEY = (process.env.CARTESIA_API_KEY || '').trim();

// Canonical Cartesia voice IDs — kept in sync with api/tts.js
const CARTESIA_VOICES = {
  AI: 'f9836c6e-a0bd-460e-9d3c-f7299fa60f94',
  Marcus: 'a5136bf9-224c-4d76-b823-52bd5efcffcc',
};

// Normalize text for natural spoken audio — applied before the Cartesia call
function normalizeForSpeech(text) {
  return text
    .replace(/\b911\b/g, 'nine one one')   // prevent "nine hundred eleven"
    .replace(/\b(\d+)\/(\d+)\s*mmHg/g, '$1 over $2 millimeters of mercury')
    .replace(/\b(\d+)\/(\d+)\b(?!\s*mmHg)/g, (m, a, b) => /^\d{1,3}$/.test(a) && /^\d{1,3}$/.test(b) ? `${a} over ${b}` : m);
}

// Returns a streaming Response from Cartesia, or throws on non-OK status
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
        speed: speaker === 'AI' ? 0.70 : (speaker === 'Marcus' ? 0.80 : 0.65),
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

  if (!CARTESIA_KEY) {
    return res.status(503).json({ error: 'CARTESIA_API_KEY not configured' });
  }

  const text = normalizeForSpeech(rawText);

  try {
    const upstreamRes = await fetchCartesia(text, speaker || 'AI');
    // Stream chunks to client — audio playback starts on first chunk
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-TTS-Provider', 'cartesia');
    res.statusCode = 200;
    const readable = Readable.fromWeb(upstreamRes.body);
    readable.on('error', (err) => {
      console.error('[cartesia-tts] stream error:', err.message);
      res.end();
    });
    readable.pipe(res);
  } catch (err) {
    console.error('[cartesia-tts] Cartesia call failed:', err.message);
    if (!res.headersSent) {
      return res.status(503).json({ error: `TTS failed — ${err.message}` });
    }
    res.end();
  }
}
