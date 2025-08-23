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
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { ModuleService } from '../services/module.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateModuleDto,
  UpdateModuleDto,
  ModuleResponseDto,
  ModuleCategory,
} from '../dto/module.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { RequirePermission } from '../../permission/decorators/permission.decorator';
import { PermissionAction } from '@prisma/client';

@ApiTags('Module Management')
@ApiBearerAuth()
@Controller('v1/modules')
@UseGuards(ClerkAuthGuard)
export class ModuleController {
  constructor(
    private readonly moduleService: ModuleService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @RequirePermission('modules', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Create a new module' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Module created successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Module with the same code already exists',
  })
  async create(@Body() createModuleDto: CreateModuleDto) {
    return this.moduleService.create(createModuleDto);
  }

  @Get()
  @RequirePermission('modules', PermissionAction.READ)
  @ApiOperation({ summary: 'Get all modules' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ModuleCategory,
    description: 'Filter by module category',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    description: 'Filter by parent ID (use "null" for root modules)',
  })
  @ApiQuery({
    name: 'isVisible',
    required: false,
    type: Boolean,
    description: 'Filter by visibility',
  })
  @ApiQuery({
    name: 'includeChildren',
    required: false,
    type: Boolean,
    description: 'Include children modules',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 50, max: 100)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of modules',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ModuleResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('category') category?: ModuleCategory,
    @Query('parentId') parentId?: string,
    @Query('isVisible') isVisible?: string,
    @Query('includeChildren') includeChildren?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const params: any = {};

    if (isActive !== undefined) {
      params.isActive = isActive === 'true';
    }
    if (category) params.category = category;
    if (parentId !== undefined) params.parentId = parentId;
    if (isVisible !== undefined) {
      params.isVisible = isVisible === 'true';
    }
    if (includeChildren !== undefined) {
      params.includeChildren = includeChildren === 'true';
    }

    // Parse pagination parameters
    if (page) {
      params.page = parseInt(page, 10) || 1;
    }
    if (limit) {
      const parsedLimit = parseInt(limit, 10) || 50;
      params.limit = Math.min(parsedLimit, 100); // Max 100 items per page
    }

    return this.moduleService.findAll(params);
  }

  @Get('tree')
  @RequirePermission('modules', PermissionAction.READ)
  @ApiOperation({ summary: 'Get module hierarchy tree' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module hierarchy tree',
    type: [ModuleResponseDto],
  })
  async getModuleTree() {
    return this.moduleService.getModuleTree();
  }

  @Get('accessible')
  @ApiOperation({ summary: 'Get modules accessible by current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of accessible modules',
    type: [ModuleResponseDto],
  })
  async getUserAccessibleModules(@CurrentUser() user: any) {
    // Get user profile by clerk ID
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { clerkUserId: user.userId },
    });

    if (!userProfile) {
      throw new NotFoundException('User profile not found');
    }

    return this.moduleService.getUserAccessibleModules(userProfile.id);
  }

  @Get('by-code/:code')
  @RequirePermission('modules', PermissionAction.READ)
  @ApiOperation({ summary: 'Get module by code' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module details',
    type: ModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  async findByCode(@Param('code') code: string) {
    return this.moduleService.findByCode(code);
  }

  @Get(':id')
  @RequirePermission('modules', PermissionAction.READ)
  @ApiOperation({ summary: 'Get module by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module details',
    type: ModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.moduleService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('modules', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Update module' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module updated successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateModuleDto: UpdateModuleDto,
  ) {
    return this.moduleService.update(id, updateModuleDto);
  }

  @Delete(':id')
  @RequirePermission('modules', PermissionAction.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete module' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Module soft deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete module with children or active access rules',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() body?: { reason?: string },
  ) {
    await this.moduleService.remove(id, user?.userId, body?.reason);
  }

  @Post(':id/restore')
  @RequirePermission('modules', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Restore soft-deleted module' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module restored successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Module is not deleted',
  })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() body?: { reason?: string },
  ) {
    return this.moduleService.restore(id, user?.userId, body?.reason);
  }

  @Delete(':id/hard')
  @RequirePermission('modules', PermissionAction.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete module' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Module permanently deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Module must be soft-deleted first',
  })
  async hardDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.moduleService.hardDelete(id, user?.userId);
  }

  @Get(':id/history')
  @RequirePermission('modules', PermissionAction.READ)
  @ApiOperation({ summary: 'Get module change history' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module change history',
    type: [Object],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
  ) {
    return this.moduleService.getModuleHistory(id, limit);
  }

  @Post('bulk-update')
  @RequirePermission('modules', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Bulk update modules' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk operation ID',
    type: String,
  })
  async bulkUpdate(
    @Body() updates: Array<{ id: string; data: UpdateModuleDto }>,
    @CurrentUser() user: any,
  ) {
    return this.moduleService.bulkUpdateModules(updates, user?.userId);
  }

  @Get('bulk-operation/:operationId')
  @RequirePermission('modules', PermissionAction.READ)
  @ApiOperation({ summary: 'Get bulk operation progress' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk operation progress',
    type: Object,
  })
  async getBulkOperationProgress(@Param('operationId') operationId: string) {
    return this.moduleService.getBulkOperationProgress(operationId);
  }

  @Post('bulk-operation/:operationId/rollback')
  @RequirePermission('modules', PermissionAction.UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rollback bulk operation' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Operation rolled back successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Operation not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No rollback data available',
  })
  async rollbackBulkOperation(
    @Param('operationId') operationId: string,
    @CurrentUser() user: any,
  ) {
    await this.moduleService.rollbackBulkOperation(operationId, user?.userId);
  }

  @Post('reorder')
  @RequirePermission('modules', PermissionAction.UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder modules' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Modules reordered successfully',
  })
  async reorderModules(
    @Body() modules: Array<{ id: string; sortOrder: number }>,
  ) {
    if (!Array.isArray(modules) || modules.length === 0) {
      throw new BadRequestException('Invalid modules array');
    }

    await this.moduleService.reorderModules(modules);
  }
}
