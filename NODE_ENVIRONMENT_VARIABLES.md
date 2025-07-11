# Переменные окружения для нод Twenty CRM

## Обзор архитектуры

В проекте Twenty CRM используются 4 основные ноды:
1. **PostgreSQL** - основная база данных
2. **Redis** - кэширование и очереди задач
3. **Twenty Server** - основное приложение (NestJS)
4. **Twenty Worker** - обработчик фоновых задач

## 1. Переменные для PostgreSQL (База данных)

### Основные переменные:
```env
# PostgreSQL Configuration
POSTGRES_DB=twenty
POSTGRES_USER=twenty
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Полный URL подключения к базе данных
DATABASE_URL=postgresql://twenty:your_secure_password_here@localhost:5432/twenty

# Для Docker
PG_DATABASE_URL=postgresql://twenty:your_secure_password_here@twenty-db:5432/twenty
```

### Дополнительные настройки:
```env
# Отключение миграций (для worker)
DISABLE_DB_MIGRATIONS=false

# Максимальное количество подключений к БД
DATABASE_MAX_CONNECTIONS=20

# Логирование SQL запросов
DATABASE_LOGGING=false
```

## 2. Переменные для Redis (Кэширование и очереди)

### Основные переменные:
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Полный URL подключения к Redis
REDIS_URL=redis://localhost:6379

# Для Docker
REDIS_URL=redis://twenty-redis:6379

# С авторизацией
REDIS_URL=redis://:your_redis_password@localhost:6379
```

### Дополнительные настройки Redis:
```env
# Максимальное время жизни кэша (в секундах)
REDIS_TTL=3600

# Префикс для ключей кэша
REDIS_CACHE_PREFIX=twenty:

# Настройки для очередей
REDIS_QUEUE_PREFIX=twenty:queue:
```

## 3. Переменные для Twenty Server (Основное приложение)

### Основные переменные:
```env
# Application Core
APP_SECRET=your_32_character_random_secret_here_change_me
NODE_ENV=production
PORT=3000
SERVER_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://twenty:password@localhost:5432/twenty

# Redis
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info

# URLs
FRONT_BASE_URL=http://localhost:3000
```

### Дополнительные настройки:
```env
# Storage Configuration
STORAGE_TYPE=local
# Или для S3:
# STORAGE_TYPE=s3
# STORAGE_S3_REGION=us-east-1
# STORAGE_S3_NAME=your-bucket-name
# STORAGE_S3_ENDPOINT=https://your-s3-endpoint.com

# Email Configuration
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME="Your Company Name"
EMAIL_DRIVER=smtp
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your_email@gmail.com
EMAIL_SMTP_PASSWORD=your_app_password

# Auth Providers
AUTH_GOOGLE_CLIENT_ID=your_google_client_id
AUTH_GOOGLE_CLIENT_SECRET=your_google_client_secret
AUTH_GOOGLE_CALLBACK_URL=${SERVER_URL}/auth/google/callback
```

## 4. Переменные для Twenty Worker (Обработчик задач)

### Основные переменные:
```env
# Worker Configuration
NODE_ENV=production
SERVER_URL=http://localhost:3000

# Database (та же что и у server)
DATABASE_URL=postgresql://twenty:password@localhost:5432/twenty

# Redis (та же что и у server)
REDIS_URL=redis://localhost:6379

# Security
APP_SECRET=your_32_character_random_secret_here_change_me

# Специфичные для worker
DISABLE_DB_MIGRATIONS=true
DISABLE_CRON_JOBS_REGISTRATION=false

# Logging
LOG_LEVEL=info
```

### Настройки очередей:
```env
# Queue Configuration
QUEUE_CONCURRENCY=10
QUEUE_MAX_ATTEMPTS=3
QUEUE_BACKOFF_STRATEGY=exponential
QUEUE_REMOVE_ON_COMPLETE=100
QUEUE_REMOVE_ON_FAIL=50
```

## 5. Переменные для всех нод (общие)

### Файл .env в корне проекта:
```env
# =============================================================================
# Twenty CRM - Environment Variables
# =============================================================================

# Core Application
APP_SECRET=your_32_character_random_secret_here_change_me
NODE_ENV=development
PORT=3000
SERVER_URL=http://localhost:3000
FRONT_BASE_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://twenty:password@localhost:5432/twenty

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Storage
STORAGE_TYPE=local

# Logging
LOG_LEVEL=info

# Feature Flags
DISABLE_DB_MIGRATIONS=false
DISABLE_CRON_JOBS_REGISTRATION=false
```

## 6. Подключение Redis в коде

### Использование Redis Client Service

```typescript
import { Injectable } from '@nestjs/common';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

@Injectable()
export class MyService {
  constructor(private readonly redisClientService: RedisClientService) {}

  async setCache(key: string, value: any, ttl: number = 3600): Promise<void> {
    const client = this.redisClientService.getClient();
    await client.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async getCache(key: string): Promise<any> {
    const client = this.redisClientService.getClient();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async deleteCache(key: string): Promise<void> {
    const client = this.redisClientService.getClient();
    await client.del(key);
  }

  async setCacheWithPattern(pattern: string, data: Record<string, any>): Promise<void> {
    const client = this.redisClientService.getClient();
    const pipeline = client.pipeline();
    
    Object.entries(data).forEach(([key, value]) => {
      pipeline.set(`${pattern}:${key}`, JSON.stringify(value));
    });
    
    await pipeline.exec();
  }

  async getCacheByPattern(pattern: string): Promise<Record<string, any>> {
    const client = this.redisClientService.getClient();
    const keys = await client.keys(`${pattern}:*`);
    
    if (keys.length === 0) return {};
    
    const values = await client.mget(keys);
    const result: Record<string, any> = {};
    
    keys.forEach((key, index) => {
      const shortKey = key.replace(`${pattern}:`, '');
      result[shortKey] = values[index] ? JSON.parse(values[index]) : null;
    });
    
    return result;
  }
}
```

### Создание сервиса для работы с пользовательскими данными

```typescript
import { Injectable } from '@nestjs/common';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

@Injectable()
export class UserCacheService {
  constructor(private readonly redisClientService: RedisClientService) {}

  // Кэширование данных пользователя
  async cacheUserData(userId: string, userData: any): Promise<void> {
    const client = this.redisClientService.getClient();
    const key = `user:${userId}`;
    await client.set(key, JSON.stringify(userData), 'EX', 3600); // 1 час
  }

  // Получение данных пользователя из кэша
  async getUserData(userId: string): Promise<any> {
    const client = this.redisClientService.getClient();
    const key = `user:${userId}`;
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Кэширование пользовательских настроек
  async cacheUserSettings(userId: string, settings: any): Promise<void> {
    const client = this.redisClientService.getClient();
    const key = `user:${userId}:settings`;
    await client.hset(key, settings);
    await client.expire(key, 7200); // 2 часа
  }

  // Получение пользовательских настроек
  async getUserSettings(userId: string): Promise<any> {
    const client = this.redisClientService.getClient();
    const key = `user:${userId}:settings`;
    return await client.hgetall(key);
  }

  // Кэширование списка активных пользователей
  async addActiveUser(userId: string): Promise<void> {
    const client = this.redisClientService.getClient();
    const key = 'active_users';
    await client.sadd(key, userId);
    await client.expire(key, 1800); // 30 минут
  }

  // Получение списка активных пользователей
  async getActiveUsers(): Promise<string[]> {
    const client = this.redisClientService.getClient();
    const key = 'active_users';
    return await client.smembers(key);
  }

  // Очистка кэша пользователя
  async clearUserCache(userId: string): Promise<void> {
    const client = this.redisClientService.getClient();
    const pattern = `user:${userId}*`;
    const keys = await client.keys(pattern);
    
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }
}
```

### Использование Redis для очередей задач

```typescript
import { Injectable } from '@nestjs/common';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

@Injectable()
export class QueueService {
  constructor(private readonly redisClientService: RedisClientService) {}

  // Добавление задачи в очередь
  async addJob(queueName: string, jobData: any, priority: number = 0): Promise<void> {
    const client = this.redisClientService.getClient();
    const job = {
      id: Date.now().toString(),
      data: jobData,
      priority,
      createdAt: new Date().toISOString(),
    };
    
    await client.lpush(`queue:${queueName}`, JSON.stringify(job));
  }

  // Получение задачи из очереди
  async getJob(queueName: string): Promise<any> {
    const client = this.redisClientService.getClient();
    const job = await client.brpop(`queue:${queueName}`, 10); // ждем 10 секунд
    return job ? JSON.parse(job[1]) : null;
  }

  // Получение статистики очереди
  async getQueueStats(queueName: string): Promise<any> {
    const client = this.redisClientService.getClient();
    const length = await client.llen(`queue:${queueName}`);
    
    return {
      queueName,
      length,
      timestamp: new Date().toISOString(),
    };
  }

  // Очистка очереди
  async clearQueue(queueName: string): Promise<void> {
    const client = this.redisClientService.getClient();
    await client.del(`queue:${queueName}`);
  }
}
```

### Интеграция в контроллер

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserCacheService } from './user-cache.service';

@Controller('users')
export class UsersController {
  constructor(private readonly userCacheService: UserCacheService) {}

  @Get(':id')
  async getUser(@Param('id') userId: string) {
    // Сначала проверяем кэш
    let userData = await this.userCacheService.getUserData(userId);
    
    if (!userData) {
      // Если в кэше нет, загружаем из базы данных
      userData = await this.loadUserFromDatabase(userId);
      
      // Сохраняем в кэш
      await this.userCacheService.cacheUserData(userId, userData);
    }
    
    return userData;
  }

  @Post(':id/settings')
  async updateUserSettings(
    @Param('id') userId: string,
    @Body() settings: any
  ) {
    // Сохраняем настройки в кэш
    await this.userCacheService.cacheUserSettings(userId, settings);
    
    // Также сохраняем в базу данных
    await this.saveUserSettingsToDatabase(userId, settings);
    
    return { success: true };
  }

  private async loadUserFromDatabase(userId: string): Promise<any> {
    // Логика загрузки из базы данных
    return { id: userId, name: 'User Name' };
  }

  private async saveUserSettingsToDatabase(userId: string, settings: any): Promise<void> {
    // Логика сохранения в базу данных
  }
}
```

## 7. Docker Compose конфигурация

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    container_name: twenty-db
    image: postgres:16
    environment:
      POSTGRES_DB: twenty
      POSTGRES_USER: twenty
      POSTGRES_PASSWORD: ${PG_DATABASE_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - twenty-db-data:/var/lib/postgresql/data
    restart: unless-stopped

  # Redis Cache & Queue
  redis:
    container_name: twenty-redis
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: ["redis-server", "--maxmemory-policy", "noeviction"]
    volumes:
      - twenty-redis-data:/data
    restart: unless-stopped

  # Twenty Server
  server:
    container_name: twenty-server
    image: twentycrm/twenty:latest
    environment:
      NODE_ENV: production
      PORT: 3000
      SERVER_URL: ${SERVER_URL}
      DATABASE_URL: "postgresql://twenty:${PG_DATABASE_PASSWORD}@twenty-db:5432/twenty"
      REDIS_URL: "redis://twenty-redis:6379"
      APP_SECRET: ${APP_SECRET}
      LOG_LEVEL: info
    ports:
      - "3000:3000"
    depends_on:
      - db
      - redis
    restart: unless-stopped

  # Twenty Worker
  worker:
    container_name: twenty-worker
    image: twentycrm/twenty:latest
    command: ["yarn", "worker:prod"]
    environment:
      NODE_ENV: production
      SERVER_URL: ${SERVER_URL}
      DATABASE_URL: "postgresql://twenty:${PG_DATABASE_PASSWORD}@twenty-db:5432/twenty"
      REDIS_URL: "redis://twenty-redis:6379"
      APP_SECRET: ${APP_SECRET}
      DISABLE_DB_MIGRATIONS: "true"
      LOG_LEVEL: info
    depends_on:
      - db
      - redis
    restart: unless-stopped

volumes:
  twenty-db-data:
  twenty-redis-data:
```

## 8. Скрипты для запуска

### package.json scripts:
```json
{
  "scripts": {
    "start:dev": "nest start --watch",
    "start:prod": "node dist/src/main.js",
    "worker:dev": "nest start --watch --entryFile queue-worker",
    "worker:prod": "node dist/src/queue-worker/queue-worker.js",
    "redis:start": "redis-server --daemonize yes",
    "redis:stop": "redis-cli shutdown"
  }
}
```

### Makefile команды:
```makefile
# Запуск всех сервисов
up:
	docker-compose up -d

# Остановка всех сервисов
down:
	docker-compose down

# Запуск только Redis
redis:
	docker-compose up -d redis

# Просмотр логов
logs:
	docker-compose logs -f

# Подключение к Redis CLI
redis-cli:
	docker-compose exec redis redis-cli
```

## 9. Проверка работоспособности

### Скрипт проверки подключений:
```bash
#!/bin/bash

echo "Проверка подключения к PostgreSQL..."
pg_isready -h localhost -p 5432 -U twenty

echo "Проверка подключения к Redis..."
redis-cli ping

echo "Проверка запущенных сервисов..."
docker-compose ps
```

### Проверка в коде:
```typescript
import { Injectable } from '@nestjs/common';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

@Injectable()
export class HealthCheckService {
  constructor(private readonly redisClientService: RedisClientService) {}

  async checkRedisConnection(): Promise<boolean> {
    try {
      const client = this.redisClientService.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis connection failed:', error);
      return false;
    }
  }

  async getSystemStatus(): Promise<any> {
    const redisStatus = await this.checkRedisConnection();
    
    return {
      timestamp: new Date().toISOString(),
      redis: {
        connected: redisStatus,
        url: process.env.REDIS_URL,
      },
      database: {
        url: process.env.DATABASE_URL ? 'configured' : 'not configured',
      },
      environment: process.env.NODE_ENV,
    };
  }
}
```

Эта документация охватывает все переменные окружения для каждой ноды и предоставляет полные примеры интеграции Redis в код приложения.