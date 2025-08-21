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
  UseInterceptors,
  Req,
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
import { AuditInterceptor } from '../../../middleware/security.middleware';
import { Audit } from '../../../middleware/security.middleware';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/permission.decorator';
import { PermissionAction, PermissionScope } from '@prisma/client';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(AuditInterceptor)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role already exists' })
  @Audit('CREATE', 'Role')
  async create(@Body() createRoleDto: CreateRoleDto, @Req() req: any) {
    const userId = req.user?.clerkUserId;
    return this.roleService.create(createRoleDto, userId);
  }

  @Get()
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
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get role by code' })
  @ApiResponse({ status: 200, description: 'Role details' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findByCode(@Param('code') code: string) {
    return this.roleService.findByCode(code);
  }

  @Get(':id/permissions/inherited')
  @ApiOperation({ summary: 'Get inherited permissions for a role' })
  @ApiResponse({ status: 200, description: 'List of inherited permissions' })
  async getInheritedPermissions(@Param('id') id: string) {
    return this.roleService.getInheritedPermissions(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 400, description: 'Cannot modify system role' })
  @Audit('UPDATE', 'Role')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Req() req: any,
  ) {
    const userId = req.user?.clerkUserId;
    return this.roleService.update(id, updateRoleDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete system role or role with active users',
  })
  @Audit('DELETE', 'Role')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.clerkUserId;
    await this.roleService.remove(id, userId);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  @ApiResponse({ status: 404, description: 'Role or user not found' })
  @ApiResponse({ status: 409, description: 'Role already assigned' })
  @Audit('ASSIGN', 'Role')
  async assignRole(
    @Param('id') id: string,
    @Body() assignRoleDto: AssignRoleDto,
    @Req() req: any,
  ) {
    const userId = req.user?.clerkUserId;
    return this.roleService.assignRole(id, assignRoleDto, userId);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke role from user' })
  @ApiResponse({ status: 204, description: 'Role revoked successfully' })
  @ApiResponse({ status: 404, description: 'Role or assignment not found' })
  @Audit('REVOKE', 'Role')
  async revokeRole(
    @Param('id') id: string,
    @Body() revokeRoleDto: RevokeRoleDto,
    @Req() req: any,
  ) {
    const userId = req.user?.clerkUserId;
    await this.roleService.revokeRole(id, revokeRoleDto, userId);
  }

  @Post(':id/permissions')
  @ApiOperation({ summary: 'Assign permissions to role' })
  @ApiResponse({
    status: 201,
    description: 'Permissions assigned successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot modify system role' })
  @Audit('ASSIGN_PERMISSIONS', 'Role')
  async assignPermissions(
    @Param('id') id: string,
    @Body() permissions: RolePermissionDto[],
    @Req() req: any,
  ) {
    const userId = req.user?.clerkUserId;
    return this.roleService.assignPermissions(id, permissions, userId);
  }

  @Delete(':id/permissions/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove permission from role' })
  @ApiResponse({ status: 204, description: 'Permission removed successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found on role' })
  @ApiResponse({ status: 400, description: 'Cannot modify system role' })
  @Audit('REMOVE_PERMISSION', 'Role')
  async removePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.clerkUserId;
    await this.roleService.removePermission(id, permissionId, userId);
  }
}
