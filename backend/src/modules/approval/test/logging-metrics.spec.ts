import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalLoggerService } from '../logging/approval-logger.service';
import { ApprovalMetricsService } from '../metrics/approval-metrics.service';
import { ApprovalAuditService } from '../services/approval-audit.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('Approval Logging and Metrics', () => {
  let loggerService: ApprovalLoggerService;
  let metricsService: ApprovalMetricsService;
  let auditService: ApprovalAuditService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalLoggerService,
        ApprovalMetricsService,
        ApprovalAuditService,
        {
          provide: PrismaService,
          useValue: {
            auditLog: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    loggerService = module.get<ApprovalLoggerService>(ApprovalLoggerService);
    metricsService = module.get<ApprovalMetricsService>(ApprovalMetricsService);
    auditService = module.get<ApprovalAuditService>(ApprovalAuditService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('ApprovalLoggerService', () => {
    it('should create a logging context', () => {
      const requestId = 'test-request-123';
      const context = loggerService.createContext(requestId);

      expect(context).toBeDefined();
      expect(context.requestId).toBe(requestId);
      expect(context.correlationId).toBeDefined();
      expect(context.startTime).toBeDefined();
    });

    it('should log actions with context', () => {
      const context = loggerService.createContext('test-request');
      const logSpy = jest.spyOn(loggerService['logger'], 'log');

      loggerService.logAction('TEST_ACTION', context, {
        customField: 'value',
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('TEST_ACTION'),
      );
    });

    it('should log state transitions', () => {
      const logSpy = jest.spyOn(loggerService['logger'], 'log');

      loggerService.logStateTransition(
        'request-123',
        'PENDING',
        'APPROVED',
        'user-456',
        { reason: 'All requirements met' },
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('STATE_TRANSITION'),
      );
    });

    it('should sanitize sensitive data from queries', () => {
      const context = loggerService.createContext('test-request');
      const debugSpy = jest.spyOn(loggerService['logger'], 'debug');

      loggerService.logQuery(
        "SELECT * FROM users WHERE password='secret123'",
        100,
        context,
      );

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining("password='***'"),
      );
    });
  });

  describe('ApprovalMetricsService', () => {
    it('should track timer metrics', () => {
      const context = loggerService.createContext('test-request');
      
      const timerId = metricsService.startTimer('test-operation', context);
      expect(timerId).toBeDefined();

      // Simulate some work
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      setTimeout(() => {
        const result = metricsService.endTimer(timerId, true);
        expect(result).toBeDefined();
        expect(result?.operation).toBe('test-operation');
        expect(result?.success).toBe(true);
        expect(result?.duration).toBeGreaterThan(0);
      }, 10);
    });

    it('should increment counters', () => {
      metricsService.incrementCounter('totalRequests', 1);
      metricsService.incrementCounter('approvedRequests', 1);
      
      const metrics = metricsService.getMetrics();
      expect(metrics.counters.totalRequests).toBe(1);
      expect(metrics.counters.approvedRequests).toBe(1);
    });

    it('should track approval actions', () => {
      metricsService.trackApprovalAction('approved', 150);
      metricsService.trackApprovalAction('rejected', 200);
      
      const metrics = metricsService.getMetrics();
      expect(metrics.counters.approvedRequests).toBe(1);
      expect(metrics.counters.rejectedRequests).toBe(1);
    });

    it('should calculate percentiles', () => {
      // Record multiple response times
      for (let i = 1; i <= 100; i++) {
        metricsService.recordResponseTime('workflow', i * 10);
      }

      const metrics = metricsService.getMetrics();
      expect(metrics.responseTimes.workflow).toBeDefined();
      expect(metrics.responseTimes.workflow.p50).toBeDefined();
      expect(metrics.responseTimes.workflow.p95).toBeDefined();
    });

    it('should provide health status', () => {
      // Simulate some errors
      metricsService.incrementCounter('totalRequests', 100);
      metricsService.incrementCounter('failedRequests', 5);
      
      const health = metricsService.getHealthStatus();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.details.errorRate).toBeDefined();
    });

    it('should reset metrics', () => {
      metricsService.incrementCounter('totalRequests', 10);
      metricsService.resetMetrics();
      
      const metrics = metricsService.getMetrics();
      expect(metrics.counters.totalRequests).toBe(0);
    });
  });

  describe('ApprovalAuditService', () => {
    it('should create audit entries', async () => {
      const context = loggerService.createContext('test-request');
      const createSpy = jest.spyOn(prismaService.auditLog, 'create');

      await auditService.createAuditEntry(
        {
          requestId: 'request-123',
          action: 'TEST_ACTION',
          actor: 'user-456',
          timestamp: new Date(),
          details: { test: 'value' },
        },
        context,
      );

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'APPROVAL_REQUEST',
          entityId: 'request-123',
          action: 'TEST_ACTION',
          actorId: 'user-456',
        }),
      });
    });

    it('should audit state transitions', async () => {
      const createSpy = jest.spyOn(prismaService.auditLog, 'create');

      await auditService.auditStateTransition(
        'request-123',
        'PENDING',
        'APPROVED',
        'user-456',
        'Meets all criteria',
      );

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'STATE_TRANSITION_PENDING_TO_APPROVED',
        }),
      });
    });

    it('should audit approval actions', async () => {
      const createSpy = jest.spyOn(prismaService.auditLog, 'create');

      await auditService.auditApprovalAction(
        'request-123',
        'step-456',
        'APPROVED',
        'user-789',
        'Looks good',
      );

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'APPROVAL_APPROVED',
        }),
      });
    });

    it('should handle audit failures gracefully', async () => {
      const context = loggerService.createContext('test-request');
      jest.spyOn(prismaService.auditLog, 'create').mockRejectedValue(
        new Error('Database error'),
      );
      const warnSpy = jest.spyOn(loggerService['logger'], 'warn');

      // Should not throw
      await expect(
        auditService.createAuditEntry(
          {
            requestId: 'request-123',
            action: 'TEST_ACTION',
            actor: 'user-456',
            timestamp: new Date(),
            details: {},
          },
          context,
        ),
      ).resolves.not.toThrow();

      expect(warnSpy).toHaveBeenCalled();
    });

    it('should retrieve audit trail', async () => {
      const mockEntries = [
        { id: '1', action: 'CREATED' },
        { id: '2', action: 'APPROVED' },
      ];
      jest.spyOn(prismaService.auditLog, 'findMany').mockResolvedValue(
        mockEntries as any,
      );

      const trail = await auditService.getAuditTrail('request-123');
      
      expect(trail).toHaveLength(2);
      expect(trail[0].action).toBe('CREATED');
    });

    it('should search audit logs with pagination', async () => {
      jest.spyOn(prismaService.auditLog, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.auditLog, 'count').mockResolvedValue(0);

      const result = await auditService.searchAuditLogs(
        { actor: 'user-123' },
        { page: 1, limit: 10 },
      );

      expect(result).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('Integration', () => {
    it('should work together for complete logging flow', async () => {
      // Create context
      const context = loggerService.createContext('integration-test');
      
      // Start timing
      const timerId = metricsService.startTimer('integration-operation', context);
      
      // Log action
      loggerService.logAction('INTEGRATION_START', context);
      
      // Create audit entry
      await auditService.createAuditEntry(
        {
          requestId: 'integration-test',
          action: 'INTEGRATION_ACTION',
          actor: 'test-user',
          timestamp: new Date(),
          details: { test: true },
        },
        context,
      );
      
      // Track metrics
      metricsService.trackApprovalAction('approved', 100);
      
      // End timing
      const result = metricsService.endTimer(timerId, true);
      
      // Get metrics
      const metrics = metricsService.getMetrics();
      
      // Verify everything worked
      expect(result).toBeDefined();
      expect(metrics.counters.approvedRequests).toBe(1);
    });
  });
});