import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { PermissionAnalyticsService } from '../services/permission-analytics.service';
import { RequirePermission } from '../decorators/permission.decorator';

@ApiTags('Permission Analytics')
@ApiBearerAuth()
@Controller('permission-analytics')
@UseGuards(ClerkAuthGuard)
export class PermissionAnalyticsController {
  constructor(private readonly analyticsService: PermissionAnalyticsService) {}

  @Get('dashboard')
  @RequirePermission('permission.analytics.view')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiQuery({ name: 'startDate', type: Date, required: false })
  @ApiQuery({ name: 'endDate', type: Date, required: false })
  async getDashboardStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getDashboardStats({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('usage-patterns')
  @RequirePermission('permission.analytics.view')
  @ApiOperation({ summary: 'Get permission usage patterns' })
  @ApiQuery({ name: 'userProfileId', required: false })
  @ApiQuery({ name: 'permissionCode', required: false })
  @ApiQuery({ name: 'startDate', type: Date, required: false })
  @ApiQuery({ name: 'endDate', type: Date, required: false })
  async getUsagePatterns(
    @Query('userProfileId') userProfileId?: string,
    @Query('permissionCode') permissionCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getUsagePatterns({
      userProfileId,
      permissionCode,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('anomalies')
  @RequirePermission('permission.analytics.anomaly')
  @ApiOperation({ summary: 'Get detected anomalies' })
  @ApiQuery({ name: 'userProfileId', required: false })
  @ApiQuery({ name: 'startDate', type: Date, required: false })
  @ApiQuery({ name: 'endDate', type: Date, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false, default: 100 })
  @ApiQuery({ name: 'offset', type: Number, required: false, default: 0 })
  async getAnomalies(
    @Query('userProfileId') userProfileId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.analyticsService.getAnomalies({
      userProfileId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('user/:userProfileId/anomaly-report')
  @RequirePermission('permission.analytics.anomaly')
  @ApiOperation({ summary: 'Get anomaly report for a specific user' })
  async getUserAnomalyReport(@Param('userProfileId') userProfileId: string) {
    return this.analyticsService.getUserAnomalyReport(userProfileId);
  }

  @Get('my-anomaly-report')
  @ApiOperation({ summary: 'Get anomaly report for current user' })
  async getMyAnomalyReport(@CurrentUser() user: any) {
    return this.analyticsService.getUserAnomalyReport(user.profileId);
  }

  @Get('permission/:permissionCode/trends')
  @RequirePermission('permission.analytics.view')
  @ApiOperation({ summary: 'Get trends for a specific permission' })
  @ApiQuery({ name: 'days', type: Number, required: false, default: 30 })
  async getPermissionTrends(
    @Param('permissionCode') permissionCode: string,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getPermissionTrends(
      permissionCode,
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get('daily-report')
  @RequirePermission('permission.analytics.admin')
  @ApiOperation({ summary: 'Generate daily analytics report' })
  async generateDailyReport() {
    return this.analyticsService.generateDailyReport();
  }
}