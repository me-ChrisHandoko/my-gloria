import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from './rate-limit.service';
import { CacheService } from '../../../cache/cache.service';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      has: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    cacheService = module.get(CacheService);
  });

  describe('isRateLimited', () => {
    it('should allow requests when under rate limit', async () => {
      cacheService.get.mockResolvedValue(JSON.stringify([Date.now() - 1000]));
      cacheService.set.mockResolvedValue(undefined);

      const result = await service.isRateLimited('user123', 'GENERAL');

      expect(result.limited).toBe(false);
      expect(result.remaining).toBeGreaterThan(0);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should block requests when rate limit exceeded', async () => {
      const timestamps = Array(10).fill(Date.now() - 1000); // 10 recent requests
      cacheService.get.mockResolvedValue(JSON.stringify(timestamps));

      const result = await service.isRateLimited('user123', 'GENERAL');

      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should handle cache errors gracefully', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.isRateLimited('user123', 'GENERAL');

      expect(result.limited).toBe(false); // Allow on error
    });
  });

  describe('isDuplicate', () => {
    it('should detect duplicate notifications', async () => {
      cacheService.has.mockResolvedValue(true);

      const result = await service.isDuplicate(
        'user123',
        'Test Title',
        'Test Message',
      );

      expect(result.duplicate).toBe(true);
      expect(result.hash).toBeDefined();
    });

    it('should allow new notifications', async () => {
      cacheService.has.mockResolvedValue(false);
      cacheService.set.mockResolvedValue(undefined);

      const result = await service.isDuplicate(
        'user123',
        'Test Title',
        'Test Message',
      );

      expect(result.duplicate).toBe(false);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should generate consistent hashes', async () => {
      cacheService.has.mockResolvedValue(false);

      const result1 = await service.isDuplicate(
        'user123',
        'Test Title',
        'Test Message',
      );
      const result2 = await service.isDuplicate(
        'user123',
        'Test Title',
        'Test Message',
      );

      expect(result1.hash).toBe(result2.hash);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for specific type', async () => {
      cacheService.del.mockResolvedValue(undefined);

      await service.resetRateLimit('user123', 'GENERAL');

      expect(cacheService.del).toHaveBeenCalledWith(
        'notification:ratelimit:user123:GENERAL',
      );
    });

    it('should reset all rate limits when type not specified', async () => {
      cacheService.del.mockResolvedValue(undefined);

      await service.resetRateLimit('user123');

      expect(cacheService.del).toHaveBeenCalledTimes(6); // All types
    });
  });

  describe('configuration updates', () => {
    it('should update rate limit configuration', () => {
      service.updateRateLimitConfig('CUSTOM', {
        maxRequests: 20,
        windowSeconds: 120,
      });

      // The config is updated internally
      expect(() =>
        service.updateRateLimitConfig('CUSTOM', {
          maxRequests: 20,
          windowSeconds: 120,
        }),
      ).not.toThrow();
    });

    it('should update deduplication configuration', () => {
      service.updateDeduplicationConfig(600); // 10 minutes

      expect(() => service.updateDeduplicationConfig(600)).not.toThrow();
    });
  });
});