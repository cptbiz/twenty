# 🚂 Twenty CRM на Railway

## Быстрое развертывание в один клик

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/twenty-crm)

## Ручное развертывание

### 1. Создайте проект в Railway

1. Перейдите на [railway.app](https://railway.app)
2. Нажмите "New Project" → "Deploy from GitHub repo"
3. Выберите этот репозиторий

### 2. Добавьте сервисы

Добавьте следующие сервисы в ваш проект:

- **PostgreSQL** (Database → PostgreSQL)
- **Redis** (Database → Redis)  
- **Worker** (GitHub repo → тот же репозиторий)

### 3. Настройте переменные

**Для основного сервиса:**
```bash
APP_SECRET=ваш_секретный_ключ_32_символа_минимум
NODE_ENV=production
PORT=3000
STORAGE_TYPE=local
```

**Для worker сервиса:**
```bash
APP_SECRET=тот_же_секретный_ключ
NODE_ENV=production
STORAGE_TYPE=local
DISABLE_DB_MIGRATIONS=true
DISABLE_CRON_JOBS_REGISTRATION=true
```

### 4. Настройте команду запуска worker

В настройках worker сервиса установите:
- **Start Command**: `sh -c ./scripts/railway-worker.sh`

### 5. Готово! 🎉

Ваша CRM система будет доступна по URL, предоставленному Railway.

## Дополнительная настройка

Подробную документацию смотрите в [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

## Что включено

- ✅ Web приложение (сервер + фронтенд)
- ✅ Worker для фоновых задач
- ✅ PostgreSQL база данных
- ✅ Redis для кэширования
- ✅ Автоматические миграции базы данных
- ✅ Health checks
- ✅ Готовая конфигурация для production

## Поддержка

- [Документация Twenty](https://twenty.com/developers)
- [Документация Railway](https://docs.railway.app/)
- [Issues](https://github.com/twentyhq/twenty/issues)