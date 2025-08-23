import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { AuditService } from '../services/audit.service';
import {
  QueryAuditLogDto,
  AuditLogResponseDto,
  PaginatedAuditLogResponseDto,
  QueryAuditStatisticsDto,
  AuditStatisticsSummaryDto,
  ExportAuditLogDto,
} from '../dto';
import {
  RequirePermission,
  CanRead,
} from '../../permission/decorators/permission.decorator';
import { PermissionAction } from '@prisma/client';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('api/v1/audit')
@UseGuards(ClerkAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @RequirePermission('audit', PermissionAction.READ)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({ summary: 'Query audit logs with filters' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated audit logs',
    type: PaginatedAuditLogResponseDto,
  })
  async queryAuditLogs(
    @Query() query: QueryAuditLogDto,
  ): Promise<PaginatedAuditLogResponseDto> {
    const { data, total } = await this.auditService.queryAuditLogs(query);

    return {
      data,
      total,
      limit: query.limit || 50,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + (query.limit || 50) < total,
    };
  }

  @Get('entity/:entityType/:entityId')
  @RequirePermission('audit', PermissionAction.READ)
  @ApiOperation({ summary: 'Get audit trail for a specific entity' })
  @ApiResponse({
    status: 200,
    description: 'Returns audit trail for the entity',
    type: [AuditLogResponseDto],
  })
  async getEntityAuditTrail(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() query: QueryAuditLogDto,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditService.getAuditTrail(entityType, entityId, {
      limit: query.limit,
      offset: query.offset,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @Get('user/:userId')
  @RequirePermission('audit', PermissionAction.READ)
  @ApiOperation({ summary: 'Get user activity audit trail' })
  @ApiResponse({
    status: 200,
    description: 'Returns user activity logs',
    type: [AuditLogResponseDto],
  })
  async getUserActivity(
    @Param('userId') userId: string,
    @Query() query: QueryAuditLogDto,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditService.getUserActivity(userId, {
      limit: query.limit,
      offset: query.offset,
      modules: query.module ? [query.module] : undefined,
      actions: query.actions,
    });
  }

  @Get('my-activity')
  @ApiOperation({ summary: 'Get current user activity audit trail' })
  @ApiResponse({
    status: 200,
    description: 'Returns current user activity logs',
    type: [AuditLogResponseDto],
  })
  async getMyActivity(
    @CurrentUser() user: any,
    @Query() query: QueryAuditLogDto,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditService.getUserActivity(user.clerkUserId, {
      limit: query.limit,
      offset: query.offset,
      modules: query.module ? [query.module] : undefined,
      actions: query.actions,
    });
  }

  @Get('statistics')
  @RequirePermission('audit', PermissionAction.READ)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute for statistics
  @ApiOperation({ summary: 'Get audit log statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns audit statistics',
    type: AuditStatisticsSummaryDto,
  })
  async getStatistics(
    @Query() query: QueryAuditStatisticsDto,
  ): Promise<AuditStatisticsSummaryDto> {
    const statistics = await this.auditService.getStatistics(query);

    return {
      data: statistics,
      total: statistics.reduce((sum, stat) => sum + stat.count, 0),
      startDate: new Date(query.startDate),
      endDate: new Date(query.endDate),
      groupBy: query.groupBy,
    };
  }

  @Post('export')
  @RequirePermission('audit', PermissionAction.READ)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 exports per minute to prevent resource exhaustion
  @ApiOperation({ summary: 'Export audit logs' })
  @ApiResponse({
    status: 200,
    description: 'Returns exported audit logs file',
  })
  async exportAuditLogs(
    @Body() exportDto: ExportAuditLogDto,
    @Res() res: Response,
  ): Promise<void> {
    const { data, filename, mimeType } =
      await this.auditService.exportAuditLogs(exportDto);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(data);
  }

  @Post('cleanup')
  @RequirePermission('audit', PermissionAction.DELETE)
  @Throttle({ default: { limit: 1, ttl: 300000 } }) // 1 cleanup per 5 minutes
  @ApiOperation({ summary: 'Clean up old audit logs' })
  @ApiResponse({
    status: 200,
    description: 'Returns number of deleted records',
  })
  async cleanupOldLogs(
    @Body('retentionDays') retentionDays: number = 365,
  ): Promise<{ deletedCount: number }> {
    const deletedCount = await this.auditService.cleanupOldLogs(retentionDays);
    return { deletedCount };
  }

  @Get('recent-changes')
  @RequirePermission('audit', PermissionAction.READ)
  @ApiOperation({ summary: 'Get recent changes across the system' })
  @ApiResponse({
    status: 200,
    description: 'Returns recent audit logs',
    type: [AuditLogResponseDto],
  })
  async getRecentChanges(
    @Query('limit') limit: number = 20,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditService.getRecentChanges(limit);
  }

  @Get('compliance-report')
  @RequirePermission('audit', PermissionAction.READ)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 reports per minute
  @ApiOperation({ summary: 'Generate compliance audit report' })
  @ApiResponse({
    status: 200,
    description: 'Returns compliance report',
  })
  async getComplianceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<any> {
    return this.auditService.generateComplianceReport(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('integrity/:id')
  @RequirePermission('audit', PermissionAction.READ)
  @ApiOperation({ summary: 'Verify integrity of specific audit log' })
  @ApiResponse({
    status: 200,
    description: 'Returns integrity verification result',
  })
  async verifyIntegrity(@Param('id') id: string): Promise<any> {
    return this.auditService.verifyIntegrity(id);
  }

  @Post('integrity/verify')
  @RequirePermission('audit', PermissionAction.READ)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 verifications per minute
  @ApiOperation({ summary: 'Verify audit chain integrity' })
  @ApiResponse({
    status: 200,
    description: 'Returns chain integrity verification result',
  })
  async verifyChainIntegrity(
    @Body() body: { startDate?: string; endDate?: string },
  ): Promise<any> {
    const startDate = body.startDate ? new Date(body.startDate) : undefined;
    const endDate = body.endDate ? new Date(body.endDate) : undefined;
    return this.auditService.verifyChainIntegrity(startDate, endDate);
  }

  @Get('integrity/report')
  @RequirePermission('audit', PermissionAction.READ)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 reports per minute
  @ApiOperation({ summary: 'Get integrity report' })
  @ApiResponse({
    status: 200,
    description: 'Returns integrity report',
  })
  async getIntegrityReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.auditService.getIntegrityReport(start, end);
  }

  @Post('integrity/repair')
  @RequirePermission('audit', PermissionAction.UPDATE)
  @Throttle({ default: { limit: 1, ttl: 300000 } }) // 1 repair per 5 minutes
  @ApiOperation({ summary: 'Repair audit chain integrity' })
  @ApiResponse({
    status: 200,
    description: 'Returns repair result',
  })
  async repairChainIntegrity(
    @Body() body: { startDate?: string; endDate?: string },
  ): Promise<any> {
    const startDate = body.startDate ? new Date(body.startDate) : undefined;
    const endDate = body.endDate ? new Date(body.endDate) : undefined;
    return this.auditService.repairChainIntegrity(startDate, endDate);
  }

  @Get('events/statistics')
  @RequirePermission('audit', PermissionAction.READ)
  @ApiOperation({ summary: 'Get event processing statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns event processing statistics',
  })
  async getEventStatistics(): Promise<any> {
    return this.auditService.getEventStatistics();
  }
}
