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
  ParseBoolPipe,
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
import {
  RequirePermission,
  CanCreate,
  CanRead,
  CanUpdate,
  CanDelete,
} from '../../permission/decorators/permission.decorator';
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of modules',
    type: [ModuleResponseDto],
  })
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('category') category?: ModuleCategory,
    @Query('parentId') parentId?: string,
    @Query('isVisible') isVisible?: string,
    @Query('includeChildren') includeChildren?: string,
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
  @ApiOperation({ summary: 'Delete module' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Module deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete module with children or active access rules',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.moduleService.remove(id);
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