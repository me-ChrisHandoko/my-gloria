import { BullModuleOptions } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

export const getBullConfig = (
  configService: ConfigService,
): BullModuleOptions => {
  const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
  const redisPort = configService.get<number>('REDIS_PORT', 6379);
  const redisPassword = configService.get<string>('REDIS_PASSWORD');
  const redisDb = configService.get<number>('REDIS_DB', 0);

  return {
    redis: {
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      db: redisDb,
      retryStrategy: (times: number) => {
        // Reconnect after
        return Math.min(times * 50, 2000);
      },
      // Remove enableReadyCheck and maxRetriesPerRequest as Bull doesn't allow them
      // for bclient/subscriber connections
      connectTimeout: 10000,
      disconnectTimeout: 2000,
      commandTimeout: 5000,
      enableOfflineQueue: true,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },
    },
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  };
};

export const createQueueConfig = (
  name: string,
  configOverrides?: Partial<BullModuleOptions>,
): BullModuleOptions => {
  const baseConfig = {
    name,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
    },
  };

  return {
    ...baseConfig,
    ...configOverrides,
    defaultJobOptions: {
      ...baseConfig.defaultJobOptions,
      ...(configOverrides?.defaultJobOptions || {}),
    },
  };
};
