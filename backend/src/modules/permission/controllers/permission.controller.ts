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
  Request,
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
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { PermissionAction, PermissionScope } from '@prisma/client';

@ApiTags('permissions')
@Controller('v1/permissions')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  @ApiResponse({ status: 409, description: 'Permission already exists' })
  async create(
    @Body() createPermissionDto: CreatePermissionDto,
    @Request() req: any,
  ) {
    return this.permissionService.create(createPermissionDto, req.user.userId);
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
  async update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
    @Request() req: any,
  ) {
    return this.permissionService.update(
      id,
      updatePermissionDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete permission' })
  @ApiResponse({ status: 204, description: 'Permission deleted successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete system permission' })
  async remove(@Param('id') id: string, @Request() req: any) {
    await this.permissionService.remove(id, req.user.userId);
  }

  @Post('check')
  @ApiOperation({ summary: 'Check if user has permission' })
  @ApiResponse({
    status: 200,
    description: 'Permission check result',
    type: PermissionCheckResultDto,
  })
  async checkPermission(
    @Body() checkPermissionDto: CheckPermissionDto,
  ): Promise<PermissionCheckResultDto> {
    return this.permissionService.checkPermission(checkPermissionDto);
  }
}
