import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaginationQueryDto,
  PaginationResponseDto,
} from '../common/dto/pagination.dto';
import {
  CreateUserDto,
  UpdateUserDto,
  AssignRoleDto,
  AssignPositionDto,
} from './dto/user.dto';
import { v7 as uuidv7 } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all users with pagination and filtering
   */
  async findAll(
    query: PaginationQueryDto,
    currentUser: any,
  ): Promise<PaginationResponseDto<any>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserProfileWhereInput = {
      isActive: true,
    };

    // Add search conditions
    if (search) {
      where.OR = [
        { nip: { contains: search, mode: 'insensitive' } },
        { dataKaryawan: { nama: { contains: search, mode: 'insensitive' } } },
        { dataKaryawan: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Apply permission-based filtering
    if (!currentUser.isSuperadmin) {
      // Non-superadmin can only see users in their department/school
      where.dataKaryawan = {
        ...where.dataKaryawan,
        lokasi: currentUser.employee?.location,
      };
    }

    // Execute queries
    const [data, total] = await Promise.all([
      this.prisma.userProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          dataKaryawan: true,
          roles: {
            include: {
              role: true,
            },
          },
          positions: {
            where: { isActive: true },
            include: {
              position: {
                include: {
                  department: true,
                  school: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.userProfile.count({ where }),
    ]);

    // Format response
    const formattedData = data.map((user) => this.formatUserResponse(user));

    return new PaginationResponseDto(formattedData, total, page, limit);
  }

  /**
   * Find single user by ID
   */
  async findOne(id: string, currentUser: any) {
    const user = await this.prisma.userProfile.findUnique({
      where: { id },
      include: {
        dataKaryawan: true,
        roles: {
          include: {
            role: true,
          },
        },
        positions: {
          where: { isActive: true },
          include: {
            position: {
              include: {
                department: true,
                school: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check permissions
    if (!this.canViewUser(user, currentUser)) {
      throw new ForbiddenException(
        'You do not have permission to view this user',
      );
    }

    return this.formatUserResponse(user);
  }

  /**
   * Create new user
   */
  async create(createUserDto: CreateUserDto, currentUser: any) {
    // Check permissions
    if (
      !currentUser.isSuperadmin &&
      !this.hasPermission(currentUser, 'USER_MANAGEMENT', 'CREATE')
    ) {
      throw new ForbiddenException(
        'You do not have permission to create users',
      );
    }

    // Check if NIP exists in data_karyawan
    const dataKaryawan = await this.prisma.dataKaryawan.findUnique({
      where: { nip: createUserDto.nip },
    });

    if (!dataKaryawan) {
      throw new BadRequestException(
        'Employee data not found for NIP: ' + createUserDto.nip,
      );
    }

    // Check if user profile already exists
    const existingProfile = await this.prisma.userProfile.findUnique({
      where: { nip: createUserDto.nip },
    });

    if (existingProfile) {
      throw new BadRequestException('User profile already exists for this NIP');
    }

    // Create user profile
    const userProfile = await this.prisma.userProfile.create({
      data: {
        id: uuidv7(),
        clerkUserId: createUserDto.clerkUserId,
        nip: createUserDto.nip,
        isActive: true,
        createdBy: currentUser.clerkUserId,
      },
      include: {
        dataKaryawan: true,
      },
    });

    return this.formatUserResponse(userProfile);
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto, currentUser: any) {
    // Check if user exists
    const user = await this.findOne(id, currentUser);

    // Check permissions
    if (
      !currentUser.isSuperadmin &&
      !this.hasPermission(currentUser, 'USER_MANAGEMENT', 'UPDATE')
    ) {
      throw new ForbiddenException(
        'You do not have permission to update users',
      );
    }

    // Update user profile
    const updatedUser = await this.prisma.userProfile.update({
      where: { id },
      data: {
        isActive: updateUserDto.isActive,
        preferences: updateUserDto.preferences,
      },
      include: {
        dataKaryawan: true,
        roles: {
          include: {
            role: true,
          },
        },
        positions: {
          where: { isActive: true },
          include: {
            position: {
              include: {
                department: true,
                school: true,
              },
            },
          },
        },
      },
    });

    return this.formatUserResponse(updatedUser);
  }

  /**
   * Delete user (soft delete)
   */
  async remove(id: string, currentUser: any) {
    // Check if user exists
    await this.findOne(id, currentUser);

    // Check permissions
    if (
      !currentUser.isSuperadmin &&
      !this.hasPermission(currentUser, 'USER_MANAGEMENT', 'DELETE')
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete users',
      );
    }

    // Soft delete
    await this.prisma.userProfile.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get user positions
   */
  async getUserPositions(userId: string, currentUser: any) {
    // Check if user exists
    await this.findOne(userId, currentUser);

    return this.prisma.userPosition.findMany({
      where: {
        userProfileId: userId,
        isActive: true,
      },
      include: {
        position: {
          include: {
            department: true,
            school: true,
          },
        },
      },
    });
  }

  /**
   * Assign position to user
   */
  async assignPosition(
    userId: string,
    dto: AssignPositionDto,
    currentUser: any,
  ) {
    // Check if user exists
    await this.findOne(userId, currentUser);

    // Check permissions
    if (
      !currentUser.isSuperadmin &&
      !this.hasPermission(currentUser, 'USER_MANAGEMENT', 'ASSIGN')
    ) {
      throw new ForbiddenException(
        'You do not have permission to assign positions',
      );
    }

    // Check if position exists
    const position = await this.prisma.position.findUnique({
      where: { id: dto.positionId },
    });

    if (!position) {
      throw new NotFoundException('Position not found');
    }

    // Create user position
    return this.prisma.userPosition.create({
      data: {
        id: uuidv7(),
        userProfileId: userId,
        positionId: dto.positionId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isPlt: dto.isPlt || false,
        appointedBy: currentUser.clerkUserId,
        skNumber: dto.skNumber,
        notes: dto.notes,
      },
      include: {
        position: {
          include: {
            department: true,
            school: true,
          },
        },
      },
    });
  }

  /**
   * Remove position from user
   */
  async removePosition(userId: string, positionId: string, currentUser: any) {
    // Check if user exists
    await this.findOne(userId, currentUser);

    // Check permissions
    if (
      !currentUser.isSuperadmin &&
      !this.hasPermission(currentUser, 'USER_MANAGEMENT', 'ASSIGN')
    ) {
      throw new ForbiddenException(
        'You do not have permission to remove positions',
      );
    }

    // Deactivate position
    await this.prisma.userPosition.updateMany({
      where: {
        userProfileId: userId,
        positionId,
        isActive: true,
      },
      data: {
        isActive: false,
        endDate: new Date(),
      },
    });
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string, currentUser: any) {
    // Check if user exists
    await this.findOne(userId, currentUser);

    return this.prisma.userRole.findMany({
      where: {
        userProfileId: userId,
        isActive: true,
      },
      include: {
        role: true,
      },
    });
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, dto: AssignRoleDto, currentUser: any) {
    // Check if user exists
    await this.findOne(userId, currentUser);

    // Check permissions
    if (
      !currentUser.isSuperadmin &&
      !this.hasPermission(currentUser, 'USER_MANAGEMENT', 'ASSIGN')
    ) {
      throw new ForbiddenException(
        'You do not have permission to assign roles',
      );
    }

    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Create user role
    return this.prisma.userRole.create({
      data: {
        id: uuidv7(),
        userProfileId: userId,
        roleId: dto.roleId,
        assignedBy: currentUser.clerkUserId,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
      include: {
        role: true,
      },
    });
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string, currentUser: any) {
    // Check if user exists
    await this.findOne(userId, currentUser);

    // Check permissions
    if (
      !currentUser.isSuperadmin &&
      !this.hasPermission(currentUser, 'USER_MANAGEMENT', 'ASSIGN')
    ) {
      throw new ForbiddenException(
        'You do not have permission to remove roles',
      );
    }

    // Deactivate role
    await this.prisma.userRole.updateMany({
      where: {
        userProfileId: userId,
        roleId,
        isActive: true,
      },
      data: {
        isActive: false,
        validUntil: new Date(),
      },
    });
  }

  /**
   * Get user permissions for a module
   */
  async getUserPermissions(
    userId: string,
    moduleCode: string,
    currentUser: any,
  ) {
    // Check if user exists
    const user = await this.findOne(userId, currentUser);

    // Get module
    const module = await this.prisma.module.findUnique({
      where: { code: moduleCode },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    // Get permissions from roles
    const rolePermissions = await this.prisma.roleModuleAccess.findMany({
      where: {
        roleId: {
          in: user.roles.map((r: any) => r.roleId),
        },
        moduleId: module.id,
        isActive: true,
      },
    });

    // Get direct user permissions
    const userPermissions = await this.prisma.userModuleAccess.findMany({
      where: {
        userProfileId: userId,
        moduleId: module.id,
        isActive: true,
      },
    });

    // Combine permissions
    const permissions = new Set<string>();

    rolePermissions.forEach((rp) => {
      const perms = rp.permissions as string[];
      perms.forEach((p) => permissions.add(p));
    });

    userPermissions.forEach((up) => {
      const perms = up.permissions as string[];
      perms.forEach((p) => permissions.add(p));
    });

    return {
      moduleCode,
      permissions: Array.from(permissions),
      scope: this.determineScope(user),
    };
  }

  /**
   * Helper: Format user response
   */
  private formatUserResponse(user: any) {
    return {
      id: user.id,
      clerkUserId: user.clerkUserId,
      nip: user.nip,
      isSuperadmin: user.isSuperadmin,
      isActive: user.isActive,
      lastActive: user.lastActive,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      dataKaryawan: user.dataKaryawan
        ? {
            nama: user.dataKaryawan.nama,
            jenisKelamin: user.dataKaryawan.jenisKelamin,
            email: user.dataKaryawan.email,
            noPonsel: user.dataKaryawan.noPonsel,
            bagianKerja: user.dataKaryawan.bagianKerja,
            lokasi: user.dataKaryawan.lokasi,
            bidangKerja: user.dataKaryawan.bidangKerja,
            statusAktif: user.dataKaryawan.statusAktif,
          }
        : null,
      roles:
        user.roles?.map((ur: any) => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name,
          assignedAt: ur.assignedAt,
        })) || [],
      positions:
        user.positions?.map((up: any) => ({
          id: up.position.id,
          code: up.position.code,
          name: up.position.name,
          department: up.position.department?.name,
          school: up.position.school?.name,
          isPlt: up.isPlt,
          startDate: up.startDate,
        })) || [],
    };
  }

  /**
   * Helper: Check if current user can view target user
   */
  private canViewUser(targetUser: any, currentUser: any): boolean {
    if (currentUser.isSuperadmin) return true;
    if (targetUser.id === currentUser.id) return true;

    // Check if same department/school
    if (targetUser.dataKaryawan?.lokasi === currentUser.employee?.location) {
      return true;
    }

    return false;
  }

  /**
   * Helper: Check if user has permission
   */
  private hasPermission(user: any, module: string, action: string): boolean {
    // Simplified permission check - implement full logic based on your needs
    return user.permissions?.includes(`${module}:${action}`) || false;
  }

  /**
   * Helper: Determine user scope
   */
  private determineScope(user: any): string {
    if (user.isSuperadmin) return 'ALL';

    // Check positions for hierarchy
    const positions = user.positions || [];
    const hasManagementPosition = positions.some(
      (p: any) => p.position.hierarchyLevel <= 3,
    );

    if (hasManagementPosition) return 'DEPARTMENT';

    return 'OWN';
  }
}
