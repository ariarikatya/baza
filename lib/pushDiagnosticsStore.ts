let lastPushError: any = null;
let lastCronPing: { timestamp: string; shortId: string; ip?: string } | null = null;
let lastPushStats: { event: string; subscribersFound: number; sent: number; failed: number; cleaned: number; timestamp: string } | null = null;

export function recordPushError(err: any) {
  lastPushError = {
    timestamp: new Date().toISOString(),
    message: err?.message || String(err),
    statusCode: err?.statusCode || null,
  };
}

export function getLastPushError() {
  return lastPushError;
}

export function recordCronPing(shortId?: string, ip?: string) {
  lastCronPing = {
    timestamp: new Date().toISOString(),
    shortId: shortId || Math.random().toString(36).substring(2, 8),
    ip: ip || undefined,
  };
}

export function getLastCronPing() {
  return lastCronPing;
}

export function recordLastPushStats(stats: { event: string; subscribersFound: number; sent: number; failed: number; cleaned: number }) {
  lastPushStats = {
    ...stats,
    timestamp: new Date().toISOString(),
  };
}

export function getLastPushStats() {
  return lastPushStats;
}
