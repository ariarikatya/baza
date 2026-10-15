let isWebhookSynced = false;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.VERCEL_ENV === 'production') {
      if (isWebhookSynced) {
        console.log('[Instrumentation] Telegram webhook sync already attempted in process memory.');
        return;
      }
      isWebhookSynced = true;

      try {
        console.log('[Instrumentation] Starting production Telegram webhook sync...');
        const { syncWebhook } = await import('./lib/telegramBot');
        const result = await syncWebhook();
        console.log('[Instrumentation] Telegram webhook sync result:', JSON.stringify(result));
      } catch (err) {
        console.error('[Instrumentation] Failed to sync Telegram webhook:', err);
      }
    } else {
      console.log(`[Instrumentation] Skipping Telegram webhook sync (VERCEL_ENV: ${process.env.VERCEL_ENV || 'local/development'}).`);
    }
  }
}
