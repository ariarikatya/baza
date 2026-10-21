import { NextRequest, NextResponse } from 'next/server';
import { getClubLogoUrl } from '@/lib/clubSettings';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const logoUrl = await getClubLogoUrl();
    if (!logoUrl || !logoUrl.startsWith('http')) {
      return NextResponse.redirect(new URL('/icons/icon-512x512.png', req.url), 302);
    }

    const imgRes = await fetch(logoUrl);
    if (!imgRes.ok) {
      return NextResponse.redirect(new URL('/icons/icon-512x512.png', req.url), 302);
    }

    const contentType = imgRes.headers.get('content-type') || 'image/png';
    const imageBuffer = await imgRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('Failed to proxy logo icon:', err);
    return NextResponse.redirect(new URL('/icons/icon-512x512.png', req.url), 302);
  }
}
