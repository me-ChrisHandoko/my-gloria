import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../services/audit.service';
import { AuditQueueService } from '../services/audit-queue.service';
import { AuditEventService } from '../services/audit-event.service';
import { AuditIntegrityService } from '../services/audit-integrity.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AuditAction } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

describe('AuditService', () => {
  let service: AuditService;
  let prismaService: PrismaService;
  let auditQueueService: AuditQueueService;
  let auditEventService: AuditEventService;
  let auditIntegrityService: AuditIntegrityService;
  let cacheManager: any;

  const mockPrismaService = {
    auditLog: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAuditQueueService = {
    addToQueue: jest.fn(),
    addBatchToQueue: jest.fn(),
    getQueueStats: jest.fn(),
  };

  const mockAuditEventService = {
    emitAuditLog: jest.fn(),
    getEventStatistics: jest.fn(),
  };

  const mockAuditIntegrityService = {
    verifyIntegrity: jest.fn(),
    verifyChainIntegrity: jest.fn(),
    exportIntegrityReport: jest.fn(),
    repairChainIntegrity: jest.fn(),
    getLastChainHash: jest.fn(),
    generateIntegrityHash: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clear: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditQueueService,
          useValue: mockAuditQueueService,
        },
        {
          provide: AuditEventService,
          useValue: mockAuditEventService,
        },
        {
          provide: AuditIntegrityService,
          useValue: mockAuditIntegrityService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditQueueService = module.get<AuditQueueService>(AuditQueueService);
    auditEventService = module.get<AuditEventService>(AuditEventService);
    auditIntegrityService = module.get<AuditIntegrityService>(AuditIntegrityService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should log an audit entry with event-driven architecture', async () => {
      const context = {
        actorId: 'user123',
        module: 'User',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      const change = {
        entityType: 'User',
        entityId: 'entity123',
        action: AuditAction.UPDATE,
        oldValues: { name: 'Old Name' },
        newValues: { name: 'New Name' },
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        id: 'profile123',
      });

      await service.log(context, change);

      expect(mockAuditEventService.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entry: expect.objectContaining({
            actorId: 'user123',
            module: 'User',
            entityType: 'User',
            entityId: 'entity123',
            action: AuditAction.UPDATE,
          }),
          priority: 'high',
          async: true,
        }),
      );
    });

    it('should handle critical operations synchronously', async () => {
      const context = {
        actorId: 'user123',
        module: 'permission',
        ipAddress: '127.0.0.1',
      };

      const change = {
        entityType: 'Permission',
        entityId: 'perm123',
        action: AuditAction.DELETE,
        oldValues: { name: 'Admin Permission' },
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        id: 'profile123',
      });

      await service.log(context, change);

      expect(mockAuditEventService.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'critical',
          async: false,
        }),
      );
    });

    it('should use cached actor profile when available', async () => {
      const context = {
        actorId: 'user123',
        module: 'User',
      };

      const change = {
        entityType: 'User',
        entityId: 'entity123',
        action: AuditAction.VIEW,
      };

      mockCacheManager.get.mockResolvedValue('cached-profile-id');

      await service.log(context, change);

      expect(mockPrismaService.userProfile.findUnique).not.toHaveBeenCalled();
      expect(mockAuditEventService.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entry: expect.objectContaining({
            actorProfileId: 'cached-profile-id',
          }),
        }),
      );
    });
  });

  describe('logCreate', () => {
    it('should log a CREATE action', async () => {
      const context = {
        actorId: 'user123',
        module: 'User',
      };

      const newValues = { name: 'New User', email: 'user@example.com' };

      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        id: 'profile123',
      });

      await service.logCreate(
        context,
        'User',
        'user456',
        newValues,
        'New User',
      );

      expect(mockAuditEventService.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entry: expect.objectContaining({
            action: AuditAction.CREATE,
            entityType: 'User',
            entityId: 'user456',
            entityDisplay: 'New User',
            newValues,
            oldValues: null,
          }),
        }),
      );
    });
  });

  describe('logUpdate', () => {
    it('should log an UPDATE action with changed fields', async () => {
      const context = {
        actorId: 'user123',
        module: 'User',
      };

      const oldValues = { name: 'Old Name', email: 'old@example.com' };
      const newValues = { name: 'New Name', email: 'old@example.com' };

      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        id: 'profile123',
      });

      await service.logUpdate(
        context,
        'User',
        'user456',
        oldValues,
        newValues,
        'User Display',
      );

      expect(mockAuditEventService.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entry: expect.objectContaining({
            action: AuditAction.UPDATE,
            changedFields: ['name'],
          }),
        }),
      );
    });
  });

  describe('logDelete', () => {
    it('should log a DELETE action with critical priority', async () => {
      const context = {
        actorId: 'user123',
        module: 'User',
      };

      const oldValues = { name: 'Deleted User', email: 'user@example.com' };

      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        id: 'profile123',
      });

      await service.logDelete(
        context,
        'User',
        'user456',
        oldValues,
        'Deleted User',
      );

      expect(mockAuditEventService.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entry: expect.objectContaining({
            action: AuditAction.DELETE,
            oldValues,
          }),
          priority: 'critical',
          async: false,
        }),
      );
    });
  });

  describe('query', () => {
    it('should query audit logs with filters', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        entityType: 'User',
        action: AuditAction.UPDATE,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      const mockLogs = [
        {
          id: 'log1',
          actorId: 'user1',
          action: AuditAction.UPDATE,
          entityType: 'User',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.query(queryDto);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'User',
            action: AuditAction.UPDATE,
          }),
          skip: 0,
          take: 10,
        }),
      );

      expect(result).toEqual({
        data: mockLogs,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should use cache for query results', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
      };

      const cachedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.query(queryDto);

      expect(mockPrismaService.auditLog.findMany).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });
  });

  describe('verifyIntegrity', () => {
    it('should verify audit log integrity', async () => {
      const auditLogId = 'log123';
      const mockVerificationResult = {
        isValid: true,
        expectedHash: 'hash123',
        actualHash: 'hash123',
        reason: 'Integrity verified',
      };

      mockAuditIntegrityService.verifyIntegrity.mockResolvedValue(
        mockVerificationResult,
      );

      const result = await service.verifyIntegrity(auditLogId);

      expect(mockAuditIntegrityService.verifyIntegrity).toHaveBeenCalledWith(
        auditLogId,
      );
      expect(result).toEqual(mockVerificationResult);
    });
  });

  describe('verifyChainIntegrity', () => {
    it('should verify entire audit chain integrity', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockChainResult = {
        isValid: true,
        totalChecked: 100,
        invalidEntries: [],
      };

      mockAuditIntegrityService.verifyChainIntegrity.mockResolvedValue(
        mockChainResult,
      );

      const result = await service.verifyChainIntegrity(startDate, endDate);

      expect(
        mockAuditIntegrityService.verifyChainIntegrity,
      ).toHaveBeenCalledWith(startDate, endDate);
      expect(result).toEqual(mockChainResult);
    });
  });

  describe('getStatistics', () => {
    it('should return audit statistics', async () => {
      const queryDto = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        groupBy: 'module' as any,
      };

      const mockStats = [
        { module: 'User', _count: { _all: 50 } },
        { module: 'Permission', _count: { _all: 30 } },
      ];

      mockPrismaService.auditLog.aggregate.mockResolvedValue({
        _count: { _all: 80 },
      });
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockResolvedValue(mockStats);

      const result = await service.getStatistics(queryDto);

      expect(result).toEqual(
        expect.objectContaining({
          total: 80,
          groupedData: expect.any(Array),
        }),
      );
    });
  });

  describe('logBatch', () => {
    it('should log multiple audit entries as batch', async () => {
      const context = {
        actorId: 'user123',
        module: 'User',
      };

      const entries = [
        {
          entityType: 'User',
          entityId: 'user1',
          action: AuditAction.CREATE,
          newValues: { name: 'User 1' },
        },
        {
          entityType: 'User',
          entityId: 'user2',
          action: AuditAction.CREATE,
          newValues: { name: 'User 2' },
        },
      ];

      mockCacheManager.get.mockResolvedValue(null);
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        id: 'profile123',
      });

      await service.logBatch(context, entries);

      expect(mockAuditQueueService.addBatchToQueue).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            entityType: 'User',
            entityId: 'user1',
          }),
          expect.objectContaining({
            entityType: 'User',
            entityId: 'user2',
          }),
        ]),
      );
    });
  });

  describe('clearCache', () => {
    it('should clear all audit cache', async () => {
      await service.clearCache();

      expect(mockCacheManager.clear).toHaveBeenCalled();
    });
  });

  describe('getEventStatistics', () => {
    it('should return event statistics', async () => {
      const mockEventStats = {
        queue: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
        },
        batch: {
          pending: 10,
          threshold: 10,
        },
      };

      mockAuditEventService.getEventStatistics.mockResolvedValue(
        mockEventStats,
      );

      const result = await service.getEventStatistics();

      expect(mockAuditEventService.getEventStatistics).toHaveBeenCalled();
      expect(result).toEqual(mockEventStats);
    });
  });
});