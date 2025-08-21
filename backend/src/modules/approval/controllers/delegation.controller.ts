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
import { CanCreate, CanRead, CanUpdate, RequirePermission } from '../../permission/decorators/permission.decorator';
import { PermissionAction } from '@prisma/client';
import { DelegationService } from '../services/delegation.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateDelegationDto,
  UpdateDelegationDto,
  DelegationFilterDto,
} from '../dto/delegation.dto';

@ApiTags('Approval Delegations')
@ApiBearerAuth()
@Controller('api/v1/approval-delegations')
@UseGuards(ClerkAuthGuard)
export class DelegationController {
  constructor(
    private readonly delegationService: DelegationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @CanCreate('approval_delegation')
  @ApiOperation({ summary: 'Create a new approval delegation' })
  @ApiResponse({ status: 201, description: 'Delegation created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Conflict - overlapping delegation' })
  async create(@Body() dto: CreateDelegationDto, @Req() req: any) {
    const userProfile = await this.getUserProfile(req.user.clerkId);
    return this.delegationService.create(dto, userProfile.id, req.user.clerkId);
  }

  @Get()
  @CanRead('approval_delegation')
  @ApiOperation({ summary: 'Get all approval delegations' })
  @ApiResponse({ status: 200, description: 'List of approval delegations' })
  async findAll(@Query() filter: DelegationFilterDto) {
    return this.delegationService.findAll(filter);
  }

  @Get('my-delegations')
  @ApiOperation({ summary: 'Get my delegations (as delegator and delegate)' })
  @ApiResponse({ status: 200, description: 'My delegations' })
  async findMyDelegations(@Req() req: any) {
    const userProfile = await this.getUserProfile(req.user.clerkId);
    return this.delegationService.findMyDelegations(userProfile.id);
  }

  @Get('active')
  @CanRead('approval_delegation')
  @ApiOperation({ summary: 'Get currently active delegations' })
  @ApiResponse({ status: 200, description: 'List of active delegations' })
  async findActive() {
    const now = new Date();
    return this.delegationService.findAll({
      isActive: true,
      activeOn: now.toISOString(),
    });
  }

  @Get(':id')
  @CanRead('approval_delegation')
  @ApiOperation({ summary: 'Get delegation by ID' })
  @ApiResponse({ status: 200, description: 'Delegation details' })
  @ApiResponse({ status: 404, description: 'Delegation not found' })
  async findOne(@Param('id') id: string) {
    return this.delegationService.findOne(id);
  }

  @Patch(':id')
  @CanUpdate('approval_delegation')
  @ApiOperation({ summary: 'Update delegation' })
  @ApiResponse({ status: 200, description: 'Delegation updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Delegation not found' })
  @ApiResponse({ status: 409, description: 'Conflict - overlapping delegation' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDelegationDto,
    @Req() req: any,
  ) {
    const userProfile = await this.getUserProfile(req.user.clerkId);
    return this.delegationService.update(id, dto, userProfile.id);
  }

  @Post(':id/revoke')
  @CanUpdate('approval_delegation')
  @ApiOperation({ summary: 'Revoke a delegation' })
  @ApiResponse({ status: 200, description: 'Delegation revoked successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Delegation not found' })
  async revoke(@Param('id') id: string, @Req() req: any) {
    const userProfile = await this.getUserProfile(req.user.clerkId);
    return this.delegationService.revoke(id, userProfile.id);
  }

  @Post('cleanup-expired')
  @RequirePermission('approval_delegation', PermissionAction.DELETE)
  @ApiOperation({ summary: 'Cleanup expired delegations' })
  @ApiResponse({ status: 200, description: 'Expired delegations cleaned up' })
  async cleanupExpired() {
    const count = await this.delegationService.cleanupExpiredDelegations();
    return { message: `${count} expired delegations cleaned up` };
  }

  @Get('check/:delegatorId/:delegateId')
  @CanRead('approval_delegation')
  @ApiOperation({ summary: 'Check if a delegation is active between two users' })
  @ApiResponse({ status: 200, description: 'Delegation status' })
  async checkDelegation(
    @Param('delegatorId') delegatorId: string,
    @Param('delegateId') delegateId: string,
    @Query('module') module?: string,
  ) {
    const delegation = await this.delegationService.getActiveDelegation(
      delegatorId,
      delegateId,
      module,
    );

    return {
      isActive: !!delegation,
      delegation,
    };
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