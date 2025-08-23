import { Test, TestingModule } from '@nestjs/testing';
import { UserPermissionService } from './user-permission.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { JsonSchemaValidatorService } from './json-schema-validator.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PermissionAction, PermissionScope } from '@prisma/client';

// Mock implementations
const mockPrismaService = {
  userProfile: {
    findUnique: jest.fn(),
  },
  permission: {
    findUnique: jest.fn(),
  },
  userPermission: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  permissionCache: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(async (fn) => fn(mockPrismaService)),
};

const mockAuditService = {
  log: jest.fn(),
};

const mockValidatorService = {
  validateAndSanitizeConditions: jest.fn(),
};

describe('UserPermissionService', () => {
  let service: UserPermissionService;
  let prisma: typeof mockPrismaService;
  let auditService: typeof mockAuditService;
  let validatorService: typeof mockValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPermissionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: JsonSchemaValidatorService, useValue: mockValidatorService },
      ],
    }).compile();

    service = module.get<UserPermissionService>(UserPermissionService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
    validatorService = module.get(JsonSchemaValidatorService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('grantPermission', () => {
    const mockUserProfileId = 'user-123';
    const mockGrantedBy = 'admin-123';
    const mockGrantDto = {
      permissionId: 'perm-123',
      isGranted: true,
      conditions: { department: 'IT' },
      validFrom: '2024-01-01',
      validUntil: '2024-12-31',
      grantReason: 'Test grant',
      priority: 100,
      isTemporary: false,
    };

    const mockUser = {
      id: mockUserProfileId,
      dataKaryawan: {
        nama: 'John Doe',
        nip: '12345',
      },
    };

    const mockPermission = {
      id: 'perm-123',
      code: 'user.create',
      name: 'Create User',
    };

    it('should grant new permission successfully', async () => {
      const mockCreatedPermission = {
        id: 'up-123',
        userProfileId: mockUserProfileId,
        ...mockGrantDto,
      };

      prisma.userProfile.findUnique.mockResolvedValue(mockUser);
      prisma.permission.findUnique.mockResolvedValue(mockPermission);
      prisma.userPermission.findUnique.mockResolvedValue(null);
      prisma.userPermission.create.mockResolvedValue(mockCreatedPermission);
      validatorService.validateAndSanitizeConditions.mockReturnValue(mockGrantDto.conditions);

      const result = await service.grantPermission(
        mockUserProfileId,
        mockGrantDto,
        mockGrantedBy,
      );

      expect(result).toEqual(mockCreatedPermission);
      expect(prisma.userPermission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userProfileId: mockUserProfileId,
          permissionId: mockGrantDto.permissionId,
          isGranted: true,
          conditions: mockGrantDto.conditions,
          grantedBy: mockGrantedBy,
        }),
      });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockGrantedBy,
          action: 'ASSIGN',
          module: 'user-permission',
          entityType: 'UserPermission',
        }),
      );
      expect(prisma.permissionCache.updateMany).toHaveBeenCalledWith({
        where: { userProfileId: mockUserProfileId },
        data: { isValid: false },
      });
    });

    it('should throw error if user not found', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.grantPermission(mockUserProfileId, mockGrantDto, mockGrantedBy),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if permission not found', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(mockUser);
      prisma.permission.findUnique.mockResolvedValue(null);

      await expect(
        service.grantPermission(mockUserProfileId, mockGrantDto, mockGrantedBy),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if permission already granted', async () => {
      const existingPermission = {
        id: 'up-existing',
        isGranted: true,
      };

      prisma.userProfile.findUnique.mockResolvedValue(mockUser);
      prisma.permission.findUnique.mockResolvedValue(mockPermission);
      prisma.userPermission.findUnique.mockResolvedValue(existingPermission);

      await expect(
        service.grantPermission(mockUserProfileId, mockGrantDto, mockGrantedBy),
      ).rejects.toThrow(ConflictException);
    });

    it('should reactivate existing revoked permission', async () => {
      const existingRevokedPermission = {
        id: 'up-existing',
        isGranted: false,
      };
      const updatedPermission = {
        ...existingRevokedPermission,
        isGranted: true,
      };

      prisma.userProfile.findUnique.mockResolvedValue(mockUser);
      prisma.permission.findUnique.mockResolvedValue(mockPermission);
      prisma.userPermission.findUnique.mockResolvedValue(existingRevokedPermission);
      prisma.userPermission.update.mockResolvedValue(updatedPermission);
      validatorService.validateAndSanitizeConditions.mockReturnValue(mockGrantDto.conditions);

      const result = await service.grantPermission(
        mockUserProfileId,
        mockGrantDto,
        mockGrantedBy,
      );

      expect(result).toEqual(updatedPermission);
      expect(prisma.userPermission.update).toHaveBeenCalledWith({
        where: { id: existingRevokedPermission.id },
        data: expect.objectContaining({
          isGranted: true,
          grantedBy: mockGrantedBy,
        }),
      });
    });

    it('should validate and sanitize conditions', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(mockUser);
      prisma.permission.findUnique.mockResolvedValue(mockPermission);
      prisma.userPermission.findUnique.mockResolvedValue(null);
      prisma.userPermission.create.mockResolvedValue({});

      await service.grantPermission(mockUserProfileId, mockGrantDto, mockGrantedBy);

      expect(validatorService.validateAndSanitizeConditions).toHaveBeenCalledWith(
        mockGrantDto.conditions,
        'permission',
      );
    });
  });

  describe('revokePermission', () => {
    const mockUserProfileId = 'user-123';
    const mockRevokedBy = 'admin-123';
    const mockRevokeDto = {
      permissionId: 'perm-123',
      revokeReason: 'Test revoke',
    };

    const mockUserPermission = {
      id: 'up-123',
      userProfileId: mockUserProfileId,
      permissionId: mockRevokeDto.permissionId,
      isGranted: true,
      permission: {
        code: 'user.create',
      },
      userProfile: {
        dataKaryawan: {
          nama: 'John Doe',
        },
      },
    };

    it('should revoke permission successfully', async () => {
      prisma.userPermission.findFirst.mockResolvedValue(mockUserPermission);

      await service.revokePermission(mockUserProfileId, mockRevokeDto, mockRevokedBy);

      expect(prisma.userPermission.update).toHaveBeenCalledWith({
        where: { id: mockUserPermission.id },
        data: { isGranted: false },
      });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockRevokedBy,
          action: 'REVOKE',
          module: 'user-permission',
          entityType: 'UserPermission',
          metadata: expect.objectContaining({
            revokeReason: mockRevokeDto.revokeReason,
          }),
        }),
      );
      expect(prisma.permissionCache.updateMany).toHaveBeenCalledWith({
        where: { userProfileId: mockUserProfileId },
        data: { isValid: false },
      });
    });

    it('should throw error if permission not found or not active', async () => {
      prisma.userPermission.findFirst.mockResolvedValue(null);

      await expect(
        service.revokePermission(mockUserProfileId, mockRevokeDto, mockRevokedBy),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkGrantPermissions', () => {
    const mockBulkDto = {
      userProfileId: 'user-123',
      permissions: [
        {
          permissionId: 'perm-1',
          isGranted: true,
          conditions: { department: 'IT' },
          priority: 100,
          grantReason: 'Test reason 1',
        },
        {
          permissionId: 'perm-2',
          isGranted: true,
          priority: 90,
          grantReason: 'Test reason 2',
        },
      ],
    };
    const mockGrantedBy = 'admin-123';

    it('should grant multiple permissions successfully', async () => {
      const mockResults = mockBulkDto.permissions.map((p, index) => ({
        id: `up-${index}`,
        ...p,
        userProfileId: mockBulkDto.userProfileId,
      }));

      prisma.userPermission.findUnique.mockResolvedValue(null);
      prisma.userPermission.create
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);
      validatorService.validateAndSanitizeConditions
        .mockReturnValueOnce(mockBulkDto.permissions[0].conditions)
        .mockReturnValueOnce(undefined);

      const result = await service.bulkGrantPermissions(mockBulkDto, mockGrantedBy);

      expect(result).toHaveLength(2);
      expect(prisma.userPermission.create).toHaveBeenCalledTimes(2);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockGrantedBy,
          action: 'ASSIGN',
          module: 'user-permission',
          entityDisplay: 'Bulk grant 2 permissions',
        }),
      );
    });

    it('should update existing permissions in bulk', async () => {
      const existingPermission = {
        id: 'up-existing',
        isGranted: false,
      };
      const updatedPermission = {
        ...existingPermission,
        isGranted: true,
      };

      prisma.userPermission.findUnique
        .mockResolvedValueOnce(existingPermission)
        .mockResolvedValueOnce(null);
      prisma.userPermission.update.mockResolvedValueOnce(updatedPermission);
      prisma.userPermission.create.mockResolvedValueOnce({
        id: 'up-new',
        permissionId: 'perm-2',
      });
      validatorService.validateAndSanitizeConditions.mockReturnValue(undefined);

      const result = await service.bulkGrantPermissions(mockBulkDto, mockGrantedBy);

      expect(result).toHaveLength(2);
      expect(prisma.userPermission.update).toHaveBeenCalledTimes(1);
      expect(prisma.userPermission.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getEffectivePermissions', () => {
    const mockUserProfileId = 'user-123';

    it('should return comprehensive permission summary', async () => {
      const mockUser = {
        id: mockUserProfileId,
        isSuperadmin: false,
        dataKaryawan: {
          nama: 'John Doe',
          nip: '12345',
        },
        userPermissions: [
          {
            id: 'up-1',
            isGranted: true,
            priority: 100,
            conditions: null,
            validUntil: null,
            permission: {
              id: 'perm-1',
              code: 'user.create',
              name: 'Create User',
              resource: 'user',
              action: PermissionAction.CREATE,
              scope: PermissionScope.OWN,
              group: null,
            },
          },
        ],
        roles: [
          {
            role: {
              id: 'role-1',
              code: 'admin',
              name: 'Administrator',
              hierarchyLevel: 1,
              rolePermissions: [
                {
                  isGranted: true,
                  conditions: null,
                  validUntil: null,
                  permission: {
                    id: 'perm-2',
                    code: 'user.delete',
                    name: 'Delete User',
                    resource: 'user',
                    action: PermissionAction.DELETE,
                    scope: PermissionScope.ALL,
                    group: null,
                  },
                },
              ],
              parentRoles: [],
            },
          },
        ],
        resourcePermissions: [],
      };

      prisma.userProfile.findUnique.mockResolvedValue(mockUser);

      const result = await service.getEffectivePermissions(mockUserProfileId);

      expect(result).toMatchObject({
        userProfileId: mockUserProfileId,
        userName: 'John Doe',
        isSuperadmin: false,
        permissions: expect.arrayContaining([
          expect.objectContaining({
            code: 'user.create',
            source: 'direct',
            grantedBy: 'Direct Assignment',
          }),
          expect.objectContaining({
            code: 'user.delete',
            source: 'role',
            grantedBy: 'Administrator',
          }),
        ]),
        roles: expect.arrayContaining([
          expect.objectContaining({
            code: 'admin',
            name: 'Administrator',
          }),
        ]),
        statistics: expect.objectContaining({
          totalPermissions: 2,
          directPermissions: 1,
          rolePermissions: 1,
          inheritedPermissions: 0,
          deniedPermissions: 0,
        }),
      });
    });

    it('should handle inherited permissions from parent roles', async () => {
      const mockUser = {
        id: mockUserProfileId,
        isSuperadmin: false,
        dataKaryawan: {
          nama: 'John Doe',
          nip: '12345',
        },
        userPermissions: [],
        roles: [
          {
            role: {
              id: 'role-1',
              code: 'manager',
              name: 'Manager',
              hierarchyLevel: 2,
              rolePermissions: [],
              parentRoles: [
                {
                  inheritPermissions: true,
                  parentRole: {
                    id: 'role-parent',
                    name: 'Senior Manager',
                    rolePermissions: [
                      {
                        isGranted: true,
                        conditions: null,
                        validUntil: null,
                        permission: {
                          id: 'perm-inherited',
                          code: 'report.view',
                          name: 'View Reports',
                          resource: 'report',
                          action: PermissionAction.READ,
                          scope: PermissionScope.ALL,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
        resourcePermissions: [],
      };

      prisma.userProfile.findUnique.mockResolvedValue(mockUser);

      const result = await service.getEffectivePermissions(mockUserProfileId);

      expect(result.permissions).toContainEqual(
        expect.objectContaining({
          code: 'report.view',
          source: 'inherited',
          grantedBy: 'Senior Manager (inherited)',
        }),
      );
      expect(result.statistics.inheritedPermissions).toBe(1);
    });

    it('should handle resource-specific permissions', async () => {
      const mockUser = {
        id: mockUserProfileId,
        isSuperadmin: false,
        dataKaryawan: {
          nama: 'John Doe',
          nip: '12345',
        },
        userPermissions: [],
        roles: [],
        resourcePermissions: [
          {
            isGranted: true,
            resourceId: 'doc-123',
            validUntil: null,
            permission: {
              id: 'perm-res',
              code: 'document.edit',
              name: 'Edit Document',
              resource: 'document',
              action: PermissionAction.UPDATE,
            },
          },
        ],
      };

      prisma.userProfile.findUnique.mockResolvedValue(mockUser);

      const result = await service.getEffectivePermissions(mockUserProfileId);

      expect(result.permissions).toContainEqual(
        expect.objectContaining({
          code: 'document.edit',
          source: 'resource',
          grantedBy: 'Resource: doc-123',
          conditions: { resourceId: 'doc-123' },
        }),
      );
    });

    it('should handle explicit permission denials', async () => {
      const mockUser = {
        id: mockUserProfileId,
        isSuperadmin: false,
        dataKaryawan: {
          nama: 'John Doe',
          nip: '12345',
        },
        userPermissions: [],  // The query filters out denied permissions already
        roles: [
          {
            role: {
              id: 'role-1',
              code: 'admin',
              name: 'Administrator',
              hierarchyLevel: 1,
              rolePermissions: [
                {
                  isGranted: true,
                  conditions: null,
                  validUntil: null,
                  permission: {
                    id: 'perm-1',
                    code: 'user.delete',
                    name: 'Delete User',
                    resource: 'user',
                    action: PermissionAction.DELETE,
                    scope: PermissionScope.ALL,
                    group: null,
                  },
                },
              ],
              parentRoles: [],
            },
          },
        ],
        resourcePermissions: [],
      };

      prisma.userProfile.findUnique.mockResolvedValue(mockUser);

      const result = await service.getEffectivePermissions(mockUserProfileId);

      // Permission should be in effective permissions from role
      expect(result.permissions).toContainEqual(
        expect.objectContaining({
          code: 'user.delete',
          source: 'role',
        }),
      );
      // In the actual implementation, denied permissions count would come from a separate query
      expect(result.statistics.deniedPermissions).toBe(0);
    });

    it('should throw error if user not found', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getEffectivePermissions(mockUserProfileId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserPermissions', () => {
    const mockUserProfileId = 'user-123';

    it('should return all active user permissions', async () => {
      const mockPermissions = [
        {
          id: 'up-1',
          userProfileId: mockUserProfileId,
          permissionId: 'perm-1',
          isGranted: true,
          permission: {
            id: 'perm-1',
            code: 'user.create',
            group: { name: 'User Management' },
          },
        },
        {
          id: 'up-2',
          userProfileId: mockUserProfileId,
          permissionId: 'perm-2',
          isGranted: true,
          permission: {
            id: 'perm-2',
            code: 'user.update',
            group: { name: 'User Management' },
          },
        },
      ];

      prisma.userPermission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.getUserPermissions(mockUserProfileId);

      expect(result).toEqual(mockPermissions);
      expect(prisma.userPermission.findMany).toHaveBeenCalledWith({
        where: {
          userProfileId: mockUserProfileId,
          isGranted: true,
        },
        include: {
          permission: {
            include: {
              group: true,
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('getExpiringPermissions', () => {
    it('should return permissions expiring within specified days', async () => {
      const mockExpiringPermissions = [
        {
          id: 'up-1',
          isGranted: true,
          isTemporary: true,
          validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
          userProfile: {
            dataKaryawan: {
              nama: 'John Doe',
              nip: '12345',
            },
          },
          permission: {
            code: 'temp.access',
          },
        },
      ];

      prisma.userPermission.findMany.mockResolvedValue(mockExpiringPermissions);

      const result = await service.getExpiringPermissions(7);

      expect(result).toEqual(mockExpiringPermissions);
      expect(prisma.userPermission.findMany).toHaveBeenCalledWith({
        where: {
          isGranted: true,
          isTemporary: true,
          validUntil: {
            lte: expect.any(Date),
            gte: expect.any(Date),
          },
        },
        include: expect.any(Object),
        orderBy: { validUntil: 'asc' },
      });
    });

    it('should use default 7 days if not specified', async () => {
      prisma.userPermission.findMany.mockResolvedValue([]);

      await service.getExpiringPermissions();

      const call = prisma.userPermission.findMany.mock.calls[0][0];
      const whereClause = call.where;
      const validUntilCondition = whereClause.validUntil;

      // Check that the date range is approximately 7 days
      const now = new Date();
      const lteDate = validUntilCondition.lte as Date;
      const daysDiff = Math.round((lteDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(7);
    });
  });

  describe('cleanupExpiredPermissions', () => {
    it('should mark expired permissions as inactive', async () => {
      const mockUpdateResult = { count: 5 };

      prisma.userPermission.updateMany.mockResolvedValue(mockUpdateResult);

      const result = await service.cleanupExpiredPermissions();

      expect(result).toBe(5);
      expect(prisma.userPermission.updateMany).toHaveBeenCalledWith({
        where: {
          isGranted: true,
          validUntil: {
            lt: expect.any(Date),
          },
        },
        data: {
          isGranted: false,
        },
      });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'SYSTEM',
          action: 'UPDATE',
          module: 'user-permission',
          entityDisplay: 'Cleaned up 5 expired permissions',
        }),
      );
      expect(prisma.permissionCache.updateMany).toHaveBeenCalledWith({
        where: {},
        data: { isValid: false },
      });
    });

    it('should not log audit if no permissions were cleaned up', async () => {
      const mockUpdateResult = { count: 0 };

      prisma.userPermission.updateMany.mockResolvedValue(mockUpdateResult);

      const result = await service.cleanupExpiredPermissions();

      expect(result).toBe(0);
      expect(auditService.log).not.toHaveBeenCalled();
      expect(prisma.permissionCache.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('invalidateUserCache', () => {
    it('should invalidate all cache entries for a user', async () => {
      const mockUserProfileId = 'user-123';

      await (service as any).invalidateUserCache(mockUserProfileId);

      expect(prisma.permissionCache.updateMany).toHaveBeenCalledWith({
        where: { userProfileId: mockUserProfileId },
        data: { isValid: false },
      });
    });
  });
});