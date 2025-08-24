import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { RequirePermission } from '../../../modules/permission/decorators/permission.decorator';
import { QueueService } from '../services/queue.service';
import { QueueMonitoringService } from '../services/queue-monitoring.service';

@ApiTags('Queue Monitoring')
@Controller('api/v1/queue')
@UseGuards(ClerkAuthGuard)
export class QueueMonitoringController {
  constructor(
    private readonly queueService: QueueService,
    private readonly monitoringService: QueueMonitoringService,
  ) {}

  @Get('metrics')
  @RequirePermission('system.monitoring.view')
  @ApiOperation({ summary: 'Get queue metrics' })
  @ApiResponse({ status: 200, description: 'Queue metrics retrieved' })
  async getQueueMetrics() {
    const metrics = await this.queueService.getQueueMetrics();
    const health = await this.monitoringService.getQueueHealth();
    const statistics = await this.monitoringService.getJobStatistics();

    return {
      metrics,
      health,
      statistics,
    };
  }

  @Get('jobs/:status')
  @RequirePermission('system.monitoring.view')
  @ApiOperation({ summary: 'Get jobs by status' })
  @ApiQuery({ name: 'start', required: false, type: Number })
  @ApiQuery({ name: 'end', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Jobs retrieved' })
  async getJobsByStatus(
    @Param('status') status: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const validStatuses = ['completed', 'failed', 'delayed', 'active', 'waiting', 'paused'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const startIndex = start ? parseInt(start, 10) : 0;
    const endIndex = end ? parseInt(end, 10) : 20;

    const jobs = await this.queueService.getJobsByStatus(
      status as any,
      startIndex,
      endIndex,
    );

    return {
      status,
      start: startIndex,
      end: endIndex,
      count: jobs.length,
      jobs: jobs.map(job => ({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress(),
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        returnvalue: job.returnvalue,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn,
        timestamp: job.timestamp,
      })),
    };
  }

  @Get('job/:id')
  @RequirePermission('system.monitoring.view')
  @ApiOperation({ summary: 'Get job details' })
  @ApiResponse({ status: 200, description: 'Job details retrieved' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobDetails(@Param('id') id: string) {
    const job = await this.queueService.getJob(id);
    if (!job) {
      throw new BadRequestException(`Job ${id} not found`);
    }

    const state = await job.getState();
    const progress = this.monitoringService.getJobProgress(id);

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      state,
      progress: progress || job.progress(),
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      returnvalue: job.returnvalue,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      timestamp: job.timestamp,
      delay: (job as any).delay,
      opts: job.opts,
    };
  }

  @Get('job/:id/progress')
  @RequirePermission('system.monitoring.view')
  @ApiOperation({ summary: 'Get job progress' })
  @ApiResponse({ status: 200, description: 'Job progress retrieved' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobProgress(@Param('id') id: string) {
    const progress = this.monitoringService.getJobProgress(id);
    if (!progress) {
      const job = await this.queueService.getJob(id);
      if (!job) {
        throw new BadRequestException(`Job ${id} not found`);
      }
      
      return {
        jobId: id,
        progress: job.progress(),
        timestamp: new Date(),
      };
    }

    return progress;
  }

  @Get('active-progress')
  @RequirePermission('system.monitoring.view')
  @ApiOperation({ summary: 'Get all active job progress' })
  @ApiResponse({ status: 200, description: 'Active job progress retrieved' })
  async getAllActiveProgress() {
    const activeProgress = this.monitoringService.getAllJobProgress();
    return {
      count: activeProgress.length,
      jobs: activeProgress,
    };
  }

  @Get('health')
  @RequirePermission('system.monitoring.view')
  @ApiOperation({ summary: 'Get queue health status' })
  @ApiResponse({ status: 200, description: 'Queue health status retrieved' })
  async getQueueHealth() {
    return await this.monitoringService.getQueueHealth();
  }
}