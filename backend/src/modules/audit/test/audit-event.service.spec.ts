import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditEventService, AuditEventType } from '../services/audit-event.service';
import { AuditQueueService } from '../services/audit-queue.service';
import { AuditIntegrityService } from '../services/audit-integrity.service';
import { ConfigService } from '@nestjs/config';

describe('AuditEventService', () => {
  let service: AuditEventService;
  let eventEmitter: EventEmitter2;
  let auditQueueService: AuditQueueService;
  let auditIntegrityService: AuditIntegrityService;
  let configService: ConfigService;

  const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
  };

  const mockAuditQueueService = {
    addToQueue: jest.fn(),
    addBatchToQueue: jest.fn(),
    getQueueStats: jest.fn(),
  };

  const mockAuditIntegrityService = {
    getLastChainHash: jest.fn(),
    generateIntegrityHash: jest.fn(),
    verifyChainIntegrity: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditEventService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: AuditQueueService,
          useValue: mockAuditQueueService,
        },
        {
          provide: AuditIntegrityService,
          useValue: mockAuditIntegrityService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuditEventService>(AuditEventService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    auditQueueService = module.get<AuditQueueService>(AuditQueueService);
    auditIntegrityService = module.get<AuditIntegrityService>(
      AuditIntegrityService,
    );
    configService = module.get<ConfigService>(ConfigService);

    // Default config values
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      switch (key) {
        case 'AUDIT_ASYNC_ENABLED':
          return true;
        case 'AUDIT_BATCH_THRESHOLD':
          return 10;
        case 'AUDIT_CRITICAL_MODULES':
          return ['auth', 'user', 'permission', 'approval'];
        default:
          return defaultValue;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('emitAuditLog', () => {
    it('should emit audit log with integrity hash', async () => {
      const event = {
        entry: {
          id: 'audit123',
          actorId: 'user123',
          action: 'UPDATE' as any,
          module: 'User',
          entityType: 'User',
          entityId: 'entity123',
          metadata: {},
        },
        priority: 'normal' as const,
        async: true,
      };

      const lastHash = 'last-hash-123';
      const integrityData = {
        id: 'audit123',
        hash: 'new-hash-456',
        previousHash: lastHash,
        signature: 'sig-789',
        timestamp: new Date(),
      };

      mockAuditIntegrityService.getLastChainHash.mockResolvedValue(lastHash);
      mockAuditIntegrityService.generateIntegrityHash.mockResolvedValue(
        integrityData,
      );

      await service.emitAuditLog(event);

      expect(mockAuditIntegrityService.getLastChainHash).toHaveBeenCalled();
      expect(mockAuditIntegrityService.generateIntegrityHash).toHaveBeenCalledWith(
        event.entry,
        lastHash,
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        AuditEventType.AUDIT_LOG_CREATED,
        expect.objectContaining({
          type: AuditEventType.AUDIT_LOG_CREATED,
          data: expect.objectContaining({
            entry: expect.objectContaining({
              metadata: expect.objectContaining({
                integrity: integrityData,
                correlationId: expect.any(String),
              }),
            }),
          }),
          timestamp: expect.any(Date),
          correlationId: expect.any(String),
        }),
      );
    });

    it('should process critical operations synchronously', async () => {
      const event = {
        entry: {
          id: 'audit123',
          actorId: 'user123',
          action: 'DELETE' as any,
          module: 'permission',
          entityType: 'Permission',
          entityId: 'perm123',
          metadata: {},
        },
        priority: undefined,
        async: undefined,
      };

      mockAuditIntegrityService.getLastChainHash.mockResolvedValue(null);
      mockAuditIntegrityService.generateIntegrityHash.mockResolvedValue({
        id: 'audit123',
        hash: 'hash123',
        previousHash: null,
        signature: 'sig123',
        timestamp: new Date(),
      });

      await service.emitAuditLog(event);

      expect(mockAuditQueueService.addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'permission',
          entityType: 'Permission',
        }),
      );
    });

    it('should handle errors and emit emergency event', async () => {
      const event = {
        entry: {
          id: 'audit123',
          actorId: 'user123',
          action: 'UPDATE' as any,
          module: 'User',
          entityType: 'User',
          entityId: 'entity123',
        },
      };

      const error = new Error('Hash generation failed');
      mockAuditIntegrityService.getLastChainHash.mockRejectedValue(error);

      await service.emitAuditLog(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        AuditEventType.AUDIT_EMERGENCY,
        expect.objectContaining({
          error,
          event,
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should skip integrity hash when requested', async () => {
      const event = {
        entry: {
          id: 'audit123',
          actorId: 'user123',
          action: 'VIEW' as any,
          module: 'User',
          entityType: 'User',
          entityId: 'entity123',
        },
        priority: 'low' as const,
        skipIntegrity: true,
      };

      await service.emitAuditLog(event);

      expect(mockAuditIntegrityService.getLastChainHash).not.toHaveBeenCalled();
      expect(mockAuditIntegrityService.generateIntegrityHash).not.toHaveBeenCalled();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        AuditEventType.AUDIT_LOG_CREATED,
        expect.objectContaining({
          data: expect.objectContaining({
            entry: expect.objectContaining({
              metadata: expect.not.objectContaining({
                integrity: expect.anything(),
              }),
            }),
          }),
        }),
      );
    });
  });

  describe('handleAuditLogCreated', () => {
    it('should handle high priority audit logs immediately', async () => {
      const event = {
        type: AuditEventType.AUDIT_LOG_CREATED,
        data: {
          entry: {
            id: 'audit123',
            actorId: 'user123',
            action: 'DELETE',
            module: 'User',
            entityType: 'User',
            entityId: 'entity123',
          },
          priority: 'high',
        },
        timestamp: new Date(),
        correlationId: 'corr123',
      };

      await service.handleAuditLogCreated(event);

      expect(mockAuditQueueService.addToQueue).toHaveBeenCalledWith(
        event.data.entry,
      );
    });

    it('should batch normal priority logs', async () => {
      const event = {
        type: AuditEventType.AUDIT_LOG_CREATED,
        data: {
          entry: {
            id: 'audit123',
            actorId: 'user123',
            action: 'VIEW',
            module: 'User',
            entityType: 'User',
            entityId: 'entity123',
          },
          priority: 'normal',
        },
        timestamp: new Date(),
        correlationId: 'corr123',
      };

      // Mock addToBatch as it's private
      const addToBatchSpy = jest.spyOn(service as any, 'addToBatch');

      await service.handleAuditLogCreated(event);

      expect(addToBatchSpy).toHaveBeenCalledWith(event.data.entry);
      expect(mockAuditQueueService.addToQueue).not.toHaveBeenCalled();
    });

    it('should emit failure event on error', async () => {
      const event = {
        type: AuditEventType.AUDIT_LOG_CREATED,
        data: {
          entry: {
            id: 'audit123',
            actorId: 'user123',
            action: 'UPDATE',
            module: 'User',
            entityType: 'User',
            entityId: 'entity123',
          },
          priority: 'high',
        },
        timestamp: new Date(),
        correlationId: 'corr123',
      };

      const error = new Error('Queue failed');
      mockAuditQueueService.addToQueue.mockRejectedValue(error);

      await service.handleAuditLogCreated(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        AuditEventType.AUDIT_LOG_FAILED,
        expect.objectContaining({
          originalEvent: event,
          error,
          timestamp: expect.any(Date),
        }),
      );
    });
  });

  describe('handleBatchAuditLog', () => {
    it('should process batch audit logs with integrity', async () => {
      const entries = [
        {
          id: 'audit1',
          actorId: 'user1',
          action: 'CREATE',
          module: 'User',
          entityType: 'User',
          entityId: 'entity1',
        },
        {
          id: 'audit2',
          actorId: 'user2',
          action: 'UPDATE',
          module: 'User',
          entityType: 'User',
          entityId: 'entity2',
        },
      ];

      const event = {
        type: AuditEventType.AUDIT_LOG_BATCH,
        data: {
          entries,
          priority: 'normal',
        },
        timestamp: new Date(),
        correlationId: 'corr-batch',
      };

      mockAuditIntegrityService.getLastChainHash
        .mockResolvedValueOnce('hash0')
        .mockResolvedValueOnce('hash1');

      mockAuditIntegrityService.generateIntegrityHash
        .mockResolvedValueOnce({
          id: 'audit1',
          hash: 'hash1',
          previousHash: 'hash0',
          signature: 'sig1',
          timestamp: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'audit2',
          hash: 'hash2',
          previousHash: 'hash1',
          signature: 'sig2',
          timestamp: new Date(),
        });

      await service.handleBatchAuditLog(event);

      expect(mockAuditIntegrityService.getLastChainHash).toHaveBeenCalledTimes(1);
      expect(mockAuditIntegrityService.generateIntegrityHash).toHaveBeenCalledTimes(2);
      expect(mockAuditQueueService.addBatchToQueue).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'audit1',
            metadata: expect.objectContaining({
              integrity: expect.objectContaining({
                hash: 'hash1',
                previousHash: 'hash0',
              }),
            }),
          }),
          expect.objectContaining({
            id: 'audit2',
            metadata: expect.objectContaining({
              integrity: expect.objectContaining({
                hash: 'hash2',
                previousHash: 'hash1',
              }),
            }),
          }),
        ]),
      );
    });
  });

  describe('handleIntegrityCheck', () => {
    it('should perform integrity check and emit violation if invalid', async () => {
      const event = {
        type: AuditEventType.AUDIT_INTEGRITY_CHECK,
        data: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        timestamp: new Date(),
        correlationId: 'corr-check',
      };

      const checkResult = {
        isValid: false,
        totalChecked: 100,
        invalidEntries: ['log1', 'log2'],
        brokenChainAt: 'log3',
      };

      mockAuditIntegrityService.verifyChainIntegrity.mockResolvedValue(
        checkResult,
      );

      await service.handleIntegrityCheck(event);

      expect(mockAuditIntegrityService.verifyChainIntegrity).toHaveBeenCalledWith(
        event.data.startDate,
        event.data.endDate,
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        AuditEventType.AUDIT_INTEGRITY_VIOLATION,
        expect.objectContaining({
          result: checkResult,
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should not emit violation for valid integrity', async () => {
      const event = {
        type: AuditEventType.AUDIT_INTEGRITY_CHECK,
        data: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        timestamp: new Date(),
        correlationId: 'corr-check',
      };

      const checkResult = {
        isValid: true,
        totalChecked: 100,
        invalidEntries: [],
      };

      mockAuditIntegrityService.verifyChainIntegrity.mockResolvedValue(
        checkResult,
      );

      await service.handleIntegrityCheck(event);

      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        AuditEventType.AUDIT_INTEGRITY_VIOLATION,
        expect.anything(),
      );
    });
  });

  describe('getEventStatistics', () => {
    it('should return comprehensive event statistics', async () => {
      const queueStats = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      };

      mockAuditQueueService.getQueueStats.mockResolvedValue(queueStats);

      const result = await service.getEventStatistics();

      expect(result).toEqual({
        queue: queueStats,
        batch: {
          pending: 0,
          threshold: 10,
          timerActive: false,
        },
        config: {
          asyncEnabled: true,
          criticalModules: ['auth', 'user', 'permission', 'approval'],
        },
      });
    });
  });

  describe('emitIntegrityCheck', () => {
    it('should emit integrity check event', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await service.emitIntegrityCheck(startDate, endDate);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        AuditEventType.AUDIT_INTEGRITY_CHECK,
        expect.objectContaining({
          type: AuditEventType.AUDIT_INTEGRITY_CHECK,
          data: { startDate, endDate },
          timestamp: expect.any(Date),
          correlationId: expect.stringMatching(/^corr_/),
        }),
      );
    });
  });
});