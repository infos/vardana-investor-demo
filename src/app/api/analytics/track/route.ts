interface VisitEvent {
  timestamp: string;
  path: string;
  ip: string;
  country: string;
  city: string;
  region: string;
  lat: string | null;
  lon: string | null;
  userAgent: string;
  referer: string;
}

// POST — Record a visit event
export async function POST(request: Request): Promise<Response> {
  try {
    const event: VisitEvent = await request.json();

    console.log('[ANALYTICS]', JSON.stringify(event));

    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (kvUrl && kvToken) {
      const id = Math.random().toString(36).slice(2, 10);
      const key = `visit:${Date.now()}:${id}`;

      try {
        await fetch(`${kvUrl}/set/${key}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${kvToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value: JSON.stringify(event), ex: 7776000 }),
        });
      } catch {
        // KV write failure is non-critical
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GET — Retrieve visit events (requires secret)
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    const analyticsSecret = process.env.ANALYTICS_SECRET;

    if (!secret || !analyticsSecret || secret !== analyticsSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (!kvUrl || !kvToken) {
      return new Response(
        JSON.stringify({
          error: 'KV not configured. Check Vercel Function Logs for [DEMO_VISIT] entries.',
          visits: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // SCAN for visit keys
    const scanRes = await fetch(
      `${kvUrl}/scan/0/match/visit:*`,
      {
        headers: { Authorization: `Bearer ${kvToken}` },
      }
    );
    const scanData = await scanRes.json();
    const keys: string[] = scanData?.result?.[1] || [];

    // Fetch each visit
    const visits: VisitEvent[] = [];
    for (const key of keys) {
      try {
        const getRes = await fetch(`${kvUrl}/get/${key}`, {
          headers: { Authorization: `Bearer ${kvToken}` },
        });
        const getData = await getRes.json();
        if (getData?.result) {
          const parsed = JSON.parse(getData.result);
          visits.push(parsed);
        }
      } catch {
        // Skip malformed entries
      }
    }

    // Sort descending by timestamp
    visits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return new Response(
      JSON.stringify({ visits, count: visits.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, visits: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
