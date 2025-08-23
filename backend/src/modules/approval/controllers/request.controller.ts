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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import {
  CanCreate,
  CanRead,
  CanUpdate,
} from '../../permission/decorators/permission.decorator';
import { RequestService } from '../services/request.service';
import { WorkflowService } from '../services/workflow.service';
import {
  CreateRequestDto,
  UpdateRequestDto,
  CancelRequestDto,
  RequestFilterDto,
  RequestQueryDto,
} from '../dto/request.dto';
import { PaginationResponseDto } from '../../../common/dto/pagination.dto';

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
  @ApiOperation({ summary: 'Get all approval requests with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of approval requests',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'module', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'requestType', required: false, type: String })
  async findAll(@Query() query: RequestQueryDto) {
    return this.requestService.findAllWithQuery(query);
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get my approval requests with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of my approval requests',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'module', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'requestType', required: false, type: String })
  async findMyRequests(@Query() query: RequestQueryDto, @Req() req: any) {
    const userProfile = await this.getUserProfile(req.user.clerkId);
    return this.requestService.findMyRequestsWithQuery(userProfile.id, query);
  }

  @Get('pending-approvals')
  @ApiOperation({
    summary: 'Get pending approvals for current user with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of pending approvals',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, default: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  async findPendingApprovals(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Req() req?: any,
  ) {
    const userProfile = await this.getUserProfile(req.user.clerkId);
    return this.requestService.findPendingApprovalsWithPagination(
      userProfile.id,
      page || 1,
      limit || 20,
    );
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
