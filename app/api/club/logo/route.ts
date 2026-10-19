import { NextRequest, NextResponse } from 'next/server';
import { getClubLogoUrl, invalidateClubLogoCache } from '@/lib/clubSettings';

export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get('purge') === 'true') {
      invalidateClubLogoCache();
    }
    const logoUrl = await getClubLogoUrl();
    return NextResponse.json({ success: true, logoUrl });
  } catch (err: any) {
    return NextResponse.json({ success: false, logoUrl: '' }, { status: 500 });
  }
}
