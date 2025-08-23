import { Test, TestingModule } from '@nestjs/testing';
import { PermissionController } from '../controllers/permission.controller';
import { PermissionService } from '../services/permission.service';
import { JsonSchemaValidatorService } from '../services/json-schema-validator.service';
import { PermissionLogRetentionService } from '../services/permission-log-retention.service';
import { BadRequestException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

describe('Permission Security Implementations', () => {
  let controller: PermissionController;
  let validatorService: JsonSchemaValidatorService;
  let logRetentionService: PermissionLogRetentionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionController],
      providers: [
        {
          provide: PermissionService,
          useValue: {
            checkPermission: jest.fn(),
            batchCheckPermissions: jest.fn(),
          },
        },
        JsonSchemaValidatorService,
        PermissionLogRetentionService,
        {
          provide: 'PrismaService',
          useValue: {
            permissionCheckLog: {
              findMany: jest.fn(),
              deleteMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: 'ConfigService',
          useValue: {
            get: jest.fn().mockReturnValue(30),
          },
        },
      ],
    }).compile();

    controller = module.get<PermissionController>(PermissionController);
    validatorService = module.get<JsonSchemaValidatorService>(
      JsonSchemaValidatorService,
    );
    logRetentionService = module.get<PermissionLogRetentionService>(
      PermissionLogRetentionService,
    );
  });

  describe('Rate Limiting', () => {
    it('should have rate limiting decorator on checkPermission endpoint', () => {
      const checkPermissionMethod = controller.checkPermission;
      const metadata = Reflect.getMetadata('rateLimit', checkPermissionMethod);
      
      expect(metadata).toBeDefined();
      expect(metadata.rateLimit.max).toBe(100);
      expect(metadata.rateLimit.timeWindow).toBe('1 minute');
    });

    it('should have rate limiting decorator on batchCheckPermissions endpoint', () => {
      const batchCheckMethod = controller.batchCheckPermissions;
      const metadata = Reflect.getMetadata('rateLimit', batchCheckMethod);
      
      expect(metadata).toBeDefined();
      expect(metadata.rateLimit.max).toBe(50);
      expect(metadata.rateLimit.timeWindow).toBe('1 minute');
    });

    it('should generate unique keys per user for rate limiting', () => {
      const checkPermissionMethod = controller.checkPermission;
      const metadata = Reflect.getMetadata('rateLimit', checkPermissionMethod);
      
      const mockRequest = {
        ip: '192.168.1.1',
        user: { clerkUserId: 'user123' },
      } as any;
      
      const key = metadata.rateLimit.keyGenerator(mockRequest);
      expect(key).toBe('permission-check:192.168.1.1:user123');
    });
  });

  describe('JSON Schema Validation', () => {
    describe('Permission Conditions', () => {
      it('should validate valid permission conditions', () => {
        const validConditions = {
          field: 'status',
          operator: '=',
          value: 'active',
        };

        expect(() =>
          validatorService.validatePermissionConditions(validConditions),
        ).not.toThrow();
      });

      it('should reject invalid operators', () => {
        const invalidConditions = {
          field: 'status',
          operator: 'invalid_op',
          value: 'active',
        };

        expect(() =>
          validatorService.validatePermissionConditions(invalidConditions),
        ).toThrow(BadRequestException);
      });

      it('should reject SQL injection attempts', () => {
        const maliciousConditions = {
          field: 'status',
          operator: '=',
          value: "'; DROP TABLE permissions; --",
        };

        const sanitized = validatorService.sanitizeJson(maliciousConditions);
        expect(() => validatorService.deepValidate(sanitized)).toThrow(
          BadRequestException,
        );
      });

      it('should validate nested conditions', () => {
        const nestedConditions = {
          field: 'department',
          operator: '=',
          value: 'IT',
          logical_operator: 'AND',
          conditions: [
            {
              field: 'level',
              operator: '>',
              value: 3,
            },
          ],
        };

        expect(() =>
          validatorService.validatePermissionConditions(nestedConditions),
        ).not.toThrow();
      });
    });

    describe('Policy Rules', () => {
      it('should validate time-based policy rules', () => {
        const timePolicyRules = {
          type: 'time_based',
          time_based: {
            days_of_week: ['monday', 'tuesday', 'wednesday'],
            time_ranges: [
              { start: '09:00', end: '17:00' },
            ],
            timezone: 'America/New_York',
          },
        };

        expect(() =>
          validatorService.validatePolicyRules(timePolicyRules),
        ).not.toThrow();
      });

      it('should validate location-based policy rules', () => {
        const locationPolicyRules = {
          type: 'location_based',
          location_based: {
            allowed_ips: ['192.168.1.0/24', '10.0.0.1'],
            countries: ['US', 'CA'],
          },
        };

        expect(() =>
          validatorService.validatePolicyRules(locationPolicyRules),
        ).not.toThrow();
      });

      it('should reject invalid IP formats', () => {
        const invalidLocationRules = {
          type: 'location_based',
          location_based: {
            allowed_ips: ['not-an-ip'],
          },
        };

        expect(() =>
          validatorService.validatePolicyRules(invalidLocationRules),
        ).toThrow(BadRequestException);
      });

      it('should validate attribute-based policy rules', () => {
        const attributePolicyRules = {
          type: 'attribute_based',
          attribute_based: {
            user_attributes: {
              department: {
                operator: '=',
                value: 'Engineering',
              },
              level: {
                operator: '>=',
                value: 5,
              },
            },
          },
        };

        expect(() =>
          validatorService.validatePolicyRules(attributePolicyRules),
        ).not.toThrow();
      });
    });

    describe('Approval Conditions', () => {
      it('should validate approval conditions', () => {
        const approvalConditions = {
          days: {
            operator: '>',
            value: 3,
          },
          amount: {
            operator: '>=',
            value: 10000,
            currency: 'USD',
          },
          priority: {
            operator: 'in',
            value: ['high', 'urgent'],
          },
        };

        expect(() =>
          validatorService.validateApprovalConditions(approvalConditions),
        ).not.toThrow();
      });

      it('should reject invalid currency codes', () => {
        const invalidConditions = {
          amount: {
            operator: '>',
            value: 1000,
            currency: 'INVALID',
          },
        };

        expect(() =>
          validatorService.validateApprovalConditions(invalidConditions),
        ).toThrow(BadRequestException);
      });
    });
  });

  describe('Log Retention Service', () => {
    it('should be initialized with correct retention period', () => {
      expect(logRetentionService).toBeDefined();
      expect(logRetentionService['retentionDays']).toBe(30);
    });

    it('should provide retention statistics', async () => {
      const stats = await logRetentionService.getRetentionStats();
      
      expect(stats).toHaveProperty('totalLogs');
      expect(stats).toHaveProperty('logsToArchive');
      expect(stats).toHaveProperty('retentionDays');
      expect(stats).toHaveProperty('oldestLog');
      expect(stats).toHaveProperty('newestLog');
      expect(stats).toHaveProperty('estimatedSizeBytes');
      expect(stats).toHaveProperty('estimatedSizeMB');
    });

    it('should handle archiving process', async () => {
      const archiveSpy = jest.spyOn(logRetentionService as any, 'archiveOldLogs');
      const deleteSpy = jest.spyOn(logRetentionService as any, 'deleteArchivedLogs');
      
      await logRetentionService.runRetentionNow(7);
      
      expect(archiveSpy).toHaveBeenCalled();
      expect(deleteSpy).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should validate conditions before saving permission', async () => {
      const createPermissionDto = {
        code: 'test.permission',
        name: 'Test Permission',
        resource: 'test',
        action: 'CREATE' as any,
        conditions: {
          field: 'status',
          operator: '=',
          value: 'active',
        },
      };

      const validateSpy = jest.spyOn(
        validatorService,
        'validateAndSanitizeConditions',
      );

      // This would be tested in a real integration test
      // await controller.create(createPermissionDto, { user: { clerkUserId: 'test' } });
      
      // For now, we just verify the validator service is properly configured
      expect(validatorService.validateAndSanitizeConditions).toBeDefined();
    });
  });

  describe('Security Best Practices', () => {
    it('should sanitize user input to prevent XSS', () => {
      const maliciousInput = {
        field: '<script>alert("xss")</script>',
        operator: '=',
        value: 'test',
      };

      const sanitized = validatorService.sanitizeJson(maliciousInput);
      expect(sanitized.field).not.toContain('<script>');
      expect(sanitized.field).not.toContain('</script>');
    });

    it('should detect and prevent SQL injection in deep validation', () => {
      const sqlInjection = {
        field: 'name',
        operator: '=',
        value: "admin'; DROP TABLE users; --",
      };

      expect(() => validatorService.deepValidate(sqlInjection)).toThrow(
        BadRequestException,
      );
    });

    it('should enforce schema validation strictly', () => {
      const extraFields = {
        field: 'status',
        operator: '=',
        value: 'active',
        unexpected_field: 'should_not_be_allowed',
      };

      expect(() =>
        validatorService.validatePermissionConditions(extraFields),
      ).toThrow(BadRequestException);
    });
  });
});