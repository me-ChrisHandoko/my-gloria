import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import {
  CanRead,
  CanUpdate,
} from '../../permission/decorators/permission.decorator';
import { WorkflowService } from '../services/workflow.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ProcessApprovalDto,
  ApprovalStepFilterDto,
} from '../dto/approval-step.dto';

@ApiTags('Approval Steps')
@ApiBearerAuth()
@Controller('api/v1/approval-steps')
@UseGuards(ClerkAuthGuard)
export class ApprovalStepController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @CanRead('approval_step')
  @ApiOperation({ summary: 'Get all approval steps' })
  @ApiResponse({ status: 200, description: 'List of approval steps' })
  async findAll(@Query() filter: ApprovalStepFilterDto) {
    const where: any = {};

    if (filter.requestId) where.requestId = filter.requestId;
    if (filter.approverProfileId)
      where.approverProfileId = filter.approverProfileId;
    if (filter.status) where.status = filter.status;

    return this.prisma.approvalStep.findMany({
      where,
      include: {
        request: true,
        approver: true,
      },
      orderBy: [{ requestId: 'asc' }, { sequence: 'asc' }],
    });
  }

  @Get('request/:requestId')
  @CanRead('approval_step')
  @ApiOperation({ summary: 'Get approval steps for a specific request' })
  @ApiResponse({
    status: 200,
    description: 'List of approval steps for the request',
  })
  async findByRequest(@Param('requestId') requestId: string) {
    return this.prisma.approvalStep.findMany({
      where: { requestId },
      include: {
        approver: true,
      },
      orderBy: {
        sequence: 'asc',
      },
    });
  }

  @Get(':id')
  @CanRead('approval_step')
  @ApiOperation({ summary: 'Get approval step by ID' })
  @ApiResponse({ status: 200, description: 'Approval step details' })
  @ApiResponse({ status: 404, description: 'Approval step not found' })
  async findOne(@Param('id') id: string) {
    const step = await this.prisma.approvalStep.findUnique({
      where: { id },
      include: {
        request: true,
        approver: true,
      },
    });

    if (!step) {
      throw new Error('Approval step not found');
    }

    return step;
  }

  @Post('request/:requestId/step/:stepId/process')
  @CanUpdate('approval_step')
  @ApiOperation({ summary: 'Process an approval step (approve/reject/return)' })
  @ApiResponse({ status: 200, description: 'Approval processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Step not found' })
  async processApproval(
    @Param('requestId') requestId: string,
    @Param('stepId') stepId: string,
    @Body() dto: ProcessApprovalDto,
    @Req() req: any,
  ) {
    const userProfile = await this.getUserProfile(req.user.clerkId);
    return this.workflowService.processApproval(
      requestId,
      stepId,
      dto,
      userProfile.id,
    );
  }

  @Get('my-pending')
  @ApiOperation({ summary: 'Get pending approval steps for current user' })
  @ApiResponse({ status: 200, description: 'List of pending approval steps' })
  async getMyPendingSteps(@Req() req: any) {
    const userProfile = await this.getUserProfile(req.user.clerkId);

    return this.prisma.approvalStep.findMany({
      where: {
        approverProfileId: userProfile.id,
        status: 'WAITING',
        request: {
          status: {
            in: ['PENDING', 'IN_PROGRESS'],
          },
        },
      },
      include: {
        request: {
          include: {
            requester: true,
            attachments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  @Get('history/:approverProfileId')
  @CanRead('approval_step')
  @ApiOperation({ summary: 'Get approval history for a specific approver' })
  @ApiResponse({ status: 200, description: 'List of processed approvals' })
  async getApprovalHistory(
    @Param('approverProfileId') approverProfileId: string,
  ) {
    return this.prisma.approvalStep.findMany({
      where: {
        approverProfileId,
        status: {
          in: ['APPROVED', 'REJECTED'],
        },
      },
      include: {
        request: {
          include: {
            requester: true,
          },
        },
      },
      orderBy: {
        approvedAt: 'desc',
      },
    });
  }

  private async getUserProfile(clerkId: string) {
    const userProfile = await this.prisma.userProfile.findFirst({
      where: { clerkUserId: clerkId },
    });

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    return userProfile;
  }
}
