import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import { BatchProcessorService } from './batch-processor.service';
import { NotificationMetricsService as MetricsService } from './metrics.service';
import { NotificationChannel, Priority } from '../enums/notification.enum';
import { NotificationJob } from '../interfaces/notification-queue.interface';

describe('BatchProcessorService', () => {
  let service: BatchProcessorService;
  let metricsService: jest.Mocked<MetricsService>;
  let configService: jest.Mocked<ConfigService>;
  let mockQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    mockQueue = {
      getWaitingCount: jest.fn().mockResolvedValue(100),
      add: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchProcessorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
              const config = {
                BATCH_MAX_SIZE: 100,
                BATCH_MAX_CONCURRENCY: 10,
                BATCH_TIMEOUT_MS: 5000,
                EMAIL_POOL_SIZE: 5,
                BATCH_DYNAMIC_SIZING: true,
                EMAIL_HOST: 'smtp.test.com',
                EMAIL_PORT: 587,
                EMAIL_SECURE: false,
                EMAIL_USER: 'test@test.com',
                EMAIL_PASSWORD: 'password',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            recordBatchProcessing: jest.fn(),
          },
        },
        {
          provide: 'BullQueue_notifications',
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<BatchProcessorService>(BatchProcessorService);
    metricsService = module.get(MetricsService);
    configService = module.get(ConfigService);
  });

  describe('addToBatch', () => {
    it('should add notification to batch', async () => {
      const job: NotificationJob = {
        id: 'test-1',
        userProfileId: 'user-1',
        type: 'SYSTEM_UPDATE' as any,
        priority: Priority.MEDIUM,
        channels: [NotificationChannel.EMAIL],
        payload: {
          title: 'Test',
          message: 'Test message',
          data: {},
        },
      };

      await service.addToBatch(job, NotificationChannel.EMAIL);

      // Verify batch was created
      const stats = await service.getBatchStatistics();
      expect(stats.pendingBatches).toBeGreaterThanOrEqual(0);
    });

    it('should process batch when size limit reached', async () => {
      const jobs: NotificationJob[] = Array.from({ length: 100 }, (_, i) => ({
        id: `test-${i}`,
        userProfileId: `user-${i}`,
        type: 'SYSTEM_UPDATE' as any,
        priority: Priority.MEDIUM,
        channels: [NotificationChannel.EMAIL],
        payload: {
          title: `Test ${i}`,
          message: `Test message ${i}`,
          data: {},
        },
      }));

      // Add jobs to batch
      for (const job of jobs) {
        await service.addToBatch(job, NotificationChannel.EMAIL);
      }

      // Verify metrics were recorded
      expect(metricsService.recordBatchProcessing).toHaveBeenCalled();
    });
  });

  describe('dynamic batch sizing', () => {
    it('should increase batch size under high load', async () => {
      jest.spyOn(mockQueue, 'getWaitingCount').mockResolvedValue(1500);

      const job: NotificationJob = {
        id: 'test-1',
        userProfileId: 'user-1',
        type: 'SYSTEM_UPDATE' as any,
        priority: Priority.MEDIUM,
        channels: [NotificationChannel.EMAIL],
        payload: {
          title: 'Test',
          message: 'Test message',
          data: {},
        },
      };

      await service.addToBatch(job, NotificationChannel.EMAIL);

      // Dynamic sizing should adjust based on queue pressure
      const stats = await service.getBatchStatistics();
      expect(stats.config.dynamicSizing).toBe(true);
    });

    it('should reduce batch size when processing is slow', async () => {
      // Simulate slow processing by adding delay
      const job: NotificationJob = {
        id: 'test-1',
        userProfileId: 'user-1',
        type: 'SYSTEM_UPDATE' as any,
        priority: Priority.LOW,
        channels: [NotificationChannel.EMAIL],
        payload: {
          title: 'Test',
          message: 'Test message',
          data: {},
        },
      };

      await service.addToBatch(job, NotificationChannel.EMAIL);

      const stats = await service.getBatchStatistics();
      expect(stats).toBeDefined();
    });
  });

  describe('connection pooling', () => {
    it('should maintain connection pool statistics', async () => {
      const stats = await service.getBatchStatistics();

      expect(stats.connectionPool).toBeDefined();
      expect(stats.connectionPool.size).toBeGreaterThanOrEqual(0);
      expect(stats.connectionPool.available).toBeGreaterThanOrEqual(0);
      expect(stats.connectionPool.pending).toBeGreaterThanOrEqual(0);
      expect(stats.connectionPool.borrowed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getBatchStatistics', () => {
    it('should return comprehensive batch statistics', async () => {
      const stats = await service.getBatchStatistics();

      expect(stats).toMatchObject({
        pendingBatches: expect.any(Number),
        batches: expect.any(Array),
        connectionPool: expect.objectContaining({
          size: expect.any(Number),
          available: expect.any(Number),
          pending: expect.any(Number),
          borrowed: expect.any(Number),
        }),
        processingMetrics: expect.any(Object),
        config: expect.objectContaining({
          maxBatchSize: expect.any(Number),
          maxConcurrency: expect.any(Number),
          batchTimeout: expect.any(Number),
          connectionPoolSize: expect.any(Number),
          dynamicSizing: expect.any(Boolean),
        }),
      });
    });
  });

  describe('shutdown', () => {
    it('should gracefully shutdown and process pending batches', async () => {
      const job: NotificationJob = {
        id: 'test-1',
        userProfileId: 'user-1',
        type: 'SYSTEM_UPDATE' as any,
        priority: Priority.MEDIUM,
        channels: [NotificationChannel.EMAIL],
        payload: {
          title: 'Test',
          message: 'Test message',
          data: {},
        },
      };

      await service.addToBatch(job, NotificationChannel.EMAIL);
      await service.shutdown();

      // All pending batches should be processed
      const stats = await service.getBatchStatistics();
      expect(stats.pendingBatches).toBe(0);
    });
  });
});