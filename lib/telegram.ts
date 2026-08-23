import axios from 'axios';

export const sendTelegramNotification = async (userId: string | number, message: string): Promise<boolean> => {
  const webhookUrl = process.env.MAKE_TELEGRAM_WEBHOOK || process.env.NEXT_PUBLIC_MAKE_TELEGRAM_WEBHOOK;

  if (!webhookUrl) {
    console.warn('MAKE_TELEGRAM_WEBHOOK is not set. Logging message locally:', { userId, message });
    return true;
  }

  try {
    const response = await axios.post(webhookUrl, {
      userId,
      message,
      timestamp: new Date().toISOString(),
    });
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error('Failed to send Telegram notification via Make.com:', error);
    return false;
  }
};
