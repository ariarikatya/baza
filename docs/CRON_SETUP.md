# Документация по настройке и работе Cron (GitHub Actions)

В данном проекте планировщик задач перенесен с Vercel Crons на GitHub Actions (`.github/workflows/cron.yml`), поскольку функцию Vercel Crons нельзя использовать на бесплатном тарифе Hobby.

## Ключевое условие безопасности
> **В настройках GitHub ничего создавать или вводить не нужно.**
> Токен `VERCEL_OIDC_TOKEN` доступен в GitHub Actions автоматически. Единственный необходимый секрет — `CRON_SECRET` — хранится только в Vercel (**Project Settings → Environment Variables → Production**).

---

## Таблица крона задач

| Эндпоинт | Путь | Расписание (UTC) | Расписание (МСК) | Ожидаемый JSON-ответ |
| :--- | :--- | :--- | :--- | :--- |
| **Общие уведомления** | `/api/cron/checkGeneralNotifications` | Каждые 5 минут (`*/5 * * * *`) | Каждые 5 минут | `{"processed": number, "sent": number}` |
| **Уведомления об играх** | `/api/cron/checkGameNotifications` | Каждые 5 минут (`*/5 * * * *`) | Каждые 5 минут | `{"processed": number, "sent": number}` |
| **Завершение турниров** | `/api/cron/checkAndCompleteTournaments` | Каждые 5 минут (`*/5 * * * *`) | Каждые 5 минут | `{"processed": number, "sent": number}` |
| **Отсутствующие игроки** | `/api/cron/notifyAbsentPlayers` | Каждые 15 минут | Каждые 15 минут | `{"processed": number, "sent": number}` |
| **Награды за баунти** | `/api/cron/checkBountyAwards` | Каждые 10 минут | Каждые 10 минут | `{"processed": number, "sent": number}` |
| **Приглашения на игры** | `/api/cron/sendGameInvitations` | Каждый час в `:00` | Каждый час в `:00` | `{"processed": number, "sent": number}` |
| **Анонсы новых игр** | `/api/cron/checkNewGameAnnouncements` | В `13:00 UTC` | В `16:00 МСК` | `{"processed": number, "sent": number}` |

---

## Диагностика и анализ логов GitHub Actions

1. Перейдите во вкладку **Actions** в GitHub репозитории.
2. Выберите workflow **Cron Notifier**.
3. Нажмите на нужный запуск из списка:
   - В логах шага `Fetch CRON_SECRET from Vercel API` будет видно подтверждение получения секрета.
   - В логах шага `Execute Cron Endpoints` будет выведен HTTP статус-код и JSON-ответ по каждому эндпоинту.

### Возможные ошибки и решения:
- **`401 Unauthorized`**:
  - *Причина:* Переменная `CRON_SECRET` отсутствует в Vercel Environment Variables или значения ключа в Vercel и запросе не совпадают.
  - *Решение:* Проверьте **Vercel Project Settings → Environment Variables (Production)** и убедитесь, что `CRON_SECRET` задан.
- **`404 Not Found`** или **`502 Bad Gateway`**:
  - *Причина:* Неверно определился домен или сервис Vercel временно недоступен.
