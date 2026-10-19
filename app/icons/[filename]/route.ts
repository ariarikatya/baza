import { NextRequest, NextResponse } from 'next/server';
import { getClubLogoUrl } from '@/lib/clubSettings';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const logoUrl = await getClubLogoUrl();

    // Fetch image from Google Sheets logo URL
    const imageRes = await fetch(logoUrl, { cache: 'no-store' });
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch logo: ${imageRes.statusText}`);
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await imageRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    console.error('Failed to proxy club logo icon:', err);
    return NextResponse.redirect(new URL('/icons/icon-192x192.png', req.url));
  }
}
