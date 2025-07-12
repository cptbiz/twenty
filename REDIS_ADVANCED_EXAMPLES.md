# Расширенные примеры использования Redis в Twenty CRM

## 1. Система кэширования с автоматической инвалидацией

### Декоратор для автоматического кэширования

```typescript
import { Injectable, SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

// Декоратор для методов
export const Cache = (prefix: string, ttl: number = 3600) => SetMetadata('cache', { prefix, ttl });

// Декоратор для параметров
export const CacheKey = createParamDecorator((data: string, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return data ? request.params[data] : request.params;
});

@Injectable()
export class CacheInterceptor {
  constructor(private readonly redisClientService: RedisClientService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const handler = context.getHandler();
    const cacheMetadata = Reflect.getMetadata('cache', handler);
    
    if (!cacheMetadata) {
      return next.handle();
    }

    const { prefix, ttl } = cacheMetadata;
    const args = context.getArgs();
    const cacheKey = this.generateCacheKey(prefix, args);
    
    // Попытка получить из кэша
    const cachedData = await this.getFromCache(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }

    // Выполнение оригинального метода
    return next.handle().pipe(
      tap(async (data) => {
        await this.setCache(cacheKey, data, ttl);
      })
    );
  }

  private generateCacheKey(prefix: string, args: any[]): string {
    const keyParts = [prefix, ...args.map(arg => JSON.stringify(arg))];
    return keyParts.join(':');
  }

  private async getFromCache(key: string): Promise<any> {
    const client = this.redisClientService.getClient();
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async setCache(key: string, data: any, ttl: number): Promise<void> {
    const client = this.redisClientService.getClient();
    await client.set(key, JSON.stringify(data), 'EX', ttl);
  }
}
```

### Использование кэширования с декоратором

```typescript
import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, Cache, CacheKey } from './cache.interceptor';

@Controller('api/data')
@UseInterceptors(CacheInterceptor)
export class DataController {
  
  @Get('user/:id')
  @Cache('user_profile', 1800) // 30 минут
  async getUserProfile(@CacheKey('id') userId: string) {
    // Этот метод будет автоматически кэшироваться
    return await this.userService.getFullProfile(userId);
  }

  @Get('reports/:type/:period')
  @Cache('report', 3600) // 1 час
  async getReport(
    @CacheKey('type') type: string,
    @CacheKey('period') period: string
  ) {
    return await this.reportService.generateReport(type, period);
  }
}
```

## 2. Система событий с Redis Pub/Sub

### Сервис для работы с событиями

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RedisEventService implements OnModuleInit, OnModuleDestroy {
  private subscriber: IORedis;
  private publisher: IORedis;

  constructor(
    private readonly redisClientService: RedisClientService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async onModuleInit() {
    this.subscriber = this.redisClientService.getClient().duplicate();
    this.publisher = this.redisClientService.getClient();
    
    // Подписка на все события
    this.subscriber.psubscribe('twenty:*');
    
    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.handleRedisMessage(channel, message);
    });
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }

  // Публикация события
  async publishEvent(eventName: string, data: any): Promise<void> {
    const channel = `twenty:${eventName}`;
    const message = JSON.stringify({
      timestamp: new Date().toISOString(),
      data,
      source: 'twenty-server'
    });
    
    await this.publisher.publish(channel, message);
  }

  // Обработка входящих сообщений
  private handleRedisMessage(channel: string, message: string): void {
    try {
      const eventName = channel.replace('twenty:', '');
      const parsedMessage = JSON.parse(message);
      
      // Передача события локальному EventEmitter
      this.eventEmitter.emit(eventName, parsedMessage);
    } catch (error) {
      console.error('Error processing Redis message:', error);
    }
  }

  // Подписка на конкретное событие
  async subscribeToEvent(eventName: string, callback: (data: any) => void): Promise<void> {
    this.eventEmitter.on(eventName, callback);
  }
}
```

### Использование системы событий

```typescript
import { Injectable } from '@nestjs/common';
import { RedisEventService } from './redis-event.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class UserEventHandler {
  constructor(private readonly redisEventService: RedisEventService) {}

  // Публикация события при создании пользователя
  async createUser(userData: any): Promise<void> {
    // Создание пользователя в базе данных
    const user = await this.userRepository.create(userData);
    
    // Публикация события
    await this.redisEventService.publishEvent('user.created', {
      userId: user.id,
      email: user.email,
      createdAt: user.createdAt
    });
  }

  // Обработка события создания пользователя
  @OnEvent('user.created')
  async handleUserCreated(event: any): Promise<void> {
    console.log('User created:', event.data);
    
    // Отправка приветственного email
    await this.emailService.sendWelcomeEmail(event.data.email);
    
    // Создание записи в аналитике
    await this.analyticsService.trackUserRegistration(event.data.userId);
  }

  // Обработка события обновления пользователя
  @OnEvent('user.updated')
  async handleUserUpdated(event: any): Promise<void> {
    // Инвалидация кэша пользователя
    await this.cacheService.invalidateUserCache(event.data.userId);
    
    // Обновление поисковых индексов
    await this.searchService.updateUserIndex(event.data.userId);
  }
}
```

## 3. Система блокировок (Distributed Locks)

### Сервис для распределенных блокировок

```typescript
import { Injectable } from '@nestjs/common';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

@Injectable()
export class RedisLockService {
  private readonly LOCK_PREFIX = 'lock:';
  private readonly DEFAULT_TTL = 30000; // 30 секунд

  constructor(private readonly redisClientService: RedisClientService) {}

  // Получение блокировки
  async acquireLock(
    resource: string, 
    ttl: number = this.DEFAULT_TTL,
    retries: number = 3
  ): Promise<string | null> {
    const client = this.redisClientService.getClient();
    const lockKey = `${this.LOCK_PREFIX}${resource}`;
    const lockValue = this.generateLockValue();
    
    for (let i = 0; i < retries; i++) {
      const result = await client.set(lockKey, lockValue, 'PX', ttl, 'NX');
      
      if (result === 'OK') {
        return lockValue; // Блокировка получена
      }
      
      // Ждем перед следующей попыткой
      await this.sleep(100 * (i + 1));
    }
    
    return null; // Не удалось получить блокировку
  }

  // Освобождение блокировки
  async releaseLock(resource: string, lockValue: string): Promise<boolean> {
    const client = this.redisClientService.getClient();
    const lockKey = `${this.LOCK_PREFIX}${resource}`;
    
    // Lua скрипт для атомарного освобождения
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    const result = await client.eval(script, 1, lockKey, lockValue);
    return result === 1;
  }

  // Выполнение кода с блокировкой
  async withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const lockValue = await this.acquireLock(resource, ttl);
    
    if (!lockValue) {
      throw new Error(`Cannot acquire lock for resource: ${resource}`);
    }
    
    try {
      return await fn();
    } finally {
      await this.releaseLock(resource, lockValue);
    }
  }

  private generateLockValue(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Использование блокировок

```typescript
import { Injectable } from '@nestjs/common';
import { RedisLockService } from './redis-lock.service';

@Injectable()
export class OrderService {
  constructor(private readonly lockService: RedisLockService) {}

  // Создание заказа с блокировкой
  async createOrder(userId: string, items: any[]): Promise<any> {
    const lockResource = `user:${userId}:order`;
    
    return await this.lockService.withLock(lockResource, async () => {
      // Проверка лимитов пользователя
      const userLimits = await this.checkUserLimits(userId);
      
      if (!userLimits.canCreateOrder) {
        throw new Error('User has reached order limit');
      }
      
      // Создание заказа
      const order = await this.orderRepository.create({
        userId,
        items,
        status: 'pending'
      });
      
      // Обновление счетчиков
      await this.updateUserOrderCount(userId);
      
      return order;
    }, 10000); // 10 секунд блокировка
  }

  // Обновление баланса с блокировкой
  async updateUserBalance(userId: string, amount: number): Promise<void> {
    const lockResource = `user:${userId}:balance`;
    
    await this.lockService.withLock(lockResource, async () => {
      const currentBalance = await this.getUserBalance(userId);
      const newBalance = currentBalance + amount;
      
      if (newBalance < 0) {
        throw new Error('Insufficient balance');
      }
      
      await this.setUserBalance(userId, newBalance);
    });
  }
}
```

## 4. Система счетчиков и аналитики

### Сервис для счетчиков

```typescript
import { Injectable } from '@nestjs/common';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

@Injectable()
export class RedisCounterService {
  private readonly COUNTER_PREFIX = 'counter:';
  private readonly ANALYTICS_PREFIX = 'analytics:';

  constructor(private readonly redisClientService: RedisClientService) {}

  // Увеличение счетчика
  async increment(key: string, amount: number = 1): Promise<number> {
    const client = this.redisClientService.getClient();
    const counterKey = `${this.COUNTER_PREFIX}${key}`;
    return await client.incrby(counterKey, amount);
  }

  // Получение значения счетчика
  async getCounter(key: string): Promise<number> {
    const client = this.redisClientService.getClient();
    const counterKey = `${this.COUNTER_PREFIX}${key}`;
    const value = await client.get(counterKey);
    return value ? parseInt(value, 10) : 0;
  }

  // Сброс счетчика
  async resetCounter(key: string): Promise<void> {
    const client = this.redisClientService.getClient();
    const counterKey = `${this.COUNTER_PREFIX}${key}`;
    await client.del(counterKey);
  }

  // Записать аналитическое событие
  async recordAnalytics(event: string, data: any): Promise<void> {
    const client = this.redisClientService.getClient();
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hourKey = now.getHours().toString().padStart(2, '0');
    
    // Сохранение по дням
    const dayKey = `${this.ANALYTICS_PREFIX}${event}:daily:${dateKey}`;
    await client.hincrby(dayKey, 'count', 1);
    await client.expire(dayKey, 86400 * 30); // 30 дней
    
    // Сохранение по часам
    const hourlyKey = `${this.ANALYTICS_PREFIX}${event}:hourly:${dateKey}`;
    await client.hincrby(hourlyKey, hourKey, 1);
    await client.expire(hourlyKey, 86400 * 7); // 7 дней
    
    // Сохранение детальных данных
    if (data) {
      const detailKey = `${this.ANALYTICS_PREFIX}${event}:details:${dateKey}`;
      await client.lpush(detailKey, JSON.stringify({
        timestamp: now.toISOString(),
        data
      }));
      await client.expire(detailKey, 86400 * 7); // 7 дней
    }
  }

  // Получение аналитики за период
  async getAnalytics(event: string, period: 'daily' | 'hourly', date: string): Promise<any> {
    const client = this.redisClientService.getClient();
    const key = `${this.ANALYTICS_PREFIX}${event}:${period}:${date}`;
    
    if (period === 'daily') {
      const count = await client.hget(key, 'count');
      return { date, count: count ? parseInt(count, 10) : 0 };
    } else {
      const hourlyData = await client.hgetall(key);
      return { date, hourly: hourlyData };
    }
  }

  // Получение топ событий
  async getTopEvents(event: string, date: string, limit: number = 10): Promise<any[]> {
    const client = this.redisClientService.getClient();
    const detailKey = `${this.ANALYTICS_PREFIX}${event}:details:${date}`;
    
    const events = await client.lrange(detailKey, 0, limit - 1);
    return events.map(eventStr => JSON.parse(eventStr));
  }
}
```

### Использование аналитики

```typescript
import { Injectable } from '@nestjs/common';
import { RedisCounterService } from './redis-counter.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly counterService: RedisCounterService) {}

  // Отслеживание просмотров страниц
  async trackPageView(userId: string, page: string): Promise<void> {
    // Глобальные счетчики
    await this.counterService.increment(`page_views:${page}`);
    await this.counterService.increment('total_page_views');
    
    // Пользовательские счетчики
    if (userId) {
      await this.counterService.increment(`user:${userId}:page_views`);
    }
    
    // Аналитические события
    await this.counterService.recordAnalytics('page_view', {
      userId,
      page,
      userAgent: 'browser-info',
      ip: 'user-ip'
    });
  }

  // Отслеживание действий пользователя
  async trackUserAction(userId: string, action: string, metadata?: any): Promise<void> {
    await this.counterService.increment(`user:${userId}:actions:${action}`);
    await this.counterService.increment(`actions:${action}`);
    
    await this.counterService.recordAnalytics('user_action', {
      userId,
      action,
      metadata
    });
  }

  // Получение статистики пользователя
  async getUserStats(userId: string): Promise<any> {
    const pageViews = await this.counterService.getCounter(`user:${userId}:page_views`);
    const today = new Date().toISOString().split('T')[0];
    
    const dailyStats = await this.counterService.getAnalytics('page_view', 'daily', today);
    
    return {
      pageViews,
      dailyActivity: dailyStats,
      lastUpdate: new Date().toISOString()
    };
  }

  // Получение топ страниц
  async getTopPages(limit: number = 10): Promise<any[]> {
    const client = this.redisClientService.getClient();
    const pattern = 'counter:page_views:*';
    const keys = await client.keys(pattern);
    
    const results = [];
    for (const key of keys) {
      const count = await client.get(key);
      const page = key.replace('counter:page_views:', '');
      results.push({ page, count: parseInt(count, 10) });
    }
    
    return results
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
```

## 5. Система сессий и токенов

### Сервис для управления сессиями

```typescript
import { Injectable } from '@nestjs/common';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

@Injectable()
export class SessionService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly TOKEN_PREFIX = 'token:';
  private readonly DEFAULT_TTL = 3600 * 24; // 24 часа

  constructor(private readonly redisClientService: RedisClientService) {}

  // Создание сессии
  async createSession(userId: string, sessionData: any): Promise<string> {
    const client = this.redisClientService.getClient();
    const sessionId = this.generateSessionId();
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    
    const session = {
      userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ...sessionData
    };
    
    await client.set(sessionKey, JSON.stringify(session), 'EX', this.DEFAULT_TTL);
    
    // Добавление в список активных сессий пользователя
    const userSessionsKey = `user:${userId}:sessions`;
    await client.sadd(userSessionsKey, sessionId);
    await client.expire(userSessionsKey, this.DEFAULT_TTL);
    
    return sessionId;
  }

  // Получение сессии
  async getSession(sessionId: string): Promise<any> {
    const client = this.redisClientService.getClient();
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    
    const sessionData = await client.get(sessionKey);
    if (!sessionData) {
      return null;
    }
    
    const session = JSON.parse(sessionData);
    
    // Обновление времени последней активности
    session.lastActivity = new Date().toISOString();
    await client.set(sessionKey, JSON.stringify(session), 'EX', this.DEFAULT_TTL);
    
    return session;
  }

  // Удаление сессии
  async deleteSession(sessionId: string): Promise<void> {
    const client = this.redisClientService.getClient();
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    
    // Получение данных сессии для удаления из списка пользователя
    const sessionData = await client.get(sessionKey);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      const userSessionsKey = `user:${session.userId}:sessions`;
      await client.srem(userSessionsKey, sessionId);
    }
    
    await client.del(sessionKey);
  }

  // Получение всех активных сессий пользователя
  async getUserSessions(userId: string): Promise<any[]> {
    const client = this.redisClientService.getClient();
    const userSessionsKey = `user:${userId}:sessions`;
    
    const sessionIds = await client.smembers(userSessionsKey);
    const sessions = [];
    
    for (const sessionId of sessionIds) {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const sessionData = await client.get(sessionKey);
      
      if (sessionData) {
        sessions.push({
          id: sessionId,
          ...JSON.parse(sessionData)
        });
      }
    }
    
    return sessions;
  }

  // Создание JWT токена в Redis
  async storeToken(userId: string, tokenData: any, ttl: number = 3600): Promise<string> {
    const client = this.redisClientService.getClient();
    const tokenId = this.generateTokenId();
    const tokenKey = `${this.TOKEN_PREFIX}${tokenId}`;
    
    const token = {
      userId,
      createdAt: new Date().toISOString(),
      ...tokenData
    };
    
    await client.set(tokenKey, JSON.stringify(token), 'EX', ttl);
    return tokenId;
  }

  // Проверка токена
  async validateToken(tokenId: string): Promise<any> {
    const client = this.redisClientService.getClient();
    const tokenKey = `${this.TOKEN_PREFIX}${tokenId}`;
    
    const tokenData = await client.get(tokenKey);
    return tokenData ? JSON.parse(tokenData) : null;
  }

  // Отзыв токена
  async revokeToken(tokenId: string): Promise<void> {
    const client = this.redisClientService.getClient();
    const tokenKey = `${this.TOKEN_PREFIX}${tokenId}`;
    await client.del(tokenKey);
  }

  // Очистка всех сессий пользователя
  async clearUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    
    for (const session of sessions) {
      await this.deleteSession(session.id);
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTokenId(): string {
    return `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## 6. Система уведомлений в реальном времени

### Сервис для уведомлений

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly NOTIFICATION_PREFIX = 'notification:';
  private readonly CHANNEL_PREFIX = 'channel:';
  private subscriber: IORedis;

  constructor(private readonly redisClientService: RedisClientService) {}

  async onModuleInit() {
    this.subscriber = this.redisClientService.getClient().duplicate();
    this.subscriber.psubscribe('notification:*');
    
    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.handleNotification(channel, message);
    });
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }

  // Отправка уведомления пользователю
  async sendNotification(userId: string, notification: any): Promise<void> {
    const client = this.redisClientService.getClient();
    const channel = `notification:user:${userId}`;
    
    const message = {
      id: this.generateNotificationId(),
      userId,
      timestamp: new Date().toISOString(),
      ...notification
    };
    
    // Публикация в Redis
    await client.publish(channel, JSON.stringify(message));
    
    // Сохранение в истории уведомлений
    await this.saveNotificationHistory(userId, message);
  }

  // Отправка уведомления в группу
  async sendGroupNotification(groupId: string, notification: any): Promise<void> {
    const client = this.redisClientService.getClient();
    const channel = `notification:group:${groupId}`;
    
    const message = {
      id: this.generateNotificationId(),
      groupId,
      timestamp: new Date().toISOString(),
      ...notification
    };
    
    await client.publish(channel, JSON.stringify(message));
  }

  // Получение истории уведомлений
  async getNotificationHistory(userId: string, limit: number = 50): Promise<any[]> {
    const client = this.redisClientService.getClient();
    const historyKey = `${this.NOTIFICATION_PREFIX}history:${userId}`;
    
    const notifications = await client.lrange(historyKey, 0, limit - 1);
    return notifications.map(n => JSON.parse(n));
  }

  // Отметка уведомления как прочитанного
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const client = this.redisClientService.getClient();
    const readKey = `${this.NOTIFICATION_PREFIX}read:${userId}`;
    
    await client.sadd(readKey, notificationId);
    await client.expire(readKey, 86400 * 30); // 30 дней
  }

  // Получение непрочитанных уведомлений
  async getUnreadNotifications(userId: string): Promise<any[]> {
    const client = this.redisClientService.getClient();
    const readKey = `${this.NOTIFICATION_PREFIX}read:${userId}`;
    
    const allNotifications = await this.getNotificationHistory(userId);
    const readIds = await client.smembers(readKey);
    
    return allNotifications.filter(n => !readIds.includes(n.id));
  }

  // Подписка на канал уведомлений
  async subscribeToChannel(userId: string, channelId: string): Promise<void> {
    const client = this.redisClientService.getClient();
    const subscriptionKey = `${this.CHANNEL_PREFIX}${channelId}:subscribers`;
    
    await client.sadd(subscriptionKey, userId);
    await client.expire(subscriptionKey, 86400 * 365); // 1 год
  }

  // Отписка от канала
  async unsubscribeFromChannel(userId: string, channelId: string): Promise<void> {
    const client = this.redisClientService.getClient();
    const subscriptionKey = `${this.CHANNEL_PREFIX}${channelId}:subscribers`;
    
    await client.srem(subscriptionKey, userId);
  }

  // Отправка уведомления в канал
  async sendChannelNotification(channelId: string, notification: any): Promise<void> {
    const client = this.redisClientService.getClient();
    const subscriptionKey = `${this.CHANNEL_PREFIX}${channelId}:subscribers`;
    
    const subscribers = await client.smembers(subscriptionKey);
    
    for (const userId of subscribers) {
      await this.sendNotification(userId, {
        ...notification,
        channel: channelId
      });
    }
  }

  private async saveNotificationHistory(userId: string, message: any): Promise<void> {
    const client = this.redisClientService.getClient();
    const historyKey = `${this.NOTIFICATION_PREFIX}history:${userId}`;
    
    await client.lpush(historyKey, JSON.stringify(message));
    await client.ltrim(historyKey, 0, 999); // Храним только последние 1000 уведомлений
    await client.expire(historyKey, 86400 * 30); // 30 дней
  }

  private handleNotification(channel: string, message: string): void {
    try {
      const notification = JSON.parse(message);
      
      // Здесь можно добавить логику для отправки через WebSocket
      console.log('Received notification:', notification);
      
      // Отправка через WebSocket, если доступно
      if (this.webSocketServer) {
        this.webSocketServer.to(channel).emit('notification', notification);
      }
    } catch (error) {
      console.error('Error processing notification:', error);
    }
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

Эти расширенные примеры показывают, как можно эффективно использовать Redis для различных задач в приложении Twenty CRM, включая кэширование, события, блокировки, аналитику, сессии и уведомления.