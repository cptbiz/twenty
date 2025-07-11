# Настройка Redis для Twenty CRM

## Обзор

Redis используется в Twenty CRM для кэширования, хранения сессий и обработки фоновых задач. Этот документ содержит инструкции по настройке Redis для локальной разработки и продакшена.

## Статус настройки

✅ **Redis сервер установлен и запущен**  
✅ **Файл .env создан с правильными настройками**  
✅ **Переменная REDIS_URL настроена**  

## Быстрый старт

### 1. Проверка работы Redis
```bash
redis-cli ping
# Ответ: PONG
```

### 2. Переменные окружения
В файле `.env` настроены следующие переменные:
```env
REDIS_URL=redis://localhost:6379
```

### 3. Запуск приложения
После настройки Redis вы можете запустить приложение:
```bash
# Для сервера
cd packages/twenty-server
npm start

# Для фронтенда
cd packages/twenty-front
npm start
```

## Установка Redis

### Локальная установка (Ubuntu/Debian)
```bash
# Установка Redis сервера
sudo apt update
sudo apt install -y redis-server

# Запуск Redis
redis-server --daemonize yes

# Проверка статуса
redis-cli ping
```

### Использование Docker
```bash
# Запуск Redis в Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Или использование docker-compose
docker-compose -f docker-compose.dev.yml up -d redis
```

### Использование готового Makefile
```bash
# Запуск Redis через Makefile
make redis-on-docker
```

## Настройка для разных окружений

### Локальная разработка
```env
REDIS_URL=redis://localhost:6379
```

### Docker окружение
```env
REDIS_URL=redis://redis:6379
```

### Railway/Облачный Redis
```env
# Railway автоматически предоставляет REDIS_URL
# Не нужно настраивать вручную при использовании Redis addon
```

## Проверка подключения

### Через Redis CLI
```bash
# Подключение к Redis
redis-cli

# Проверка подключения
127.0.0.1:6379> ping
PONG

# Установка и получение значения
127.0.0.1:6379> set test "Hello Redis"
OK
127.0.0.1:6379> get test
"Hello Redis"
```

### Через приложение
После запуска Twenty CRM приложения, Redis подключение будет автоматически проверено. В логах вы увидите:
- ✅ Успешное подключение к Redis
- ❌ Ошибки подключения (если что-то не так)

## Структура конфигурации

### Redis Client Service
Файл: `packages/twenty-server/src/engine/core-modules/redis-client/redis-client.service.ts`

```typescript
// Сервис автоматически использует REDIS_URL из окружения
const redisUrl = this.twentyConfigService.get('REDIS_URL');
```

### Cache Storage
Redis используется для:
- Кэширования данных
- Хранения сессий пользователей
- Очередей фоновых задач

## Troubleshooting

### Redis не отвечает
```bash
# Проверить, запущен ли Redis
ps aux | grep redis

# Перезапустить Redis
redis-server --daemonize yes
```

### Ошибка подключения в приложении
1. Проверьте переменную `REDIS_URL` в файле `.env`
2. Убедитесь, что Redis запущен: `redis-cli ping`
3. Проверьте порт: Redis должен слушать на порту 6379

### Проблемы с производительностью
```bash
# Проверить использование памяти
redis-cli info memory

# Проверить активные подключения
redis-cli info clients
```

## Дополнительные команды

### Мониторинг Redis
```bash
# Просмотр всех команд в реальном времени
redis-cli monitor

# Информация о сервере
redis-cli info

# Список всех ключей (осторожно в продакшене!)
redis-cli keys "*"
```

### Очистка данных
```bash
# Очистить все данные (осторожно!)
redis-cli flushall

# Очистить текущую базу данных
redis-cli flushdb
```

## Безопасность

### Для продакшена:
1. Настройте пароль для Redis
2. Ограничьте доступ по IP
3. Используйте SSL/TLS для подключения
4. Регулярно обновляйте Redis

### Пример с паролем:
```bash
# Запуск Redis с паролем
redis-server --requirepass your_password

# Подключение с паролем
redis-cli -a your_password
```

```env
# В .env файле
REDIS_URL=redis://:your_password@localhost:6379
```

## Заключение

Redis теперь успешно настроен для вашего проекта Twenty CRM. Приложение будет использовать Redis для кэширования и хранения сессий, что значительно улучшит производительность.

При возникновении проблем проверьте:
1. Запущен ли Redis: `redis-cli ping`
2. Правильно ли настроен REDIS_URL в .env
3. Доступен ли порт 6379