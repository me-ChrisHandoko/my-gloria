import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { PermissionDelegationService } from '../services/permission-delegation.service';
import { CreateDelegationDto, RevokeDelegationDto } from '../dto/delegation';
import { RequirePermission } from '../decorators/permission.decorator';

@ApiTags('Permission Delegation')
@ApiBearerAuth()
@Controller('permission-delegations')
@UseGuards(ClerkAuthGuard)
export class PermissionDelegationController {
  constructor(private readonly delegationService: PermissionDelegationService) {}

  @Post()
  @RequirePermission('permission.delegation.create')
  @ApiOperation({ summary: 'Create a new permission delegation' })
  @ApiResponse({ status: 201, description: 'Delegation created successfully' })
  async create(
    @Body() dto: CreateDelegationDto,
    @CurrentUser() user: any,
  ) {
    return this.delegationService.create(user.profileId, dto);
  }

  @Get()
  @RequirePermission('permission.delegation.read')
  @ApiOperation({ summary: 'Get all delegations' })
  @ApiQuery({ name: 'delegatorId', required: false })
  @ApiQuery({ name: 'delegateId', required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiQuery({ name: 'includeExpired', type: Boolean, required: false })
  async findAll(
    @Query('delegatorId') delegatorId?: string,
    @Query('delegateId') delegateId?: string,
    @Query('isActive') isActive?: string,
    @Query('includeExpired') includeExpired?: string,
  ) {
    return this.delegationService.findAll({
      delegatorId,
      delegateId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      includeExpired: includeExpired === 'true',
    });
  }

  @Get('my-delegations')
  @ApiOperation({ summary: 'Get delegations created by current user' })
  async getMyDelegations(@CurrentUser() user: any) {
    return this.delegationService.getMyDelegations(user.profileId);
  }

  @Get('delegated-to-me')
  @ApiOperation({ summary: 'Get delegations assigned to current user' })
  async getDelegationsToMe(@CurrentUser() user: any) {
    return this.delegationService.getDelegationsToMe(user.profileId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active delegations for current user' })
  async getActiveDelegations(@CurrentUser() user: any) {
    return this.delegationService.getActiveDelegations(user.profileId);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Get all delegated permissions for current user' })
  async getDelegatedPermissions(@CurrentUser() user: any) {
    const permissions = await this.delegationService.getDelegatedPermissions(user.profileId);
    return { permissions };
  }

  @Get(':id')
  @RequirePermission('permission.delegation.read')
  @ApiOperation({ summary: 'Get a delegation by ID' })
  async findOne(@Param('id') id: string) {
    return this.delegationService.findOne(id);
  }

  @Post('revoke')
  @RequirePermission('permission.delegation.revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a delegation' })
  async revoke(
    @Body() dto: RevokeDelegationDto,
    @CurrentUser() user: any,
  ) {
    return this.delegationService.revoke(user.profileId, dto);
  }

  @Post(':id/extend')
  @RequirePermission('permission.delegation.update')
  @ApiOperation({ summary: 'Extend a delegation expiry date' })
  async extend(
    @Param('id') id: string,
    @Body('validUntil') validUntil: string,
    @CurrentUser() user: any,
  ) {
    return this.delegationService.extendDelegation(
      id,
      new Date(validUntil),
      user.profileId,
    );
  }

  @Post('cleanup-expired')
  @RequirePermission('permission.delegation.admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean up expired delegations' })
  async cleanupExpired() {
    return this.delegationService.cleanupExpiredDelegations();
  }
}