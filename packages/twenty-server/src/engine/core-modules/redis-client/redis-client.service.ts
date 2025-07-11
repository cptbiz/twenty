import { Injectable, OnModuleDestroy } from '@nestjs/common';

import IORedis from 'ioredis';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class RedisClientService implements OnModuleDestroy {
  private redisClient: IORedis | null = null;

  constructor(private readonly twentyConfigService: TwentyConfigService) {}

  getClient() {
    if (!this.redisClient) {
      const redisUrl = 'redis://default:glXnyATQhEXwuWrFBYNQSZetrKRU65RX@redis-18503.c44.us-east-1-2.ec2.redns.redis-cloud.com:18503';

      this.redisClient = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
      });
    }

    return this.redisClient;
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }
  }
}
