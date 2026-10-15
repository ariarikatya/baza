import { syncWebhook } from '../lib/telegramBot';

async function main() {
  console.log('🚀 Запуск команды установки Telegram Webhook...');
  const res = await syncWebhook();
  console.log('Завершено с результатом:', JSON.stringify(res, null, 2));
}

main().catch((err) => {
  console.error('❌ Ошибка выполнения:', err);
  process.exit(1);
});
