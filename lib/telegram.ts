import { sendTelegramMessage } from '@/lib/telegramBot';

export const sendTelegramNotification = async (userId: string | number, message: string): Promise<boolean> => {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN is not set. Logging notification locally:', { userId, message });
    return true;
  }

  try {
    return await sendTelegramMessage(userId, message);
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    return false;
  }
};
