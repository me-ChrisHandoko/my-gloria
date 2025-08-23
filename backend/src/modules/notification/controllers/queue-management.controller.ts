import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { QueueService } from '../queue.service';
import { DeadLetterQueueService } from '../services/dead-letter-queue.service';
import { WeightedQueueService } from '../services/weighted-queue.service';
import { Priority } from '../enums/notification.enum';

export class UpdateAlertConfigDto {
  enabled?: boolean;
  threshold?: number;
  windowMs?: number;
  recipients?: string[];
}

export class UpdateWeightConfigDto {
  weight?: number;
  concurrency?: number;
  rateLimit?: {
    max: number;
    duration: number;
  };
}

@ApiTags('Notification Queue Management')
@Controller('api/v1/notifications/queue')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class QueueManagementController {
  constructor(
    private readonly queueService: QueueService,
    private readonly deadLetterQueueService: DeadLetterQueueService,
    private readonly weightedQueueService: WeightedQueueService,
  ) {}

  /**
   * Get comprehensive queue statistics
   */
  @Get('statistics')
  @ApiOperation({ summary: 'Get comprehensive queue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
  })
  async getQueueStatistics() {
    const stats = await this.queueService.getComprehensiveQueueStatus();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get dead letter queue statistics
   */
  @Get('dead-letter/statistics')
  @ApiOperation({ summary: 'Get dead letter queue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dead letter queue statistics retrieved successfully',
  })
  async getDeadLetterStatistics() {
    const stats = await this.deadLetterQueueService.getStatistics();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Retry a specific dead letter job
   */
  @Post('dead-letter/:jobId/retry')
  @ApiOperation({ summary: 'Retry a dead letter job' })
  @ApiResponse({ status: 200, description: 'Job queued for retry' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @HttpCode(HttpStatus.OK)
  async retryDeadLetterJob(@Param('jobId') jobId: string) {
    const success = await this.deadLetterQueueService.retryDeadLetterJob(jobId);

    if (!success) {
      return {
        success: false,
        message: 'Job not found or could not be retried',
      };
    }

    return {
      success: true,
      message: 'Job queued for retry',
    };
  }

  /**
   * Clear dead letter queue (emergency use only)
   */
  @Delete('dead-letter/clear')
  @ApiOperation({ summary: 'Clear dead letter queue (emergency use only)' })
  @ApiResponse({ status: 200, description: 'Dead letter queue cleared' })
  @HttpCode(HttpStatus.OK)
  async clearDeadLetterQueue() {
    await this.deadLetterQueueService.clearDeadLetterQueue();
    return {
      success: true,
      message: 'Dead letter queue cleared',
    };
  }

  /**
   * Update alert configuration
   */
  @Patch('dead-letter/alert-config')
  @ApiOperation({ summary: 'Update dead letter queue alert configuration' })
  @ApiResponse({ status: 200, description: 'Alert configuration updated' })
  async updateAlertConfig(@Body() config: UpdateAlertConfigDto) {
    this.deadLetterQueueService.updateAlertConfig(config);
    return {
      success: true,
      message: 'Alert configuration updated',
    };
  }

  /**
   * Get weighted queue statistics
   */
  @Get('weighted/statistics')
  @ApiOperation({ summary: 'Get weighted queue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Weighted queue statistics retrieved successfully',
  })
  async getWeightedQueueStatistics() {
    const stats = await this.weightedQueueService.getQueueStatistics();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Rebalance queue weights
   */
  @Post('weighted/rebalance')
  @ApiOperation({ summary: 'Rebalance queue weights based on performance' })
  @ApiResponse({ status: 200, description: 'Queue weights rebalanced' })
  @HttpCode(HttpStatus.OK)
  async rebalanceWeights() {
    await this.weightedQueueService.rebalanceWeights();
    return {
      success: true,
      message: 'Queue weights rebalanced',
    };
  }

  /**
   * Update weight configuration for a specific priority
   */
  @Patch('weighted/:priority/config')
  @ApiOperation({ summary: 'Update weight configuration for a priority' })
  @ApiResponse({ status: 200, description: 'Weight configuration updated' })
  async updateWeightConfig(
    @Param('priority') priority: Priority,
    @Body() config: UpdateWeightConfigDto,
  ) {
    this.weightedQueueService.updateWeightConfig(priority, config);
    return {
      success: true,
      message: `Weight configuration updated for ${priority} priority`,
    };
  }

  /**
   * Pause a priority queue
   */
  @Post('weighted/:priority/pause')
  @ApiOperation({ summary: 'Pause a priority queue' })
  @ApiResponse({ status: 200, description: 'Queue paused' })
  @HttpCode(HttpStatus.OK)
  async pausePriorityQueue(@Param('priority') priority: Priority) {
    await this.weightedQueueService.pausePriorityQueue(priority);
    return {
      success: true,
      message: `${priority} queue paused`,
    };
  }

  /**
   * Resume a priority queue
   */
  @Post('weighted/:priority/resume')
  @ApiOperation({ summary: 'Resume a priority queue' })
  @ApiResponse({ status: 200, description: 'Queue resumed' })
  @HttpCode(HttpStatus.OK)
  async resumePriorityQueue(@Param('priority') priority: Priority) {
    await this.weightedQueueService.resumePriorityQueue(priority);
    return {
      success: true,
      message: `${priority} queue resumed`,
    };
  }

  /**
   * Clear a priority queue
   */
  @Delete('weighted/:priority/clear')
  @ApiOperation({ summary: 'Clear a priority queue' })
  @ApiResponse({ status: 200, description: 'Queue cleared' })
  @HttpCode(HttpStatus.OK)
  async clearPriorityQueue(@Param('priority') priority: Priority) {
    await this.weightedQueueService.clearPriorityQueue(priority);
    return {
      success: true,
      message: `${priority} queue cleared`,
    };
  }

  /**
   * Pause main queue
   */
  @Post('pause')
  @ApiOperation({ summary: 'Pause main notification queue' })
  @ApiResponse({ status: 200, description: 'Queue paused' })
  @HttpCode(HttpStatus.OK)
  async pauseQueue() {
    await this.queueService.pauseQueue();
    return {
      success: true,
      message: 'Main notification queue paused',
    };
  }

  /**
   * Resume main queue
   */
  @Post('resume')
  @ApiOperation({ summary: 'Resume main notification queue' })
  @ApiResponse({ status: 200, description: 'Queue resumed' })
  @HttpCode(HttpStatus.OK)
  async resumeQueue() {
    await this.queueService.resumeQueue();
    return {
      success: true,
      message: 'Main notification queue resumed',
    };
  }

  /**
   * Retry all failed jobs
   */
  @Post('retry-failed')
  @ApiOperation({ summary: 'Retry all failed jobs' })
  @ApiResponse({ status: 200, description: 'Failed jobs retried' })
  @HttpCode(HttpStatus.OK)
  async retryFailedJobs() {
    const count = await this.queueService.retryFailedJobs();
    return {
      success: true,
      message: `Retried ${count} failed jobs`,
      data: { retryCount: count },
    };
  }

  /**
   * Clean up old jobs
   */
  @Post('cleanup')
  @ApiOperation({ summary: 'Clean up old completed and failed jobs' })
  @ApiResponse({ status: 200, description: 'Old jobs cleaned up' })
  @HttpCode(HttpStatus.OK)
  async cleanupOldJobs() {
    await this.queueService.cleanupOldJobs();
    return {
      success: true,
      message: 'Old jobs cleaned up',
    };
  }
}
