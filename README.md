# Покерный клуб «БАЗА» — Веб-приложение и Telegram Бот

Full-stack веб-приложение для покерного клуба «БАЗА» (Next.js 14 App Router, TypeScript, Tailwind CSS, Google Sheets DB).

## Переменные окружения (.env)

Для работы приложения и встроенного Telegram-бота укажите в файле `.env` (или в настройках Vercel) следующие переменные:

```env
# Интеграция с Google Sheets
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
GOOGLE_SHEET_ID="ваш_google_sheet_id"

# Интеграция с ImgBB
IMGBB_API_KEY="ваш_imgbb_api_key"
NEXT_PUBLIC_IMGBB_API_KEY="ваш_imgbb_api_key"

# Настройка Telegram Бота
TELEGRAM_BOT_TOKEN="8159179687:AAEVkVIxP_p86uHMghhF8WBb9FqdAGoeuos"
TELEGRAM_BOT_SECRET_TOKEN="ваш_произвольный_секретный_токен"

# URL приложения
NEXT_PUBLIC_APP_URL="https://baza-pink.vercel.app"
```

> **Обратите внимание:** При пустом или незаданном `TELEGRAM_BOT_SECRET_TOKEN` проверка секретного заголовка вебхука пропускается.

---

## Настройка и синхронизация Webhook для Telegram Бота

Логика бота выполняется нативно в роуте `/api/telegram/webhook`.

### Синхронизация вебхука одной командой

Чтобы настроить или обновить вебхук на стороне Telegram со значениями из переменных окружения:

```bash
npm run telegram:set-webhook
```

### Диагностика ошибки «Unauthorized telegram webhook request: secret token mismatch»

Если в логах Vercel появляется ошибка `Unauthorized telegram webhook request: secret token mismatch`, это означает, что секретный токен `TELEGRAM_BOT_SECRET_TOKEN` на стороне Telegram не совпадает с токеном в окружении Vercel.

**Решение проблемы:**
1. Выполните команду синхронизации:
   ```bash
   npm run telegram:set-webhook
   ```
   или отправьте запрос к `setWebhook` вручную с секретом из Vercel:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{
          "url": "https://baza-pink.vercel.app/api/telegram/webhook",
          "secret_token": "<ЗНАЧЕНИЕ_TELEGRAM_BOT_SECRET_TOKEN_ИЗ_VERCEL>",
          "allowed_updates": ["message", "callback_query"]
        }'
   ```
2. Проверьте текущий статус вебхука через GET-запрос:
   ```bash
   curl -H "X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_BOT_SECRET_TOKEN>" https://baza-pink.vercel.app/api/telegram/webhook
   ```

---

## Проверка работоспособности бота

Запустить локальную эмуляцию всех 5 веток обработки (без отправки реальных запросов в Telegram):

```bash
npx tsx scripts/test-telegram-bot.ts
```

---

## Запуск проекта

```bash
# Установка зависимостей
npm install

# Режим разработки
npm run dev

# Сборка
npm run build
```
