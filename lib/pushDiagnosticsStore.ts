let lastPushError: any = null;

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
