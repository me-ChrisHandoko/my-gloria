import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PermissionService } from '../services/permission.service';
import { CreatePermissionDto } from '../dto/permission/create-permission.dto';
import { UpdatePermissionDto } from '../dto/permission/update-permission.dto';
import {
  CheckPermissionDto,
  PermissionCheckResultDto,
} from '../dto/permission/check-permission.dto';
import {
  BatchCheckPermissionDto,
  BatchPermissionCheckResultDto,
} from '../dto/permission/batch-check-permission.dto';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { AuditInterceptor } from '../../../middleware/security.middleware';
import { Audit } from '../../../middleware/security.middleware';
import { PermissionAction, PermissionScope } from '@prisma/client';
import { RateLimit } from '../../../middleware/rate-limit.fastify.middleware';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(AuditInterceptor)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  @ApiResponse({ status: 409, description: 'Permission already exists' })
  @Audit('CREATE', 'Permission')
  async create(
    @Body() createPermissionDto: CreatePermissionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.clerkUserId;
    return this.permissionService.create(createPermissionDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'List of permissions' })
  async findAll(
    @Query('resource') resource?: string,
    @Query('action') action?: PermissionAction,
    @Query('scope') scope?: PermissionScope,
    @Query('groupId') groupId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.permissionService.findAll({
      resource,
      action,
      scope,
      groupId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiResponse({ status: 200, description: 'Permission details' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async findOne(@Param('id') id: string) {
    return this.permissionService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get permission by code' })
  @ApiResponse({ status: 200, description: 'Permission details' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async findByCode(@Param('code') code: string) {
    return this.permissionService.findByCode(code);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update permission' })
  @ApiResponse({ status: 200, description: 'Permission updated successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({ status: 400, description: 'Cannot modify system permission' })
  @Audit('UPDATE', 'Permission')
  async update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.clerkUserId;
    return this.permissionService.update(id, updatePermissionDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete permission' })
  @ApiResponse({ status: 204, description: 'Permission deleted successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete system permission' })
  @Audit('DELETE', 'Permission')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.clerkUserId;
    await this.permissionService.remove(id, userId);
  }

  @Post('check')
  @ApiOperation({ summary: 'Check if user has permission' })
  @ApiResponse({
    status: 200,
    description: 'Permission check result',
    type: PermissionCheckResultDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Too many permission check requests',
  })
  @RateLimit({
    max: 100,
    timeWindow: '1 minute',
    message: 'Too many permission check requests. Please try again later.',
    keyGenerator: (request: any) => {
      const userId = request.user?.clerkUserId || 'anonymous';
      return `permission-check:${request.ip}:${userId}`;
    },
  })
  async checkPermission(
    @Body() checkPermissionDto: CheckPermissionDto,
  ): Promise<PermissionCheckResultDto> {
    return this.permissionService.checkPermission(checkPermissionDto);
  }

  @Post('batch-check')
  @ApiOperation({ summary: 'Check multiple permissions for a user' })
  @ApiResponse({
    status: 200,
    description: 'Batch permission check results',
    type: BatchPermissionCheckResultDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Too many batch permission check requests',
  })
  @RateLimit({
    max: 50,
    timeWindow: '1 minute',
    message: 'Too many batch permission check requests. Please try again later.',
    keyGenerator: (request: any) => {
      const userId = request.user?.clerkUserId || 'anonymous';
      return `permission-batch-check:${request.ip}:${userId}`;
    },
  })
  async batchCheckPermissions(
    @Body() batchCheckDto: BatchCheckPermissionDto,
  ): Promise<BatchPermissionCheckResultDto> {
    return this.permissionService.batchCheckPermissions(batchCheckDto);
  }
}
