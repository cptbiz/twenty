import { CacheModuleOptions } from '@nestjs/common';

import { redisStore } from 'cache-manager-redis-yet';

import { CacheStorageType } from 'src/engine/core-modules/cache-storage/types/cache-storage-type.enum';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

export const cacheStorageModuleFactory = (
  twentyConfigService: TwentyConfigService,
): CacheModuleOptions => {
  const cacheStorageType = CacheStorageType.Redis;
  const cacheStorageTtl = twentyConfigService.get('CACHE_STORAGE_TTL');
  const cacheModuleOptions: CacheModuleOptions = {
    isGlobal: true,
    ttl: cacheStorageTtl * 1000,
  };

  switch (cacheStorageType) {
    /* case CacheStorageType.Memory: {
      return cacheModuleOptions;
    }*/
    case CacheStorageType.Redis: {
      const redisUrl = 'redis://default:glXnyATQhEXwuWrFBYNQSZetrKRU65RX@redis-18503.c44.us-east-1-2.ec2.redns.redis-cloud.com:18503';

      return {
        ...cacheModuleOptions,
        store: redisStore,
        url: redisUrl,
      };
    }
    default:
      throw new Error(
        `Invalid cache-storage (${cacheStorageType}), check your .env file`,
      );
  }
};
