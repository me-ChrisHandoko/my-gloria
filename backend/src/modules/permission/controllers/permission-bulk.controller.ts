import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { PermissionBulkService } from '../services/permission-bulk.service';
import { BulkGrantPermissionsDto, BulkRevokePermissionsDto } from '../dto/bulk';
import { RequirePermission } from '../decorators/permission.decorator';

@ApiTags('Permission Bulk Operations')
@ApiBearerAuth()
@Controller('permission-bulk')
@UseGuards(ClerkAuthGuard)
export class PermissionBulkController {
  constructor(private readonly bulkService: PermissionBulkService) {}

  @Post('grant')
  @RequirePermission('permission.bulk.grant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk grant permissions to multiple targets' })
  @ApiResponse({ 
    status: 200, 
    description: 'Permissions granted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        totalTargets: { type: 'number' },
        totalPermissions: { type: 'number' },
        processed: { type: 'number' },
        failed: { type: 'number' },
        errors: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              targetId: { type: 'string' },
              permissionCode: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            created: { type: 'number' },
            updated: { type: 'number' },
            skipped: { type: 'number' },
          },
        },
      },
    },
  })
  async bulkGrant(
    @Body() dto: BulkGrantPermissionsDto,
    @CurrentUser() user: any,
  ) {
    return this.bulkService.bulkGrant(dto, user.id);
  }

  @Post('revoke')
  @RequirePermission('permission.bulk.revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk revoke permissions from multiple targets' })
  @ApiResponse({ 
    status: 200, 
    description: 'Permissions revoked successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        totalTargets: { type: 'number' },
        totalPermissions: { type: 'number' },
        processed: { type: 'number' },
        failed: { type: 'number' },
        errors: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              targetId: { type: 'string' },
              permissionCode: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            deleted: { type: 'number' },
            skipped: { type: 'number' },
          },
        },
      },
    },
  })
  async bulkRevoke(
    @Body() dto: BulkRevokePermissionsDto,
    @CurrentUser() user: any,
  ) {
    return this.bulkService.bulkRevoke(dto, user.id);
  }

  @Post('preview-grant')
  @RequirePermission('permission.bulk.grant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview bulk grant operation before execution' })
  @ApiResponse({ 
    status: 200, 
    description: 'Preview generated successfully',
    schema: {
      type: 'object',
      properties: {
        targets: { type: 'array' },
        permissions: { type: 'array' },
        estimatedChanges: { type: 'number' },
        warnings: { 
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async previewGrant(@Body() dto: BulkGrantPermissionsDto) {
    return this.bulkService.previewBulkGrant(dto);
  }
}