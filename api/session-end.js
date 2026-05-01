// Thin proxy mirror of api/session-start. Browser calls this on unmount of
// the voice test page so the backend can tear down the bot worker and free
// the LiveKit room. Same auth boundary — VOICE_SESSION_TOKEN stays
// server-side. Keepalive-friendly so it survives a tab close in flight.

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

  const { session_id } = req.body || {};
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  try {
    const upstream = await fetch(`${VOICE_BACKEND_URL}/session/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VOICE_SESSION_TOKEN}`,
      },
      body: JSON.stringify({ session_id }),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (e) {
    const isTimeout = e?.name === 'TimeoutError' || /timeout/i.test(e?.message || '');
    return res.status(isTimeout ? 504 : 502).json({
      error: `Voice backend ${isTimeout ? 'timeout' : 'unreachable'}: ${e.message}`,
    });
  }
}
