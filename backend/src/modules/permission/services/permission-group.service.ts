import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
} from '../dto/permission-group.dto';

@Injectable()
export class PermissionGroupService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.permissionGroup.findMany({
      include: {
        permissions: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });

    if (!group) {
      throw new NotFoundException(`Permission group with ID ${id} not found`);
    }

    return group;
  }

  async create(data: CreatePermissionGroupDto) {
    // Get the highest sort order
    const maxSortOrder = await this.prisma.permissionGroup.aggregate({
      _max: {
        sortOrder: true,
      },
    });

    // Generate a unique ID
    const id = `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return this.prisma.permissionGroup.create({
      data: {
        id,
        code: data.code,
        name: data.name,
        description: data.description,
        icon: data.icon,
        sortOrder: data.sortOrder ?? (maxSortOrder._max.sortOrder ?? 0) + 1,
      },
      include: {
        permissions: true,
      },
    });
  }

  async update(id: string, data: UpdatePermissionGroupDto) {
    // Check if the group exists
    await this.findOne(id);

    return this.prisma.permissionGroup.update({
      where: { id },
      data,
      include: {
        permissions: true,
      },
    });
  }

  async remove(id: string) {
    // Check if the group exists
    await this.findOne(id);

    // Check if there are permissions in this group
    const permissionsCount = await this.prisma.permission.count({
      where: { groupId: id },
    });

    if (permissionsCount > 0) {
      throw new Error(
        `Cannot delete group with ${permissionsCount} permissions. Move or delete permissions first.`,
      );
    }

    await this.prisma.permissionGroup.delete({
      where: { id },
    });

    return { success: true, message: 'Permission group deleted successfully' };
  }
}
