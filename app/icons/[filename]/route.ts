import { NextRequest, NextResponse } from 'next/server';
import { getClubLogoUrl } from '@/lib/clubSettings';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } | Promise<{ filename: string }> }
) {
  try {
    const { filename } = await Promise.resolve(params);
    const logoUrl = await getClubLogoUrl();

    if (!logoUrl || !logoUrl.startsWith('http')) {
      return NextResponse.redirect(new URL('/icons/icon-192x192.png', req.url));
    }

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
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  } catch (err: any) {
    console.error('Failed to proxy club logo icon:', err);
    return NextResponse.redirect(new URL('/icons/icon-192x192.png', req.url));
  }
}
