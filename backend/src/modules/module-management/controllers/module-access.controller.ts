import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { ModuleAccessService } from '../services/module-access.service';
import { OverrideService } from '../services/override.service';
import {
  CreateRoleModuleAccessDto,
  CreateUserModuleAccessDto,
  CreateUserOverrideDto,
  UpdateModuleAccessDto,
  BulkModuleAccessDto,
  UserModulePermissionDto,
} from '../dto/module-access.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { RequirePermission } from '../../permission/decorators/permission.decorator';
import { PermissionAction } from '@prisma/client';

@ApiTags('Module Access Control')
@ApiBearerAuth()
@Controller('v1/module-access')
@UseGuards(ClerkAuthGuard)
export class ModuleAccessController {
  constructor(
    private readonly moduleAccessService: ModuleAccessService,
    private readonly overrideService: OverrideService,
  ) {}

  // Role Module Access

  @Post('role')
  @RequirePermission('module-access', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Create role module access' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role module access created successfully',
    // ModuleAccessResponseDto is a type alias, not a class
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Role module access already exists',
  })
  async createRoleAccess(
    @Body() createDto: CreateRoleModuleAccessDto,
    @CurrentUser() user: any,
  ) {
    return this.moduleAccessService.createRoleAccess(createDto, user.userId);
  }

  @Get('role/:roleId')
  @RequirePermission('module-access', PermissionAction.READ)
  @ApiOperation({ summary: 'Get role module access' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of role module access',
    // ModuleAccessResponseDto is a type alias, not a class
  })
  async getRoleModuleAccess(@Param('roleId', ParseUUIDPipe) roleId: string) {
    return this.moduleAccessService.getRoleModuleAccess(roleId);
  }

  @Patch('role/:roleId/module/:moduleId')
  @RequirePermission('module-access', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Update role module access' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role module access updated successfully',
    // ModuleAccessResponseDto is a type alias, not a class
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role module access not found',
  })
  async updateRoleAccess(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() updateDto: UpdateModuleAccessDto,
  ) {
    return this.moduleAccessService.updateRoleAccess(
      roleId,
      moduleId,
      updateDto,
    );
  }

  @Delete('role/:roleId/module/:moduleId')
  @RequirePermission('module-access', PermissionAction.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role module access' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Role module access deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role module access not found',
  })
  async deleteRoleAccess(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    await this.moduleAccessService.deleteRoleAccess(roleId, moduleId);
  }

  // User Module Access

  @Post('user')
  @RequirePermission('module-access', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Create user module access' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User module access created successfully',
    // ModuleAccessResponseDto is a type alias, not a class
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User module access already exists',
  })
  async createUserAccess(
    @Body() createDto: CreateUserModuleAccessDto,
    @CurrentUser() user: any,
  ) {
    return this.moduleAccessService.createUserAccess(createDto, user.userId);
  }

  @Get('user/:userId')
  @RequirePermission('module-access', PermissionAction.READ)
  @ApiOperation({ summary: 'Get user direct module access' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user module access',
    // ModuleAccessResponseDto is a type alias, not a class
  })
  async getUserDirectModuleAccess(
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.moduleAccessService.getUserDirectModuleAccess(userId);
  }

  @Get('user/:userId/permissions')
  @RequirePermission('module-access', PermissionAction.READ)
  @ApiOperation({ summary: 'Get user effective module permissions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user module permissions',
    type: [UserModulePermissionDto],
  })
  async getUserModulePermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.moduleAccessService.getUserModulePermissions(userId);
  }

  @Get('my-permissions')
  @ApiOperation({ summary: 'Get current user module permissions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of current user module permissions',
    type: [UserModulePermissionDto],
  })
  async getMyModulePermissions(@CurrentUser() user: any) {
    return this.moduleAccessService.getUserModulePermissions(user.userId);
  }

  @Patch('user/:userId/module/:moduleId')
  @RequirePermission('module-access', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Update user module access' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User module access updated successfully',
    // ModuleAccessResponseDto is a type alias, not a class
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User module access not found',
  })
  async updateUserAccess(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() updateDto: UpdateModuleAccessDto,
  ) {
    return this.moduleAccessService.updateUserAccess(
      userId,
      moduleId,
      updateDto,
    );
  }

  @Delete('user/:userId/module/:moduleId')
  @RequirePermission('module-access', PermissionAction.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user module access' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User module access deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User module access not found',
  })
  async deleteUserAccess(
    @Param('userProfileId', ParseUUIDPipe) userProfileId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    await this.moduleAccessService.deleteUserAccess(userProfileId, moduleId);
  }

  // Bulk Operations

  @Post('bulk')
  @RequirePermission('module-access', PermissionAction.CREATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bulk assign module access' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Module access assigned successfully',
  })
  async bulkAssignAccess(
    @Body() bulkDto: BulkModuleAccessDto,
    @CurrentUser() user: any,
  ) {
    await this.moduleAccessService.bulkAssignAccess(bulkDto, user.userId);
  }

  // User Overrides

  @Post('override')
  @RequirePermission('module-access', PermissionAction.APPROVE)
  @ApiOperation({ summary: 'Create user override' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User override created successfully',
  })
  async createOverride(
    @Body() createDto: CreateUserOverrideDto,
    @CurrentUser() user: any,
  ) {
    return this.overrideService.createOverride(createDto, user.userId);
  }

  @Get('override/user/:userId')
  @RequirePermission('module-access', PermissionAction.READ)
  @ApiOperation({ summary: 'Get user overrides' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user overrides',
  })
  async getUserOverrides(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.overrideService.getUserOverrides(userId);
  }

  @Delete('override/:overrideId')
  @RequirePermission('module-access', PermissionAction.APPROVE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate user override' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User override deactivated successfully',
  })
  async deactivateOverride(
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
  ) {
    await this.overrideService.deactivateOverride(overrideId);
  }
}
