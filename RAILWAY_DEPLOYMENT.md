# Развертывание Twenty CRM на Railway

Это руководство поможет вам развернуть Twenty CRM на платформе Railway.

## Предварительные требования

1. Аккаунт на [Railway](https://railway.app)
2. GitHub аккаунт с доступом к этому репозиторию
3. Railway CLI (опционально, для локального управления)

## Быстрый старт

### Шаг 1: Создание проекта в Railway

1. Войдите в [Railway Dashboard](https://railway.app/dashboard)
2. Нажмите "New Project"
3. Выберите "Deploy from GitHub repo"
4. Выберите ваш форк репозитория Twenty CRM

### Шаг 2: Настройка сервисов

Railway автоматически создаст основной веб-сервис. Вам необходимо добавить дополнительные сервисы:

#### 2.1 Добавление PostgreSQL

1. В проекте нажмите "New Service"
2. Выберите "Database" → "PostgreSQL"
3. Railway автоматически настроит переменную `DATABASE_URL`

#### 2.2 Добавление Redis

1. В проекте нажмите "New Service"
2. Выберите "Database" → "Redis"
3. Railway автоматически настроит переменную `REDIS_URL`

#### 2.3 Добавление Worker сервиса

1. В проекте нажмите "New Service"
2. Выберите "GitHub Repo" → тот же репозиторий
3. В настройках сервиса:
   - **Service Name**: `twenty-worker`
   - **Start Command**: `sh -c ./scripts/railway-worker.sh`
   - **Root Directory**: оставьте пустым

### Шаг 3: Настройка переменных окружения

Для **основного веб-сервиса**:

1. Перейдите в настройки основного сервиса
2. Во вкладке "Variables" добавьте:

```bash
APP_SECRET=your_32_character_random_secret_here_change_me
NODE_ENV=production
PORT=3000
STORAGE_TYPE=local
```

Для **worker сервиса**:

1. Перейдите в настройки worker сервиса
2. Во вкладке "Variables" добавьте те же переменные:

```bash
APP_SECRET=your_32_character_random_secret_here_change_me
NODE_ENV=production
STORAGE_TYPE=local
DISABLE_DB_MIGRATIONS=true
DISABLE_CRON_JOBS_REGISTRATION=true
```

**Важно**: Используйте одинаковый `APP_SECRET` для всех сервисов!

### Шаг 4: Настройка кастомного домена (опционально)

1. В настройках основного веб-сервиса перейдите в "Settings"
2. В разделе "Domains" добавьте ваш домен
3. Обновите переменные окружения:
   - `SERVER_URL=https://your-domain.com`
   - `FRONT_BASE_URL=https://your-domain.com`

## Детальная конфигурация

### Переменные окружения

Для полной конфигурации смотрите файл `railway.example.env`.

#### Обязательные переменные

- `APP_SECRET` - случайная строка длиной 32+ символов
- `DATABASE_URL` - автоматически устанавливается Railway
- `REDIS_URL` - автоматически устанавливается Railway

#### Опциональные переменные

**Хранилище файлов (S3):**
```bash
STORAGE_TYPE=s3
STORAGE_S3_REGION=us-east-1
STORAGE_S3_NAME=your-bucket-name
STORAGE_S3_ENDPOINT=https://s3.amazonaws.com
```

**Google OAuth:**
```bash
AUTH_GOOGLE_CLIENT_ID=your_client_id
AUTH_GOOGLE_CLIENT_SECRET=your_client_secret
MESSAGING_PROVIDER_GMAIL_ENABLED=true
CALENDAR_PROVIDER_GOOGLE_ENABLED=true
```

**Email настройки:**
```bash
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME="Your Company"
EMAIL_DRIVER=smtp
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your_email@gmail.com
EMAIL_SMTP_PASSWORD=your_app_password
```

### Архитектура развертывания

Ваше развертывание будет состоять из:

1. **Web Service** - основное приложение (server + frontend)
2. **Worker Service** - обработка фоновых задач
3. **PostgreSQL** - основная база данных
4. **Redis** - кэширование и очереди задач

## Мониторинг и отладка

### Просмотр логов

1. В Railway Dashboard перейдите к нужному сервису
2. Откройте вкладку "Deploy" для просмотра логов развертывания
3. Откройте вкладку "Metrics" для просмотра метрик

### Health Check

Основной сервис имеет health check endpoint:
```
GET /healthz
```

### Общие проблемы

**1. Ошибка подключения к базе данных**
- Убедитесь, что PostgreSQL сервис запущен
- Проверьте переменную `DATABASE_URL`

**2. Worker не запускается**
- Убедитесь, что в worker сервисе установлены переменные:
  - `DISABLE_DB_MIGRATIONS=true`
  - `DISABLE_CRON_JOBS_REGISTRATION=true`

**3. Проблемы с файлами**
- Для production используйте S3-совместимое хранилище
- Локальное хранилище не сохраняется между развертываниями

## Обновление приложения

Railway автоматически пересобирает и развертывает приложение при каждом push в основную ветку GitHub.

Для ручного развертывания:
1. Перейдите в сервис
2. Нажмите "Deploy" → "Redeploy"

## Резервное копирование

### База данных

1. В Railway Dashboard откройте PostgreSQL сервис
2. Используйте команду:
```bash
railway run pg_dump $DATABASE_URL > backup.sql
```

### Файлы

Если используете S3, файлы автоматически сохраняются в облаке.

## Масштабирование

Railway автоматически масштабирует приложение в зависимости от нагрузки.

Для улучшения производительности:
1. Увеличьте план PostgreSQL
2. Добавьте больше worker экземпляров
3. Используйте CDN для статических файлов

## Поддержка

- [Railway Documentation](https://docs.railway.app/)
- [Twenty Documentation](https://twenty.com/developers)
- [GitHub Issues](https://github.com/twentyhq/twenty/issues)

## Пример окружения production

```bash
# Core
APP_SECRET=super_secret_random_string_32_chars_min
NODE_ENV=production
PORT=3000

# Storage
STORAGE_TYPE=s3
STORAGE_S3_REGION=us-east-1
STORAGE_S3_NAME=twenty-production-files
STORAGE_S3_ENDPOINT=https://s3.amazonaws.com

# Auth
AUTH_GOOGLE_CLIENT_ID=your_google_client_id
AUTH_GOOGLE_CLIENT_SECRET=your_google_client_secret
MESSAGING_PROVIDER_GMAIL_ENABLED=true
CALENDAR_PROVIDER_GOOGLE_ENABLED=true

# Email
EMAIL_FROM_ADDRESS=noreply@company.com
EMAIL_FROM_NAME="Company CRM"
EMAIL_DRIVER=smtp
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=smtp-user@company.com
EMAIL_SMTP_PASSWORD=smtp_app_password
```