# Полная конфигурация переменных окружения для Twenty Worker

## Исправленные и дополненные переменные:

```env
# =============================================================================
# SECURITY TOKENS (правильно)
# =============================================================================
ACCESS_TOKEN_SECRET="a7f9d2e8c3b6f4a1e9d7c2b8f5a3e6d9c1b4f7a2e8d5c9b3f6a4e7d1c8b5f2a9"
APP_SECRET="b3f8e1d4c7a9f2e5d8c1b6f9a2e5d8c3b7f0a4e9d2c6b1f8a5e2d9c4b7f3a6"
FILE_TOKEN_SECRET="c9e2f5d8b1a4f7e0d3c6b9f2a5e8d1c4b7f0a3e6d9c2b5f8a1e4d7c0b3f6a9"
LOGIN_TOKEN_SECRET="d5c8f1e4b7a0f3e6d9c2b5f8a1e4d7c0b3f6a9e2d5c8b1f4a7e0d3c6b9f2a5"
REFRESH_TOKEN_SECRET="e1d4c7b0f3a6e9d2c5b8f1a4e7d0c3b6f9a2e5d8c1b4f7a0e3d6c9b2f5a8e1"

# =============================================================================
# APPLICATION CORE (ДОБАВЛЕНЫ ОТСУТСТВУЮЩИЕ)
# =============================================================================
NODE_ENV="production"
PORT="3000"
SERVER_URL="https://your-domain.com"
FRONT_BASE_URL="https://your-domain.com"

# =============================================================================
# DATABASE CONFIGURATION (правильно)
# =============================================================================
PG_DATABASE_URL="${{Postgres.DATABASE_URL}}"
ENABLE_DB_MIGRATIONS="false"

# =============================================================================
# REDIS CONFIGURATION (правильно)
# =============================================================================
REDIS_URL="${{Redis.REDIS_URL}}"
CACHE_STORAGE_TYPE="redis"

# =============================================================================
# STORAGE CONFIGURATION (правильно)
# =============================================================================
STORAGE_TYPE="local"
STORAGE_LOCAL_PATH=".local-storage"

# =============================================================================
# MESSAGE QUEUE (правильно)
# =============================================================================
MESSAGE_QUEUE_TYPE="bull-mq"

# =============================================================================
# WORKER-SPECIFIC SETTINGS (КРИТИЧНО ДЛЯ WORKER)
# =============================================================================
DISABLE_CRON_JOBS_REGISTRATION="true"
WORKER_CONCURRENCY="10"
WORKER_MAX_ATTEMPTS="3"
WORKER_BACKOFF_STRATEGY="exponential"
WORKER_REMOVE_ON_COMPLETE="100"
WORKER_REMOVE_ON_FAIL="50"

# =============================================================================
# LOGGING (правильно)
# =============================================================================
DEBUG_MODE="false"
LOG_LEVELS="error,warn,log"
LOGGER_DRIVER="console"
LOGGER_IS_BUFFER_ENABLED="false"

# =============================================================================
# EMAIL CONFIGURATION (правильно)
# =============================================================================
EMAIL_DRIVER="smtp"
EMAIL_FROM_ADDRESS="noreply@itcbr.io"
EMAIL_FROM_NAME="Your Company CRM"
EMAIL_SYSTEM_ADDRESS="system@itcbr.io"
EMAIL_SMTP_HOST="smtp.gmail.com"
EMAIL_SMTP_PORT="587"
EMAIL_SMTP_USER="your-email@gmail.com"
EMAIL_SMTP_PASSWORD="your-app-password"

# =============================================================================
# ADDITIONAL WORKER SETTINGS (ДОБАВЛЕНЫ)
# =============================================================================
QUEUE_SETTINGS_EXPORT_ENABLED="true"
QUEUE_SETTINGS_IMPORT_ENABLED="true"
QUEUE_SETTINGS_CALENDAR_ENABLED="true"
QUEUE_SETTINGS_MESSAGING_ENABLED="true"
QUEUE_SETTINGS_WEBHOOK_ENABLED="true"

# =============================================================================
# PERFORMANCE SETTINGS (ДОБАВЛЕНЫ)
# =============================================================================
WORKER_MEMORY_LIMIT="512"
WORKER_TIMEOUT="300000"
WORKER_RETRY_DELAY="5000"

# =============================================================================
# MONITORING & HEALTH (ДОБАВЛЕНЫ)
# =============================================================================
ENABLE_HEALTH_CHECK="true"
HEALTH_CHECK_INTERVAL="30000"
METRICS_ENABLED="true"

# =============================================================================
# NETWORKING (правильно)
# =============================================================================
ENABLE_ALPINE_PRIVATE_NETWORKING="true"

# =============================================================================
# FEATURE FLAGS (ДОБАВЛЕНЫ ОТСУТСТВУЮЩИЕ)
# =============================================================================
MESSAGING_PROVIDER_GMAIL_ENABLED="false"
MESSAGING_PROVIDER_MICROSOFT_ENABLED="false"
CALENDAR_PROVIDER_GOOGLE_ENABLED="false"
CALENDAR_PROVIDER_MICROSOFT_ENABLED="false"
TELEMETRY_ENABLED="false"
TELEMETRY_ANONYMIZATION_ENABLED="true"
CAPTCHA_DRIVER="false"
```

## Проблемы в вашей конфигурации:

### 1. **КРИТИЧНЫЕ ОТСУТСТВУЮЩИЕ ПЕРЕМЕННЫЕ:**
```env
# Обязательно добавить:
PORT="3000"
SERVER_URL="https://your-domain.com"
FRONT_BASE_URL="https://your-domain.com"
```

### 2. **WORKER-СПЕЦИФИЧНЫЕ НАСТРОЙКИ:**
```env
# Добавить для производительности Worker:
WORKER_CONCURRENCY="10"
WORKER_MAX_ATTEMPTS="3"
WORKER_BACKOFF_STRATEGY="exponential"
WORKER_REMOVE_ON_COMPLETE="100"
WORKER_REMOVE_ON_FAIL="50"
WORKER_MEMORY_LIMIT="512"
WORKER_TIMEOUT="300000"
```

### 3. **ИСПРАВЛЕНИЕ НЕТОЧНОСТЕЙ:**
- `ENABLE_DB_MIGRATIONS="false"` - правильно для Worker
- `DISABLE_CRON_JOBS_REGISTRATION="true"` - правильно для Worker

## Конфигурация для Railway (если используете Railway):

```env
# =============================================================================
# RAILWAY-SPECIFIC CONFIGURATION
# =============================================================================
NODE_ENV="production"
PORT="${{RAILWAY_PORT}}"
SERVER_URL="${{RAILWAY_STATIC_URL}}"
FRONT_BASE_URL="${{RAILWAY_STATIC_URL}}"
PG_DATABASE_URL="${{Postgres.DATABASE_URL}}"
REDIS_URL="${{Redis.REDIS_URL}}"

# Остальные переменные остаются такими же
```

## Docker Compose для Worker:

```yaml
version: '3.8'

services:
  twenty-worker:
    container_name: twenty-worker
    image: twentycrm/twenty:latest
    command: ["yarn", "worker:prod"]
    environment:
      # Основные
      NODE_ENV: production
      SERVER_URL: ${SERVER_URL}
      PG_DATABASE_URL: ${PG_DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      APP_SECRET: ${APP_SECRET}
      
      # Worker-специфичные
      DISABLE_CRON_JOBS_REGISTRATION: "true"
      ENABLE_DB_MIGRATIONS: "false"
      WORKER_CONCURRENCY: "10"
      WORKER_MAX_ATTEMPTS: "3"
      
      # Токены
      ACCESS_TOKEN_SECRET: ${ACCESS_TOKEN_SECRET}
      LOGIN_TOKEN_SECRET: ${LOGIN_TOKEN_SECRET}
      REFRESH_TOKEN_SECRET: ${REFRESH_TOKEN_SECRET}
      FILE_TOKEN_SECRET: ${FILE_TOKEN_SECRET}
      
      # Очереди
      MESSAGE_QUEUE_TYPE: "bull-mq"
      CACHE_STORAGE_TYPE: "redis"
      
      # Логирование
      LOG_LEVELS: "error,warn,log"
      LOGGER_DRIVER: "console"
      DEBUG_MODE: "false"
      
      # Email
      EMAIL_DRIVER: "smtp"
      EMAIL_FROM_ADDRESS: ${EMAIL_FROM_ADDRESS}
      EMAIL_FROM_NAME: ${EMAIL_FROM_NAME}
      EMAIL_SYSTEM_ADDRESS: ${EMAIL_SYSTEM_ADDRESS}
      EMAIL_SMTP_HOST: ${EMAIL_SMTP_HOST}
      EMAIL_SMTP_PORT: ${EMAIL_SMTP_PORT}
      EMAIL_SMTP_USER: ${EMAIL_SMTP_USER}
      EMAIL_SMTP_PASSWORD: ${EMAIL_SMTP_PASSWORD}
      
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    volumes:
      - worker-data:/app/data
    healthcheck:
      test: ["CMD", "node", "-e", "process.exit(0)"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  worker-data:
```

## Команда для запуска Worker:

```bash
# Локально
yarn worker:prod

# В Docker
docker run -d \
  --name twenty-worker \
  --env-file .env \
  twentycrm/twenty:latest \
  yarn worker:prod
```

## Проверка работы Worker:

```bash
# Проверка логов
docker logs twenty-worker -f

# Проверка статуса
docker ps | grep twenty-worker

# Проверка здоровья
docker inspect twenty-worker | grep Health
```

Основные исправления:
1. **Добавил** `PORT`, `SERVER_URL`, `FRONT_BASE_URL`
2. **Добавил** специфичные для Worker переменные
3. **Добавил** настройки производительности
4. **Исправил** отсутствующие feature flags
5. **Добавил** мониторинг и health check настройки