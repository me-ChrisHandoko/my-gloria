import {
  Controller,
  Get,
  Post,
  Body,
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
import { UserPermissionService } from '../services/user-permission.service';
import {
  GrantPermissionDto,
  RevokePermissionDto,
  BulkGrantPermissionsDto,
} from '../dto/user-permission/grant-permission.dto';
import {
  EffectivePermissionDto,
  UserPermissionSummaryDto,
} from '../dto/user-permission/effective-permissions.dto';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/permission.decorator';
import { PermissionAction, PermissionScope } from '@prisma/client';

@ApiTags('user-permissions')
@Controller('v1/users')
@UseGuards(ClerkAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class UserPermissionController {
  constructor(private readonly userPermissionService: UserPermissionService) {}

  @Post(':userId/permissions/grant')
  @RequirePermission('user-permission', PermissionAction.ASSIGN)
  @ApiOperation({ summary: 'Grant permission to user' })
  @ApiResponse({ status: 201, description: 'Permission granted successfully' })
  @ApiResponse({ status: 404, description: 'User or permission not found' })
  @ApiResponse({ status: 409, description: 'Permission already granted' })
  async grantPermission(
    @Param('userId') userId: string,
    @Body() grantDto: GrantPermissionDto,
    @Request() req: any,
  ) {
    return this.userPermissionService.grantPermission(
      userId,
      grantDto,
      req.user.userId,
    );
  }

  @Post(':userId/permissions/revoke')
  @RequirePermission('user-permission', PermissionAction.ASSIGN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke permission from user' })
  @ApiResponse({ status: 204, description: 'Permission revoked successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found for user' })
  async revokePermission(
    @Param('userId') userId: string,
    @Body() revokeDto: RevokePermissionDto,
    @Request() req: any,
  ) {
    await this.userPermissionService.revokePermission(
      userId,
      revokeDto,
      req.user.userId,
    );
  }

  @Post('permissions/bulk-grant')
  @RequirePermission('user-permission', PermissionAction.ASSIGN)
  @ApiOperation({ summary: 'Bulk grant permissions to user' })
  @ApiResponse({ status: 201, description: 'Permissions granted successfully' })
  async bulkGrantPermissions(
    @Body() bulkDto: BulkGrantPermissionsDto,
    @Request() req: any,
  ) {
    return this.userPermissionService.bulkGrantPermissions(
      bulkDto,
      req.user.userId,
    );
  }

  @Get(':userId/permissions/effective')
  @RequirePermission('user-permission', PermissionAction.READ)
  @ApiOperation({ summary: 'Get effective permissions for user' })
  @ApiResponse({
    status: 200,
    description: 'User permission summary',
    type: UserPermissionSummaryDto,
  })
  async getEffectivePermissions(
    @Param('userId') userId: string,
  ): Promise<UserPermissionSummaryDto> {
    return this.userPermissionService.getEffectivePermissions(userId);
  }

  @Get(':userId/permissions')
  @RequirePermission('user-permission', PermissionAction.READ)
  @ApiOperation({ summary: 'Get direct permissions for user' })
  @ApiResponse({ status: 200, description: 'List of user permissions' })
  async getUserPermissions(@Param('userId') userId: string) {
    return this.userPermissionService.getUserPermissions(userId);
  }

  @Get('permissions/expiring')
  @RequirePermission('user-permission', PermissionAction.READ)
  @ApiOperation({ summary: 'Get expiring temporary permissions' })
  @ApiResponse({ status: 200, description: 'List of expiring permissions' })
  async getExpiringPermissions(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 7;
    return this.userPermissionService.getExpiringPermissions(daysNum);
  }

  @Post('permissions/cleanup')
  @RequirePermission('user-permission', PermissionAction.DELETE)
  @ApiOperation({ summary: 'Cleanup expired permissions' })
  @ApiResponse({ status: 200, description: 'Number of permissions cleaned up' })
  async cleanupExpiredPermissions() {
    const count = await this.userPermissionService.cleanupExpiredPermissions();
    return { cleanedUp: count };
  }

  @Get('me/permissions')
  @ApiOperation({ summary: 'Get my effective permissions' })
  @ApiResponse({
    status: 200,
    description: 'Current user permission summary',
    type: UserPermissionSummaryDto,
  })
  async getMyPermissions(
    @Request() req: any,
  ): Promise<UserPermissionSummaryDto> {
    return this.userPermissionService.getEffectivePermissions(
      req.user.profileId,
    );
  }
}
