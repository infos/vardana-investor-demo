// Thin proxy: browser → this Vercel function → vardana-voice EC2 backend.
//
// Why this exists:
//   - The EC2 backend at voice.vardana.ai requires Authorization: Bearer
//     <VOICE_SESSION_TOKEN>. Routing through a Vercel function keeps that
//     token server-side instead of shipping it to every browser.
//   - Avoids CORS configuration on the backend.
//   - Makes the backend URL swappable per environment via VOICE_BACKEND_URL.
//
// Body shape from the browser: { patient_id, mode }
// Response: backend JSON passed through verbatim — { session_id, mode,
// livekit_url, room_name, patient_token }.

const VOICE_BACKEND_URL = (process.env.VOICE_BACKEND_URL || 'https://voice.vardana.ai').trim().replace(/\/$/, '');
const VOICE_SESSION_TOKEN = (process.env.VOICE_SESSION_TOKEN || '').trim();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (!VOICE_SESSION_TOKEN) {
    return res.status(500).json({ error: 'VOICE_SESSION_TOKEN not configured on this Vercel deployment' });
  }

  const { patient_id, mode } = req.body || {};
  if (!patient_id) return res.status(400).json({ error: 'patient_id required' });

  try {
    const upstream = await fetch(`${VOICE_BACKEND_URL}/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VOICE_SESSION_TOKEN}`,
      },
      body: JSON.stringify({ patient_id, mode: mode || 'voice' }),
      // The backend may take a few seconds to spawn the bot worker that
      // joins the LiveKit room. Give it a generous timeout but still cap
      // so a hung backend doesn't tie up a function instance.
      signal: AbortSignal.timeout(30_000),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    // Pass through whatever content type the backend returned. In practice
    // this is application/json; defaulting to that is safe.
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (e) {
    const isTimeout = e?.name === 'TimeoutError' || /timeout/i.test(e?.message || '');
    return res.status(isTimeout ? 504 : 502).json({
      error: `Voice backend ${isTimeout ? 'timeout' : 'unreachable'}: ${e.message}`,
    });
  }
}
