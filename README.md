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
TELEGRAM_BOT_TOKEN="ваш_токен_бота_из_botfather"
TELEGRAM_BOT_SECRET_TOKEN="ваш_произвольный_секретный_токен"

# Секретный ключ Cron
CRON_SECRET="ваш_произвольный_секрет_крона"

# URL приложения
NEXT_PUBLIC_APP_URL="https://baza-pink.vercel.app"

# Web Push VAPID Ключи
NEXT_PUBLIC_VAPID_PUBLIC_KEY="ваш_публичный_vapid_ключ"
VAPID_PRIVATE_KEY="ваш_приватный_vapid_ключ"
VAPID_SUBJECT="mailto:admin@baza.ru"
```

> **Обратите внимание:**
> - При пустом или незаданном `TELEGRAM_BOT_SECRET_TOKEN` проверка секретного заголовка вебхука пропускается.
> - Если токен бота ранее скомпрометирован или засветился в репозитории, обязательно отзовите/перевыпустите его через [@BotFather](https://t.me/BotFather) (`/revoke`).

---

## Настройка крона (GitHub Actions & Vercel)

Так как на бесплатном Hobby-тарифе Vercel функция Vercel Crons заблокирована, расписание фоновых уведомлений выполняется через GitHub Actions workflow (`.github/workflows/cron.yml`).

### Инструкция по настройке `CRON_SECRET`:
1. Сгенерируйте случайную секретную строку для `CRON_SECRET` и добавьте её в **Vercel Dashboard → Project Settings → Environment Variables (Production)**.
2. В репозитории GitHub перейдите в **Settings → Secrets and variables → Actions → вкладка Secrets → New repository secret**.
3. Создайте репозиторный секрет с именем `CRON_SECRET` и значением, полностью совпадающим со значением `CRON_SECRET` из Vercel.

### Активация расписания (schedule) после переименования или переноса репозитория:
GitHub автоматически отключает `schedule`-триггеры у workflows в репозиториях, которые были переименованы или перенесены (например, при смене имени на `ariarikatya/baza-pink`).

Для реактивации работы крона по расписанию каждые 5 минут выполните следующие шаги:
1. Перейдите на вкладку **Actions** в GitHub: [https://github.com/ariarikatya/baza-pink/actions](https://github.com/ariarikatya/baza-pink/actions)
2. Выберите workflow **Cron Notifier** в левом боковом меню.
3. Если отображается баннер с предупреждением, нажмите кнопку **Enable workflow**.
4. Нажмите **Run workflow** (кнопка справа) и запустите workflow вручную **ОДИН РАЗ**. Ручной запуск реактивирует автоматическое выполнение по расписанию (`cron: "*/5 * * * *"`).

> **ВАЖНО:**
> - **НЕ ДОБАВЛЯЙТЕ** `CRON_SECRET` в *Environment secrets* GitHub — workflow не привязан к конкретному environment и не увидит секрет.
> - **НЕ ДОБАВЛЯЙТЕ** `CRON_SECRET` во вкладку *Variables* — это секретный ключ авторизации.
> - *(Опционально)* Если вы используете кастомный домен, создайте переменную во вкладке **Variables** (`New repository variable`) с именем `CRON_BASE_URL` и значением вашего URL (по умолчанию используется `https://baza-pink.vercel.app`).

---

## Настройка Web Push (VAPID)

Если при отправке веб-уведомлений возникает ошибка `"VAPID ключи не настроены"`, сгенерируйте и добавьте ключи в 2 действия:

1. **Сгенерируйте ключи командой:**
   ```bash
   npm run generate:vapid
   ```
   *(или `node generate-vapid-keys.js`)*

2. **Скопируйте 3 сгенерированные переменные в Vercel Project Settings → Environment Variables:**
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (укажите ваш email с префиксом `mailto:`, например `mailto:admin@baza.ru`)

> **ВАЖНО:**
> Ключи нельзя придумывать из головы или коммитить в репозиторий. Переменные с префиксом `NEXT_PUBLIC_` становятся доступны на клиенте только после **Redeploy** в Vercel. После деплоя включите уведомления в профиле пользователя.

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
