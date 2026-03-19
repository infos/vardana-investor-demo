// Demo analytics dashboard API — GET /api/analytics?secret=<value>

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { secret } = req.query || {};
  if (!secret || secret !== process.env.ANALYTICS_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    return res.status(200).json({
      visits: [],
      count: 0,
      error: 'KV not configured. Check Vercel Function Logs for [DEMO_VISIT] entries.',
    });
  }

  try {
    const scanRes = await fetch(`${kvUrl}/scan/0/match/visit:*/count/500`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    const scanData = await scanRes.json();
    const keys = scanData.result[1];

    const visits = (
      await Promise.all(
        keys.map(async (key) => {
          try {
            const r = await fetch(`${kvUrl}/get/${key}`, {
              headers: { Authorization: `Bearer ${kvToken}` },
            });
            const data = await r.json();
            return data.result ? JSON.parse(data.result) : null;
          } catch {
            return null;
          }
        })
      )
    )
      .filter(Boolean)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({ visits, count: visits.length });
  } catch (e) {
    console.error('[ANALYTICS_ERROR]', e.message);
    return res.status(200).json({ visits: [], count: 0, error: e.message });
  }
}
