import { NextRequest } from 'next/server';

/**
 * Verifies CRON_SECRET from query parameter or Authorization Bearer header.
 * Case-insensitive header lookup for compatibility across environments.
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const url = new URL(req.url);
  const paramSecret = url.searchParams.get('secret')?.trim();

  // Search headers for authorization (case-insensitive)
  let authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  let bearerSecret = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    bearerSecret = authHeader.substring(7).trim();
  }

  const providedSecret = bearerSecret || paramSecret;
  return providedSecret === cronSecret;
}
