import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuditController } from '../controllers/audit.controller';
import { AuditService } from '../services/audit.service';
import { AuditAction } from '@prisma/client';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';

describe('AuditController (e2e)', () => {
  let app: INestApplication;
  let auditService: AuditService;

  const mockAuditService = {
    query: jest.fn(),
    getStatistics: jest.fn(),
    exportLogs: jest.fn(),
    verifyIntegrity: jest.fn(),
    verifyChainIntegrity: jest.fn(),
    getIntegrityReport: jest.fn(),
    repairChainIntegrity: jest.fn(),
    getEventStatistics: jest.fn(),
  };

  const mockUser = {
    userId: 'user_test123',
    metadata: {
      userProfileId: 'profile_test123',
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    auditService = moduleFixture.get<AuditService>(AuditService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /audit/logs', () => {
    it('should query audit logs with default pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: 'audit1',
            actorId: 'user1',
            action: AuditAction.CREATE,
            entityType: 'User',
            entityId: 'entity1',
            createdAt: new Date('2024-01-01'),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockAuditService.query.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .get('/audit/logs')
        .expect(200);

      expect(response.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'audit1',
            actorId: 'user1',
            action: AuditAction.CREATE,
            entityType: 'User',
            entityId: 'entity1',
          }),
        ]),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      expect(mockAuditService.query).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
        }),
      );
    });

    it('should query audit logs with filters', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      mockAuditService.query.mockResolvedValue(mockResponse);

      await request(app.getHttpServer())
        .get('/audit/logs')
        .query({
          page: 1,
          limit: 20,
          entityType: 'User',
          action: AuditAction.UPDATE,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          actorId: 'user123',
          module: 'User',
        })
        .expect(200);

      expect(mockAuditService.query).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          entityType: 'User',
          action: AuditAction.UPDATE,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          actorId: 'user123',
          module: 'User',
        }),
      );
    });

    it('should handle search parameter', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      mockAuditService.query.mockResolvedValue(mockResponse);

      await request(app.getHttpServer())
        .get('/audit/logs')
        .query({
          search: 'test search',
        })
        .expect(200);

      expect(mockAuditService.query).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'test search',
        }),
      );
    });

    it('should validate pagination limits', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      };

      mockAuditService.query.mockResolvedValue(mockResponse);

      await request(app.getHttpServer())
        .get('/audit/logs')
        .query({
          limit: 200, // Exceeds max limit
        })
        .expect(200);

      // Should cap at 100
      expect(mockAuditService.query).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
        }),
      );
    });
  });

  describe('GET /audit/statistics', () => {
    it('should get audit statistics', async () => {
      const mockStatistics = {
        total: 1000,
        byAction: {
          CREATE: 400,
          UPDATE: 300,
          DELETE: 100,
          VIEW: 200,
        },
        byModule: {
          User: 500,
          Permission: 300,
          Role: 200,
        },
        byDate: [
          { date: '2024-01-01', count: 50 },
          { date: '2024-01-02', count: 45 },
        ],
      };

      mockAuditService.getStatistics.mockResolvedValue(mockStatistics);

      const response = await request(app.getHttpServer())
        .get('/audit/statistics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          groupBy: 'module',
        })
        .expect(200);

      expect(response.body).toEqual(mockStatistics);

      expect(mockAuditService.getStatistics).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          groupBy: 'module',
        }),
      );
    });

    it('should handle statistics without date range', async () => {
      const mockStatistics = {
        total: 5000,
        byAction: {},
        byModule: {},
      };

      mockAuditService.getStatistics.mockResolvedValue(mockStatistics);

      await request(app.getHttpServer())
        .get('/audit/statistics')
        .expect(200);

      expect(mockAuditService.getStatistics).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: undefined,
          endDate: undefined,
        }),
      );
    });
  });

  describe('POST /audit/export', () => {
    it('should export audit logs in CSV format', async () => {
      const mockExportData = {
        data: 'id,action,entityType\naudit1,CREATE,User\naudit2,UPDATE,User',
        filename: 'audit-log-2024-01-01.csv',
        mimeType: 'text/csv',
      };

      mockAuditService.exportLogs.mockResolvedValue(mockExportData);

      const response = await request(app.getHttpServer())
        .post('/audit/export')
        .send({
          format: 'CSV',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          fields: ['id', 'action', 'entityType'],
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain(
        'attachment; filename=',
      );
      expect(response.text).toBe(mockExportData.data);
    });

    it('should export audit logs in JSON format', async () => {
      const mockExportData = {
        data: JSON.stringify([
          { id: 'audit1', action: 'CREATE', entityType: 'User' },
          { id: 'audit2', action: 'UPDATE', entityType: 'User' },
        ]),
        filename: 'audit-log-2024-01-01.json',
        mimeType: 'application/json',
      };

      mockAuditService.exportLogs.mockResolvedValue(mockExportData);

      const response = await request(app.getHttpServer())
        .post('/audit/export')
        .send({
          format: 'JSON',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toEqual([
        { id: 'audit1', action: 'CREATE', entityType: 'User' },
        { id: 'audit2', action: 'UPDATE', entityType: 'User' },
      ]);
    });

    it('should handle export with filters', async () => {
      const mockExportData = {
        data: '',
        filename: 'audit-log-2024-01-01.csv',
        mimeType: 'text/csv',
      };

      mockAuditService.exportLogs.mockResolvedValue(mockExportData);

      await request(app.getHttpServer())
        .post('/audit/export')
        .send({
          format: 'CSV',
          entityType: 'User',
          actions: ['CREATE', 'UPDATE'],
          module: 'User',
          actorId: 'user123',
        })
        .expect(200);

      expect(mockAuditService.exportLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'CSV',
          entityType: 'User',
          actions: ['CREATE', 'UPDATE'],
          module: 'User',
          actorId: 'user123',
        }),
      );
    });
  });

  describe('GET /audit/integrity/:id', () => {
    it('should verify integrity of specific audit log', async () => {
      const mockIntegrityResult = {
        isValid: true,
        expectedHash: 'hash123',
        actualHash: 'hash123',
        reason: 'Integrity verified',
      };

      mockAuditService.verifyIntegrity.mockResolvedValue(mockIntegrityResult);

      const response = await request(app.getHttpServer())
        .get('/audit/integrity/audit123')
        .expect(200);

      expect(response.body).toEqual(mockIntegrityResult);
      expect(mockAuditService.verifyIntegrity).toHaveBeenCalledWith('audit123');
    });

    it('should handle integrity verification failure', async () => {
      const mockIntegrityResult = {
        isValid: false,
        reason: 'Hash mismatch detected',
      };

      mockAuditService.verifyIntegrity.mockResolvedValue(mockIntegrityResult);

      const response = await request(app.getHttpServer())
        .get('/audit/integrity/audit456')
        .expect(200);

      expect(response.body).toEqual(mockIntegrityResult);
    });
  });

  describe('POST /audit/integrity/verify', () => {
    it('should verify chain integrity for date range', async () => {
      const mockChainResult = {
        isValid: true,
        totalChecked: 100,
        invalidEntries: [],
        brokenChainAt: null,
      };

      mockAuditService.verifyChainIntegrity.mockResolvedValue(mockChainResult);

      const response = await request(app.getHttpServer())
        .post('/audit/integrity/verify')
        .send({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .expect(200);

      expect(response.body).toEqual(mockChainResult);
      expect(mockAuditService.verifyChainIntegrity).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );
    });

    it('should verify entire chain without date range', async () => {
      const mockChainResult = {
        isValid: true,
        totalChecked: 1000,
        invalidEntries: [],
      };

      mockAuditService.verifyChainIntegrity.mockResolvedValue(mockChainResult);

      await request(app.getHttpServer())
        .post('/audit/integrity/verify')
        .send({})
        .expect(200);

      expect(mockAuditService.verifyChainIntegrity).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });
  });

  describe('GET /audit/integrity/report', () => {
    it('should get integrity report', async () => {
      const mockReport = {
        generatedAt: new Date(),
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
        chainStatus: {
          isValid: true,
          totalChecked: 100,
          invalidEntries: [],
        },
        statistics: {
          totalEntries: 100,
          verifiedEntries: 100,
          invalidEntries: 0,
          missingIntegrity: 0,
        },
        recommendations: [],
      };

      mockAuditService.getIntegrityReport.mockResolvedValue(mockReport);

      const response = await request(app.getHttpServer())
        .get('/audit/integrity/report')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .expect(200);

      expect(response.body).toEqual({
        ...mockReport,
        generatedAt: mockReport.generatedAt.toISOString(),
        period: {
          start: mockReport.period.start.toISOString(),
          end: mockReport.period.end.toISOString(),
        },
      });
    });
  });

  describe('POST /audit/integrity/repair', () => {
    it('should repair chain integrity', async () => {
      const mockRepairResult = {
        repaired: 50,
        failed: 2,
        errors: ['log123: Update failed', 'log456: Update failed'],
      };

      mockAuditService.repairChainIntegrity.mockResolvedValue(mockRepairResult);

      const response = await request(app.getHttpServer())
        .post('/audit/integrity/repair')
        .send({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .expect(200);

      expect(response.body).toEqual(mockRepairResult);
      expect(mockAuditService.repairChainIntegrity).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );
    });

    it('should handle repair without date range', async () => {
      const mockRepairResult = {
        repaired: 100,
        failed: 0,
        errors: [],
      };

      mockAuditService.repairChainIntegrity.mockResolvedValue(mockRepairResult);

      await request(app.getHttpServer())
        .post('/audit/integrity/repair')
        .send({})
        .expect(200);

      expect(mockAuditService.repairChainIntegrity).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });
  });

  describe('GET /audit/events/statistics', () => {
    it('should get event statistics', async () => {
      const mockEventStats = {
        queue: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
          delayed: 1,
        },
        batch: {
          pending: 10,
          threshold: 10,
          timerActive: true,
        },
        config: {
          asyncEnabled: true,
          criticalModules: ['auth', 'user', 'permission'],
        },
      };

      mockAuditService.getEventStatistics.mockResolvedValue(mockEventStats);

      const response = await request(app.getHttpServer())
        .get('/audit/events/statistics')
        .expect(200);

      expect(response.body).toEqual(mockEventStats);
      expect(mockAuditService.getEventStatistics).toHaveBeenCalled();
    });
  });
});