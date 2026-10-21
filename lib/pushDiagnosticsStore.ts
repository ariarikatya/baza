let lastPushError: any = null;
let lastCronPing: { timestamp: string; shortId: string; ip?: string } | null = null;
export interface PushStatRecord {
  event: string;
  subscribersFound: number;
  sent: number;
  failed: number;
  cleaned: number;
  skipReason?: string;
  timestamp: string;
}

let lastPushStats: PushStatRecord | null = null;
const pushEventsHistory: PushStatRecord[] = [];

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

export function recordLastPushStats(stats: {
  event: string;
  subscribersFound: number;
  sent: number;
  failed: number;
  cleaned: number;
  skipReason?: string;
}) {
  const record: PushStatRecord = {
    ...stats,
    timestamp: new Date().toISOString(),
  };
  lastPushStats = record;
  pushEventsHistory.unshift(record);
  if (pushEventsHistory.length > 20) {
    pushEventsHistory.pop();
  }
}

export function getLastPushStats() {
  return lastPushStats;
}

export function getRecentPushEvents(): PushStatRecord[] {
  return pushEventsHistory;
}
