// Demo visit tracking — POST /api/track
// Logs visits to console and optionally to Upstash Redis

const EXCLUDED_IPS = [];
// Add your own IPs here to exclude from tracking — find yours at https://whatismyip.com

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { path, ref, timestamp, userAgent, referrer, sessionId } = req.body || {};

  const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const country = req.headers['x-vercel-ip-country'] || 'unknown';
  const city = req.headers['x-vercel-ip-city'] || 'unknown';
  const region = req.headers['x-vercel-ip-country-region'] || 'unknown';

  const event = { path, ref, timestamp, userAgent, referrer, sessionId, ip, country, city, region };

  if (EXCLUDED_IPS.includes(ip)) {
    console.log('[DEMO_VISIT_SKIPPED]', JSON.stringify(event));
    return res.status(200).json({ ok: true });
  }

  console.log('[DEMO_VISIT]', JSON.stringify(event));

  // Support both Upstash (new) and legacy Vercel KV env var names
  const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (kvUrl && kvToken) {
    try {
      const key = `visit:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
      await fetch(`${kvUrl}/set/${key}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: JSON.stringify(event), ex: 7776000 }),
      });
    } catch (e) {
      console.error('[DEMO_VISIT_KV_ERROR]', e.message);
    }
  }

  return res.status(200).json({ ok: true });
}
