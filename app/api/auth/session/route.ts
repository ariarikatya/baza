import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE_KEY, COOKIE_MAX_AGE } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.userId || body.token || '').trim();

    if (!token) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, token });
    const isSecure = req.nextUrl.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';

    response.headers.append(
      'Set-Cookie',
      `${TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secureFlag}`
    );

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to set session cookie' }, { status: 500 });
  }
}
