import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { CanCreate, CanRead, CanUpdate } from '../../permission/decorators/permission.decorator';
import { RequestService } from '../services/request.service';
import { WorkflowService } from '../services/workflow.service';
import {
  CreateRequestDto,
  UpdateRequestDto,
  CancelRequestDto,
  RequestFilterDto,
} from '../dto/request.dto';

@ApiTags('Approval Requests')
@ApiBearerAuth()
@Controller('api/v1/approval-requests')
@UseGuards(ClerkAuthGuard)
export class RequestController {
  constructor(
    private readonly requestService: RequestService,
    private readonly workflowService: WorkflowService,
  ) {}

  @Post()
  @CanCreate('approval_request')
  @ApiOperation({ summary: 'Create a new approval request' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'No approval matrix found' })
  async create(@Body() dto: CreateRequestDto, @Req() req: any) {
    const userProfile = await this.getUserProfile(req.user.clerkId);
    return this.workflowService.initiateWorkflow(dto, userProfile.id);
  }

  @Get()
  @CanRead('approval_request')
  @ApiOperation({ summary: 'Get all approval requests' })
  @ApiResponse({ status: 200, description: 'List of approval requests' })
  async findAll(@Query() filter: RequestFilterDto) {
    return this.requestService.findAll(filter);
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get my approval requests' })
  @ApiResponse({ status: 200, description: 'List of my approval requests' })
  async findMyRequests(@Query() filter: RequestFilterDto, @Req() req: any) {
    const userProfile = await this.getUserProfile(req.user.clerkId);
    return this.requestService.findMyRequests(userProfile.id, filter);
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: 'Get pending approvals for current user' })
  @ApiResponse({ status: 200, description: 'List of pending approvals' })
  async findPendingApprovals(@Req() req: any) {
    const userProfile = await this.getUserProfile(req.user.clerkId);
    return this.requestService.findPendingApprovals(userProfile.id);
  }

  @Get(':id')
  @CanRead('approval_request')
  @ApiOperation({ summary: 'Get approval request by ID' })
  @ApiResponse({ status: 200, description: 'Approval request details' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async findOne(@Param('id') id: string) {
    return this.requestService.findOne(id);
  }

  @Get('by-number/:requestNumber')
  @CanRead('approval_request')
  @ApiOperation({ summary: 'Get approval request by request number' })
  @ApiResponse({ status: 200, description: 'Approval request details' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async findByRequestNumber(@Param('requestNumber') requestNumber: string) {
    return this.requestService.findByRequestNumber(requestNumber);
  }

  @Patch(':id')
  @CanUpdate('approval_request')
  @ApiOperation({ summary: 'Update approval request' })
  @ApiResponse({ status: 200, description: 'Request updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRequestDto,
    @Req() req: any,
  ) {
    const userProfile = await this.getUserProfile(req.user.clerkId);
    return this.requestService.update(id, dto, userProfile.id);
  }

  @Post(':id/cancel')
  @CanUpdate('approval_request')
  @ApiOperation({ summary: 'Cancel approval request' })
  @ApiResponse({ status: 200, description: 'Request cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelRequestDto,
    @Req() req: any,
  ) {
    const userProfile = await this.getUserProfile(req.user.clerkId);
    return this.requestService.cancel(id, dto, userProfile.id);
  }

  private async getUserProfile(clerkId: string) {
    // This should be implemented in a user service
    // For now, we'll use a simple query
    const { PrismaService } = require('../../../prisma/prisma.service');
    const prisma = new PrismaService();
    
    const userProfile = await prisma.userProfile.findFirst({
      where: { clerkUserId: clerkId },
    });

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    return userProfile;
  }
}