# Документация по настройке и работе Cron

В данном проекте основной способ запуска крон-задач — внешний сервис **cron-job.org**, вызывающий единый эндпоинт `/api/cron/trigger`. GitHub Actions используется в качестве резервного триггера.

## Основной механизм запуска (cron-job.org)

Внешний сервис планировщика (cron-job.org) выполняет периодический GET-запрос к приложению.

### Настройки задания в cron-job.org:
- **URL:** `https://baza-pink.vercel.app/api/cron/trigger?secret=<CRON_SECRET>`
- **Method:** `GET`
- **Интервал:** каждые 15 минут
- **Тайм-аут (Execution Timeout):** 60 секунд

При вызове `/api/cron/trigger` выполняются последовательно все функции уведомлений и обслуживания:
1. `checkGeneralNotifications` — рассылка новостей, акций, сезонных турниров.
2. `checkGameNotifications` — рассылка анонсов игр.
3. `checkAndCompleteTournaments` — перерасчёт мест, завершение турниров и отправка результатов.
4. `notifyAbsentPlayers` — рассылка про повышенный рейтинг.
5. `checkBountyAwards` — начисление наград Киллер.
6. `sendGameInvitations` — персональные приглашения за 12ч и 2ч.
7. `checkNewGameAnnouncements` — анонсы за день в 16:00.

---

## Резервный механизм запуска (GitHub Actions)

GitHub Actions (`.github/workflows/cron.yml`) настроен как резервный вариант вызова крона.

### Почему GitHub Actions не используется как основной планировщик:
- **Ненадёжность расписания (`schedule`):** Запуски GitHub Actions schedule могут запаздывать от десятков минут до нескольких часов или пропускаться при высокой нагрузке на инфраструктуру GitHub.
- **Автоматическая остановка:** GitHub автоматически отключает `schedule`-триггеры для репозиториев, в которых не было коммитов более 60 дней.

## Настройка секретов в GitHub Репозитории (для резервного запуска)

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
