import { NextRequest, NextResponse } from 'next/server';
import { syncWebhook } from '@/lib/telegramBot';

async function handleSetWebhook(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || adminSecret.trim() === '') {
    return NextResponse.json(
      { ok: false, error: 'ADMIN_SECRET environment variable is not configured on the server.' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader || authHeader !== adminSecret) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Invalid or missing Authorization token.' },
      { status: 401 }
    );
  }

  try {
    const result = await syncWebhook({ force: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to trigger webhook setup' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleSetWebhook(request);
}

export async function GET(request: NextRequest) {
  return handleSetWebhook(request);
}
