import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/role/create-role.dto';
import { UpdateRoleDto } from '../dto/role/update-role.dto';
import {
  AssignRoleDto,
  RevokeRoleDto,
  RolePermissionDto,
} from '../dto/role/assign-role.dto';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/permission.decorator';
import { PermissionAction, PermissionScope } from '@prisma/client';

@ApiTags('roles')
@Controller('v1/roles')
@UseGuards(ClerkAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequirePermission('role', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role already exists' })
  async create(@Body() createRoleDto: CreateRoleDto, @Request() req: any) {
    return this.roleService.create(createRoleDto, req.user.userId);
  }

  @Get()
  @RequirePermission('role', PermissionAction.READ)
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async findAll(
    @Query('hierarchyLevel') hierarchyLevel?: string,
    @Query('isSystemRole') isSystemRole?: string,
    @Query('isActive') isActive?: string,
    @Query('includePermissions') includePermissions?: string,
  ) {
    return this.roleService.findAll({
      hierarchyLevel: hierarchyLevel ? parseInt(hierarchyLevel) : undefined,
      isSystemRole:
        isSystemRole === undefined ? undefined : isSystemRole === 'true',
      isActive: isActive === undefined ? undefined : isActive === 'true',
      includePermissions: includePermissions === 'true',
    });
  }

  @Get(':id')
  @RequirePermission('role', PermissionAction.READ)
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Get('code/:code')
  @RequirePermission('role', PermissionAction.READ)
  @ApiOperation({ summary: 'Get role by code' })
  @ApiResponse({ status: 200, description: 'Role details' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findByCode(@Param('code') code: string) {
    return this.roleService.findByCode(code);
  }

  @Get(':id/permissions/inherited')
  @RequirePermission('role', PermissionAction.READ)
  @ApiOperation({ summary: 'Get inherited permissions for a role' })
  @ApiResponse({ status: 200, description: 'List of inherited permissions' })
  async getInheritedPermissions(@Param('id') id: string) {
    return this.roleService.getInheritedPermissions(id);
  }

  @Patch(':id')
  @RequirePermission('role', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 400, description: 'Cannot modify system role' })
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Request() req: any,
  ) {
    return this.roleService.update(id, updateRoleDto, req.user.userId);
  }

  @Delete(':id')
  @RequirePermission('role', PermissionAction.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete system role or role with active users',
  })
  async remove(@Param('id') id: string, @Request() req: any) {
    await this.roleService.remove(id, req.user.userId);
  }

  @Post(':id/assign')
  @RequirePermission('role', PermissionAction.ASSIGN)
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  @ApiResponse({ status: 404, description: 'Role or user not found' })
  @ApiResponse({ status: 409, description: 'Role already assigned' })
  async assignRole(
    @Param('id') id: string,
    @Body() assignRoleDto: AssignRoleDto,
    @Request() req: any,
  ) {
    return this.roleService.assignRole(id, assignRoleDto, req.user.userId);
  }

  @Post(':id/revoke')
  @RequirePermission('role', PermissionAction.ASSIGN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke role from user' })
  @ApiResponse({ status: 204, description: 'Role revoked successfully' })
  @ApiResponse({ status: 404, description: 'Role or assignment not found' })
  async revokeRole(
    @Param('id') id: string,
    @Body() revokeRoleDto: RevokeRoleDto,
    @Request() req: any,
  ) {
    await this.roleService.revokeRole(id, revokeRoleDto, req.user.userId);
  }

  @Post(':id/permissions')
  @RequirePermission('role', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Assign permissions to role' })
  @ApiResponse({
    status: 201,
    description: 'Permissions assigned successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot modify system role' })
  async assignPermissions(
    @Param('id') id: string,
    @Body() permissions: RolePermissionDto[],
    @Request() req: any,
  ) {
    return this.roleService.assignPermissions(id, permissions, req.user.userId);
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermission('role', PermissionAction.UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove permission from role' })
  @ApiResponse({ status: 204, description: 'Permission removed successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found on role' })
  @ApiResponse({ status: 400, description: 'Cannot modify system role' })
  async removePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
    @Request() req: any,
  ) {
    await this.roleService.removePermission(id, permissionId, req.user.userId);
  }
}
