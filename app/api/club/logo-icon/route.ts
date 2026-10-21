import { NextRequest, NextResponse } from 'next/server';
import { getClubLogoUrl } from '@/lib/clubSettings';

export const dynamic = 'force-dynamic';

let lastSuccessfulLogoUrl = '';

function redirectWithNoCache(req: NextRequest, targetUrl: string) {
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: targetUrl,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const logoUrl = await getClubLogoUrl();
    const effectiveUrl = (logoUrl && logoUrl.startsWith('http')) ? logoUrl : lastSuccessfulLogoUrl;

    if (!effectiveUrl) {
      return redirectWithNoCache(req, new URL('/icons/logo.png', req.url).toString());
    }

    const imgRes = await fetch(effectiveUrl);
    if (!imgRes.ok) {
      if (lastSuccessfulLogoUrl && effectiveUrl !== lastSuccessfulLogoUrl) {
        const fallbackRes = await fetch(lastSuccessfulLogoUrl);
        if (fallbackRes.ok) {
          const contentType = fallbackRes.headers.get('content-type') || 'image/png';
          const imageBuffer = await fallbackRes.arrayBuffer();
          return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            },
          });
        }
      }
      return redirectWithNoCache(req, new URL('/icons/logo.png', req.url).toString());
    }

    if (logoUrl && logoUrl.startsWith('http')) {
      lastSuccessfulLogoUrl = logoUrl;
    }

    const contentType = imgRes.headers.get('content-type') || 'image/png';
    const imageBuffer = await imgRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (err) {
    console.error('Failed to proxy logo icon:', err);
    if (lastSuccessfulLogoUrl) {
      try {
        const imgRes = await fetch(lastSuccessfulLogoUrl);
        if (imgRes.ok) {
          const contentType = imgRes.headers.get('content-type') || 'image/png';
          const imageBuffer = await imgRes.arrayBuffer();
          return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            },
          });
        }
      } catch (e) {}
    }
    return redirectWithNoCache(req, new URL('/icons/logo.png', req.url).toString());
  }
}
