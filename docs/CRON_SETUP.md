# Документация по настройке и работе Cron (GitHub Actions)

В данном проекте планировщик задач перенесен с Vercel Crons на GitHub Actions (`.github/workflows/cron.yml`), поскольку функцию Vercel Crons нельзя использовать на бесплатном тарифе Hobby.

## Настройка секретов в GitHub Репозитории

1. Сгенерируйте секрет `CRON_SECRET` в **Vercel Project Settings → Environment Variables (Production)**.
2. Откройте репозиторий GitHub: **Settings → Secrets and variables → Actions**.
3. Перейдите на вкладку **Secrets** и нажмите **New repository secret**.
4. Укажите Имя: `CRON_SECRET`, Значение: точно такое же, как в Vercel Production env.

> **ВАЖНО:**
> - **НЕ добавляйте** `CRON_SECRET` в *Environment secrets* GitHub — workflow не привязан к environment и не сможет его прочитать.
> - **НЕ добавляйте** `CRON_SECRET` во вкладку *Variables* — это конфиденциальный ключ.
> - *(Опционально)* Во вкладке **Variables** можно добавить репозиторную переменную `CRON_BASE_URL` с вашим доменом, если он отличается от `https://baza-pink.vercel.app`.
> - *(Опционально)* Во вкладке **Variables** можно добавить `CRON_ACTIVE_HOURS_UTC` (например, `8-22`), чтобы крон выполнялся только в указанный диапазон часов по UTC.

---

## Защита от остановки расписания при неактивности репозитория (>60 дней)

GitHub автоматически отключает `schedule`-триггеры для репозиториев, в которых не было коммитов >60 дней.
Для предотвращения остановки созданы:
1. Триггер `repository_dispatch` (тип `run-crons`) в `.github/workflows/cron.yml`.
2. Эндпоинт `/api/cron/trigger?secret=<CRON_SECRET>`.

Внешний сервис планировщика (например, [cron-job.org](https://cron-job.org)) может каждые 5 минут отправлять запрос на `/api/cron/trigger`. Эндпоинт отправляет событие `repository_dispatch` через GitHub API (если задан `GITHUB_DISPATCH_TOKEN`) или выполняет фоновые задачи напрямую.

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
   - В логах шага `Execute Cron Endpoints` отображается `secret length: <length>`, а также HTTP статус-код и JSON-ответ по каждому эндпоинту. Авторизация передается через заголовок `Authorization: Bearer $SECRET`.

### Возможные ошибки и решения:
- **`CRON_SECRET repository secret is missing`**:
  - *Причина:* Репозиторный секрет `CRON_SECRET` не создан в GitHub.
  - *Решение:* Перейдите в **Settings → Secrets and variables → Actions → Secrets → New repository secret** и добавьте `CRON_SECRET`.
- **`401 Unauthorized`**:
  - *Причина:* Значения `CRON_SECRET` в GitHub Actions и в Vercel Production Environment не совпадают.
  - *Решение:* Сверьте значение `CRON_SECRET` в Vercel и GitHub Repository Secrets.
