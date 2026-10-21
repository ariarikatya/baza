import { NextRequest, NextResponse } from 'next/server';
import { getClubLogoUrl, invalidateClubLogoCache } from '@/lib/clubSettings';

export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get('purge') === 'true') {
      invalidateClubLogoCache();
    }
    const logoUrl = await getClubLogoUrl();
    const success = Boolean(logoUrl && logoUrl.startsWith('http'));
    return NextResponse.json(
      { success, logoUrl: success ? logoUrl : '' },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, logoUrl: '' }, { status: 500 });
  }
}
