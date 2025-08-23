import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { FeatureFlagService } from './services/feature-flag.service';
import { MaintenanceService } from './services/maintenance.service';
import { BackupService } from './services/backup.service';
import {
  FeatureFlagDto,
  UpdateFeatureFlagDto,
  MaintenanceModeDto,
  BackupConfigDto,
  BackupStatusDto,
  RestoreBackupDto,
  BackupType,
  BackupStatus,
} from './dto/system-config.dto';

@ApiTags('System Configuration')
@Controller('api/v1/system-config')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class SystemConfigController {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly maintenanceService: MaintenanceService,
    private readonly backupService: BackupService,
  ) {}

  // ==================== Feature Flags ====================

  @Post('feature-flags')
  @ApiOperation({ summary: 'Create a new feature flag' })
  @ApiResponse({
    status: 201,
    description: 'Feature flag created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createFeatureFlag(@Body() dto: FeatureFlagDto) {
    return this.featureFlagService.createFeatureFlag(dto);
  }

  @Get('feature-flags')
  @ApiOperation({ summary: 'Get all feature flags' })
  @ApiResponse({ status: 200, description: 'Returns all feature flags' })
  async getAllFeatureFlags() {
    return this.featureFlagService.getAllFeatureFlags();
  }

  @Get('feature-flags/enabled')
  @ApiOperation({ summary: 'Get enabled features for current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of enabled feature names',
  })
  async getEnabledFeatures(
    @CurrentUser() user: any,
    @Query('groups') groups?: string,
  ) {
    const userGroups = groups ? groups.split(',') : undefined;
    return this.featureFlagService.getEnabledFeatures(user.userId, userGroups);
  }

  @Get('feature-flags/:name')
  @ApiOperation({ summary: 'Get a specific feature flag' })
  @ApiResponse({ status: 200, description: 'Returns feature flag details' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async getFeatureFlag(@Param('name') name: string) {
    return this.featureFlagService.getFeatureFlag(name);
  }

  @Get('feature-flags/:name/check')
  @ApiOperation({ summary: 'Check if a feature is enabled for current user' })
  @ApiResponse({ status: 200, description: 'Returns enabled status' })
  async checkFeatureEnabled(
    @Param('name') name: string,
    @CurrentUser() user: any,
    @Query('groups') groups?: string,
  ) {
    const userGroups = groups ? groups.split(',') : undefined;
    const enabled = await this.featureFlagService.isFeatureEnabled(
      name,
      user.userId,
      userGroups,
    );
    return { feature: name, enabled };
  }

  @Put('feature-flags/:name')
  @ApiOperation({ summary: 'Update a feature flag' })
  @ApiResponse({
    status: 200,
    description: 'Feature flag updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async updateFeatureFlag(
    @Param('name') name: string,
    @Body() dto: UpdateFeatureFlagDto,
  ) {
    return this.featureFlagService.updateFeatureFlag(name, dto);
  }

  @Post('feature-flags/:name/toggle')
  @ApiOperation({ summary: 'Toggle a feature flag on/off' })
  @ApiResponse({
    status: 200,
    description: 'Feature flag toggled successfully',
  })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async toggleFeatureFlag(@Param('name') name: string) {
    return this.featureFlagService.toggleFeatureFlag(name);
  }

  @Delete('feature-flags/:name')
  @ApiOperation({ summary: 'Delete a feature flag' })
  @ApiResponse({
    status: 204,
    description: 'Feature flag deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFeatureFlag(@Param('name') name: string) {
    await this.featureFlagService.deleteFeatureFlag(name);
  }

  // ==================== Maintenance Mode ====================

  @Get('maintenance')
  @ApiOperation({ summary: 'Get maintenance mode status' })
  @ApiResponse({
    status: 200,
    description: 'Returns maintenance mode configuration',
  })
  async getMaintenanceStatus() {
    return this.maintenanceService.getMaintenanceStatus();
  }

  @Post('maintenance')
  @ApiOperation({ summary: 'Enable or disable maintenance mode' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance mode updated successfully',
  })
  async setMaintenanceMode(
    @Body() dto: MaintenanceModeDto,
    @CurrentUser() user: any,
  ) {
    return this.maintenanceService.enableMaintenanceMode(dto, user.userId);
  }

  @Post('maintenance/disable')
  @ApiOperation({ summary: 'Disable maintenance mode' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance mode disabled successfully',
  })
  async disableMaintenanceMode(@CurrentUser() user: any) {
    return this.maintenanceService.disableMaintenanceMode(user.userId);
  }

  @Put('maintenance/message')
  @ApiOperation({ summary: 'Update maintenance message' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance message updated successfully',
  })
  async updateMaintenanceMessage(
    @Body('message') message: string,
    @CurrentUser() user: any,
  ) {
    return this.maintenanceService.updateMaintenanceMessage(
      message,
      user.userId,
    );
  }

  @Put('maintenance/extend')
  @ApiOperation({ summary: 'Extend maintenance end time' })
  @ApiResponse({
    status: 200,
    description: 'Maintenance time extended successfully',
  })
  async extendMaintenanceTime(
    @Body('estimatedEndTime') estimatedEndTime: Date,
    @CurrentUser() user: any,
  ) {
    return this.maintenanceService.extendMaintenanceTime(
      new Date(estimatedEndTime),
      user.userId,
    );
  }

  @Get('maintenance/history')
  @ApiOperation({ summary: 'Get maintenance mode history' })
  @ApiResponse({ status: 200, description: 'Returns maintenance mode history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMaintenanceHistory(@Query('limit') limit?: string) {
    return this.maintenanceService.getMaintenanceHistory(
      limit ? parseInt(limit) : 10,
    );
  }

  // ==================== Database Backup ====================

  @Post('backup')
  @ApiOperation({ summary: 'Create a new database backup' })
  @ApiResponse({ status: 201, description: 'Backup initiated successfully' })
  @ApiResponse({ status: 400, description: 'Another backup is in progress' })
  async createBackup(
    @Body() config: BackupConfigDto,
    @CurrentUser() user: any,
  ): Promise<BackupStatusDto> {
    return this.backupService.createBackup(config, user.userId);
  }

  @Post('backup/restore')
  @ApiOperation({ summary: 'Restore a database backup' })
  @ApiResponse({ status: 200, description: 'Backup restored successfully' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async restoreBackup(@Body() dto: RestoreBackupDto, @CurrentUser() user: any) {
    await this.backupService.restoreBackup(dto, user.userId);
    return { message: 'Backup restored successfully' };
  }

  @Get('backup')
  @ApiOperation({ summary: 'List all backups' })
  @ApiResponse({ status: 200, description: 'Returns list of backups' })
  @ApiQuery({ name: 'type', required: false, enum: BackupType })
  @ApiQuery({ name: 'status', required: false, enum: BackupStatus })
  async listBackups(
    @Query('type') type?: BackupType,
    @Query('status') status?: BackupStatus,
  ): Promise<BackupStatusDto[]> {
    return this.backupService.listBackups(type, status);
  }

  @Get('backup/:id')
  @ApiOperation({ summary: 'Get backup status' })
  @ApiResponse({ status: 200, description: 'Returns backup status' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async getBackupStatus(@Param('id') id: string): Promise<BackupStatusDto> {
    return this.backupService.getBackupStatus(id);
  }

  @Delete('backup/:id')
  @ApiOperation({ summary: 'Delete a backup' })
  @ApiResponse({ status: 204, description: 'Backup deleted successfully' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBackup(@Param('id') id: string, @CurrentUser() user: any) {
    await this.backupService.deleteBackup(id, user.userId);
  }

  @Post('backup/cleanup')
  @ApiOperation({ summary: 'Clean up old backups' })
  @ApiResponse({
    status: 200,
    description: 'Returns number of backups deleted',
  })
  @ApiQuery({ name: 'daysToKeep', required: false, type: Number })
  async cleanupOldBackups(
    @Query('daysToKeep') daysToKeep: string,
    @CurrentUser() user: any,
  ) {
    const days = daysToKeep ? parseInt(daysToKeep) : 30;
    const deletedCount = await this.backupService.cleanupOldBackups(
      days,
      user.userId,
    );
    return { deletedCount, message: `Cleaned up ${deletedCount} old backups` };
  }
}
