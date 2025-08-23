import { Test, TestingModule } from '@nestjs/testing';
import { AuditIntegrityService } from '../services/audit-integrity.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'crypto';

describe('AuditIntegrityService', () => {
  let service: AuditIntegrityService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    auditLog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const testSecret = 'test-secret-key';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditIntegrityService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuditIntegrityService>(AuditIntegrityService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    mockConfigService.get.mockReturnValue(testSecret);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateIntegrityHash', () => {
    it('should generate integrity hash for audit entry', async () => {
      const entry = {
        id: 'audit123',
        actorId: 'user123',
        action: 'UPDATE' as any,
        module: 'User',
        entityType: 'User',
        entityId: 'entity123',
        oldValues: { name: 'Old' },
        newValues: { name: 'New' },
        createdAt: new Date('2024-01-01'),
      };

      const result = await service.generateIntegrityHash(entry);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'audit123',
          hash: expect.any(String),
          previousHash: null,
          signature: expect.any(String),
          timestamp: entry.createdAt,
        }),
      );
    });

    it('should generate chained hash with previous hash', async () => {
      const entry = {
        id: 'audit124',
        actorId: 'user123',
        action: 'CREATE' as any,
        module: 'User',
        entityType: 'User',
        entityId: 'entity124',
        newValues: { name: 'New User' },
        createdAt: new Date('2024-01-02'),
      };

      const previousHash = 'previous-hash-123';

      const result = await service.generateIntegrityHash(entry, previousHash);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'audit124',
          hash: expect.any(String),
          previousHash,
          signature: expect.any(String),
          timestamp: entry.createdAt,
        }),
      );

      // Verify the hash includes the previous hash
      const entryData = [
        entry.actorId,
        entry.action,
        entry.module,
        entry.entityType,
        entry.entityId,
        JSON.stringify({}),
        JSON.stringify(entry.newValues || {}),
        entry.createdAt.toISOString(),
      ].join('|');

      const expectedHashInput = `${previousHash}:${entryData}`;
      const expectedHash = createHash('sha256')
        .update(expectedHashInput)
        .digest('hex');

      expect(result.hash).toBe(expectedHash);
    });
  });

  describe('verifyIntegrity', () => {
    it('should verify valid audit log integrity', async () => {
      const auditLogId = 'audit123';
      const auditData = {
        actorId: 'user123',
        action: 'UPDATE',
        module: 'User',
        entityType: 'User',
        entityId: 'entity123',
        oldValues: { name: 'Old' },
        newValues: { name: 'New' },
        createdAt: new Date('2024-01-01'),
      };

      // Generate valid integrity data
      const entryData = [
        auditData.actorId,
        auditData.action,
        auditData.module,
        auditData.entityType,
        auditData.entityId,
        JSON.stringify(auditData.oldValues || {}),
        JSON.stringify(auditData.newValues || {}),
        auditData.createdAt.toISOString(),
      ].join('|');

      const hash = createHash('sha256').update(entryData).digest('hex');
      const signature = createHmac('sha256', testSecret)
        .update(hash)
        .digest('hex');

      const auditLog = {
        id: auditLogId,
        ...auditData,
        metadata: {
          integrity: {
            hash,
            previousHash: null,
            signature,
            timestamp: auditData.createdAt,
          },
        },
      };

      mockPrismaService.auditLog.findUnique.mockResolvedValue(auditLog);

      const result = await service.verifyIntegrity(auditLogId);

      expect(result).toEqual({
        isValid: true,
        expectedHash: hash,
        actualHash: hash,
        reason: 'Integrity verified',
      });
    });

    it('should detect tampering with invalid signature', async () => {
      const auditLogId = 'audit123';
      const auditLog = {
        id: auditLogId,
        actorId: 'user123',
        action: 'UPDATE',
        module: 'User',
        entityType: 'User',
        entityId: 'entity123',
        createdAt: new Date('2024-01-01'),
        metadata: {
          integrity: {
            hash: 'valid-hash',
            previousHash: null,
            signature: 'invalid-signature',
            timestamp: new Date('2024-01-01'),
          },
        },
      };

      mockPrismaService.auditLog.findUnique.mockResolvedValue(auditLog);

      const result = await service.verifyIntegrity(auditLogId);

      expect(result).toEqual({
        isValid: false,
        reason: 'Invalid signature detected - possible tampering',
      });
    });

    it('should detect missing integrity metadata', async () => {
      const auditLogId = 'audit123';
      const auditLog = {
        id: auditLogId,
        actorId: 'user123',
        action: 'UPDATE',
        metadata: {},
      };

      mockPrismaService.auditLog.findUnique.mockResolvedValue(auditLog);

      const result = await service.verifyIntegrity(auditLogId);

      expect(result).toEqual({
        isValid: false,
        reason: 'No integrity metadata found',
      });
    });
  });

  describe('verifyChainIntegrity', () => {
    it('should verify valid audit chain', async () => {
      const logs = [
        {
          id: 'log1',
          createdAt: new Date('2024-01-01'),
          metadata: {
            integrity: {
              hash: 'hash1',
              previousHash: null,
              signature: 'sig1',
            },
          },
        },
        {
          id: 'log2',
          createdAt: new Date('2024-01-02'),
          metadata: {
            integrity: {
              hash: 'hash2',
              previousHash: 'hash1',
              signature: 'sig2',
            },
          },
        },
        {
          id: 'log3',
          createdAt: new Date('2024-01-03'),
          metadata: {
            integrity: {
              hash: 'hash3',
              previousHash: 'hash2',
              signature: 'sig3',
            },
          },
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(logs);

      // Mock individual integrity checks
      const originalVerifyIntegrity = service.verifyIntegrity;
      service.verifyIntegrity = jest.fn().mockResolvedValue({
        isValid: true,
      });

      const result = await service.verifyChainIntegrity();

      expect(result).toEqual({
        isValid: true,
        totalChecked: 3,
        invalidEntries: [],
        brokenChainAt: undefined,
      });

      service.verifyIntegrity = originalVerifyIntegrity;
    });

    it('should detect broken chain', async () => {
      const logs = [
        {
          id: 'log1',
          createdAt: new Date('2024-01-01'),
          metadata: {
            integrity: {
              hash: 'hash1',
              previousHash: null,
              signature: 'sig1',
            },
          },
        },
        {
          id: 'log2',
          createdAt: new Date('2024-01-02'),
          metadata: {
            integrity: {
              hash: 'hash2',
              previousHash: 'wrong-hash', // Broken chain
              signature: 'sig2',
            },
          },
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(logs);

      const result = await service.verifyChainIntegrity();

      expect(result).toEqual({
        isValid: false,
        totalChecked: 2,
        invalidEntries: [],
        brokenChainAt: 'log2',
      });
    });

    it('should identify entries without integrity data', async () => {
      const logs = [
        {
          id: 'log1',
          createdAt: new Date('2024-01-01'),
          metadata: {
            integrity: {
              hash: 'hash1',
              previousHash: null,
              signature: 'sig1',
            },
          },
        },
        {
          id: 'log2',
          createdAt: new Date('2024-01-02'),
          metadata: {}, // Missing integrity
        },
        {
          id: 'log3',
          createdAt: new Date('2024-01-03'),
          metadata: {
            integrity: {
              hash: 'hash3',
              previousHash: 'hash1',
              signature: 'sig3',
            },
          },
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(logs);

      // Mock individual integrity checks
      const originalVerifyIntegrity = service.verifyIntegrity;
      service.verifyIntegrity = jest.fn().mockResolvedValue({
        isValid: true,
      });

      const result = await service.verifyChainIntegrity();

      expect(result.invalidEntries).toContain('log2');

      service.verifyIntegrity = originalVerifyIntegrity;
    });
  });

  describe('repairChainIntegrity', () => {
    it('should repair chain integrity for audit logs', async () => {
      const logs = [
        {
          id: 'log1',
          actorId: 'user1',
          action: 'CREATE',
          module: 'User',
          entityType: 'User',
          entityId: 'entity1',
          createdAt: new Date('2024-01-01'),
          metadata: {},
        },
        {
          id: 'log2',
          actorId: 'user2',
          action: 'UPDATE',
          module: 'User',
          entityType: 'User',
          entityId: 'entity2',
          createdAt: new Date('2024-01-02'),
          metadata: {},
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(logs);
      mockPrismaService.auditLog.update.mockResolvedValue({});

      const result = await service.repairChainIntegrity();

      expect(mockPrismaService.auditLog.update).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        repaired: 2,
        failed: 0,
        errors: [],
      });
    });

    it('should handle repair failures gracefully', async () => {
      const logs = [
        {
          id: 'log1',
          actorId: 'user1',
          action: 'CREATE',
          module: 'User',
          entityType: 'User',
          entityId: 'entity1',
          createdAt: new Date('2024-01-01'),
          metadata: {},
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(logs);
      mockPrismaService.auditLog.update.mockRejectedValue(
        new Error('Update failed'),
      );

      const result = await service.repairChainIntegrity();

      expect(result).toEqual({
        repaired: 0,
        failed: 1,
        errors: ['log1: Update failed'],
      });
    });
  });

  describe('getLastChainHash', () => {
    it('should return the last chain hash', async () => {
      const lastLog = {
        metadata: {
          integrity: {
            hash: 'last-hash-123',
            previousHash: 'prev-hash',
            signature: 'sig',
          },
        },
      };

      mockPrismaService.auditLog.findFirst.mockResolvedValue(lastLog);

      const result = await service.getLastChainHash();

      expect(result).toBe('last-hash-123');
      expect(mockPrismaService.auditLog.findFirst).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        select: { metadata: true },
      });
    });

    it('should return null when no logs exist', async () => {
      mockPrismaService.auditLog.findFirst.mockResolvedValue(null);

      const result = await service.getLastChainHash();

      expect(result).toBeNull();
    });

    it('should return null when no integrity metadata exists', async () => {
      const lastLog = {
        metadata: {},
      };

      mockPrismaService.auditLog.findFirst.mockResolvedValue(lastLog);

      const result = await service.getLastChainHash();

      expect(result).toBeNull();
    });
  });

  describe('exportIntegrityReport', () => {
    it('should export comprehensive integrity report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Mock verifyChainIntegrity
      const chainStatus = {
        isValid: true,
        totalChecked: 100,
        invalidEntries: [],
        brokenChainAt: undefined,
      };

      const originalVerifyChainIntegrity = service.verifyChainIntegrity;
      service.verifyChainIntegrity = jest.fn().mockResolvedValue(chainStatus);

      mockPrismaService.auditLog.aggregate.mockResolvedValue({
        _count: 100,
      });

      mockPrismaService.auditLog.count.mockResolvedValue(0);

      const result = await service.exportIntegrityReport(startDate, endDate);

      expect(result).toEqual({
        generatedAt: expect.any(Date),
        period: { start: startDate, end: endDate },
        chainStatus,
        statistics: {
          totalEntries: 100,
          verifiedEntries: 100,
          invalidEntries: 0,
          missingIntegrity: 0,
        },
        recommendations: [],
      });

      service.verifyChainIntegrity = originalVerifyChainIntegrity;
    });

    it('should provide recommendations for issues', async () => {
      const chainStatus = {
        isValid: false,
        totalChecked: 100,
        invalidEntries: ['log1', 'log2'],
        brokenChainAt: 'log3',
      };

      const originalVerifyChainIntegrity = service.verifyChainIntegrity;
      service.verifyChainIntegrity = jest.fn().mockResolvedValue(chainStatus);

      mockPrismaService.auditLog.aggregate.mockResolvedValue({
        _count: 100,
      });

      mockPrismaService.auditLog.count.mockResolvedValue(5);

      const result = await service.exportIntegrityReport();

      expect(result.recommendations).toContain(
        'Chain integrity is broken. Consider running repair operation.',
      );
      expect(result.recommendations).toContain(
        '5 entries missing integrity data. Run repair to add integrity.',
      );
      expect(result.recommendations).toContain(
        'Invalid entries detected. Investigate potential tampering.',
      );

      service.verifyChainIntegrity = originalVerifyChainIntegrity;
    });
  });
});