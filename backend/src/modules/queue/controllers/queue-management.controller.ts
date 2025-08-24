import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { RequirePermission } from '../../../modules/permission/decorators/permission.decorator';
import { QueueService } from '../services/queue.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { CurrentUser as ICurrentUser } from '../interfaces/user.interface';

class CleanJobsDto {
  grace: number; // Grace period in milliseconds
  limit?: number; // Max number of jobs to clean
  status?: 'completed' | 'failed'; // Job status to clean
}

@ApiTags('Queue Management')
@Controller('api/v1/queue/manage')
@UseGuards(ClerkAuthGuard)
export class QueueManagementController {
  constructor(private readonly queueService: QueueService) {}

  @Post('pause')
  @RequirePermission('system.queue.manage')
  @ApiOperation({ summary: 'Pause the queue' })
  @ApiResponse({ status: 200, description: 'Queue paused' })
  async pauseQueue(@CurrentUser() user: ICurrentUser) {
    await this.queueService.pauseQueue();
    return {
      success: true,
      message: 'Queue paused successfully',
      pausedBy: user.userId,
      pausedAt: new Date(),
    };
  }

  @Post('resume')
  @RequirePermission('system.queue.manage')
  @ApiOperation({ summary: 'Resume the queue' })
  @ApiResponse({ status: 200, description: 'Queue resumed' })
  async resumeQueue(@CurrentUser() user: ICurrentUser) {
    await this.queueService.resumeQueue();
    return {
      success: true,
      message: 'Queue resumed successfully',
      resumedBy: user.userId,
      resumedAt: new Date(),
    };
  }

  @Delete('job/:id')
  @RequirePermission('system.queue.manage')
  @ApiOperation({ summary: 'Cancel a job' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async cancelJob(
    @Param('id') id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const job = await this.queueService.getJob(id);
    if (!job) {
      throw new BadRequestException(`Job ${id} not found`);
    }

    await this.queueService.cancelJob(id);
    return {
      success: true,
      message: `Job ${id} cancelled successfully`,
      cancelledBy: user.userId,
      cancelledAt: new Date(),
    };
  }

  @Post('clean')
  @RequirePermission('system.queue.manage')
  @ApiOperation({ summary: 'Clean old jobs' })
  @ApiBody({ type: CleanJobsDto })
  @ApiResponse({ status: 200, description: 'Jobs cleaned' })
  async cleanJobs(
    @Body() dto: CleanJobsDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    if (dto.grace < 0) {
      throw new BadRequestException('Grace period must be positive');
    }

    const cleanedJobs = await this.queueService.cleanOldJobs(
      dto.grace,
      dto.limit || 100,
      dto.status || 'completed',
    );

    return {
      success: true,
      message: `Cleaned ${cleanedJobs.length} jobs`,
      cleanedBy: user.userId,
      cleanedAt: new Date(),
      grace: dto.grace,
      limit: dto.limit,
      status: dto.status || 'completed',
    };
  }

  @Post('retry/:id')
  @RequirePermission('system.queue.manage')
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiResponse({ status: 200, description: 'Job retried' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async retryJob(
    @Param('id') id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const job = await this.queueService.getJob(id);
    if (!job) {
      throw new BadRequestException(`Job ${id} not found`);
    }

    const state = await job.getState();
    if (state !== 'failed') {
      throw new BadRequestException(`Job ${id} is not in failed state (current: ${state})`);
    }

    await job.retry();
    return {
      success: true,
      message: `Job ${id} queued for retry`,
      retriedBy: user.userId,
      retriedAt: new Date(),
    };
  }
}