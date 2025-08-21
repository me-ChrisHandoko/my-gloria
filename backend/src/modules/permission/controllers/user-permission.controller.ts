import {
  Controller,
  Get,
  Post,
  Body,
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
import { AuditInterceptor } from '../../../middleware/security.middleware';
import { Audit } from '../../../middleware/security.middleware';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/permission.decorator';
import { PermissionAction, PermissionScope } from '@prisma/client';

@ApiTags('User Permissions')
@ApiBearerAuth()
@Controller('user-permissions')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(AuditInterceptor)
export class UserPermissionController {
  constructor(private readonly userPermissionService: UserPermissionService) {}

  @Post(':userId/permissions/grant')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Grant permission to user' })
  @ApiResponse({ status: 201, description: 'Permission granted successfully' })
  @ApiResponse({ status: 404, description: 'User or permission not found' })
  @ApiResponse({ status: 409, description: 'Permission already granted' })
  @Audit('GRANT', 'UserPermission')
  async grantPermission(
    @Param('userId') userId: string,
    @Body() grantDto: GrantPermissionDto,
    @Req() req: any,
  ) {
    const grantedBy = req.user?.clerkUserId;
    return this.userPermissionService.grantPermission(
      userId,
      grantDto,
      grantedBy,
    );
  }

  @Post(':userId/permissions/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke permission from user' })
  @ApiResponse({ status: 204, description: 'Permission revoked successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found for user' })
  @Audit('REVOKE', 'UserPermission')
  async revokePermission(
    @Param('userId') userId: string,
    @Body() revokeDto: RevokePermissionDto,
    @Req() req: any,
  ) {
    const revokedBy = req.user?.clerkUserId;
    await this.userPermissionService.revokePermission(
      userId,
      revokeDto,
      revokedBy,
    );
  }

  @Post('permissions/bulk-grant')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk grant permissions to user' })
  @ApiResponse({ status: 201, description: 'Permissions granted successfully' })
  @Audit('BULK_GRANT', 'UserPermission')
  async bulkGrantPermissions(
    @Body() bulkDto: BulkGrantPermissionsDto,
    @Req() req: any,
  ) {
    const grantedBy = req.user?.clerkUserId;
    return this.userPermissionService.bulkGrantPermissions(bulkDto, grantedBy);
  }

  @Get(':userId/permissions/effective')
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
  @ApiOperation({ summary: 'Get direct permissions for user' })
  @ApiResponse({ status: 200, description: 'List of user permissions' })
  async getUserPermissions(@Param('userId') userId: string) {
    return this.userPermissionService.getUserPermissions(userId);
  }

  @Get('permissions/expiring')
  @ApiOperation({ summary: 'Get expiring temporary permissions' })
  @ApiResponse({ status: 200, description: 'List of expiring permissions' })
  async getExpiringPermissions(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 7;
    return this.userPermissionService.getExpiringPermissions(daysNum);
  }

  @Post('permissions/cleanup')
  @ApiOperation({ summary: 'Cleanup expired permissions' })
  @ApiResponse({ status: 200, description: 'Number of permissions cleaned up' })
  @Audit('CLEANUP', 'UserPermission')
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
  async getMyPermissions(@Req() req: any): Promise<UserPermissionSummaryDto> {
    const userId = req.user?.clerkUserId || req.user?.profileId;
    return this.userPermissionService.getEffectivePermissions(userId);
  }
}
