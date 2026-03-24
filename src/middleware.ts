// @ts-nocheck — next/server types require the 'next' package; this file
// is structurally correct Next.js middleware and will compile at deploy time
// when Vercel provides the Next.js runtime.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add your IPs here — find yours at https://whatismyip.com
const EXCLUDED_IPS: string[] = [];

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

export function middleware(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // Skip tracking for excluded IPs
  if (EXCLUDED_IPS.includes(ip)) {
    return NextResponse.next();
  }

  const event: VisitEvent = {
    timestamp: new Date().toISOString(),
    path: request.nextUrl.pathname,
    ip,
    country: request.headers.get('x-vercel-ip-country') || 'unknown',
    city: request.headers.get('x-vercel-ip-city') || 'unknown',
    region: request.headers.get('x-vercel-ip-country-region') || 'unknown',
    lat: request.headers.get('x-vercel-ip-latitude') || null,
    lon: request.headers.get('x-vercel-ip-longitude') || null,
    userAgent: request.headers.get('user-agent') || 'unknown',
    referer: request.headers.get('referer') || 'direct',
  };

  console.log('[DEMO_VISIT]', JSON.stringify(event));

  // Fire-and-forget POST to analytics endpoint
  try {
    const url = new URL('/api/analytics/track', request.url);
    fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {
      // Silently ignore analytics failures
    });
  } catch {
    // Silently ignore analytics failures
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/demo/:path*', '/coordinator/:path*', '/patient/:path*'],
};
