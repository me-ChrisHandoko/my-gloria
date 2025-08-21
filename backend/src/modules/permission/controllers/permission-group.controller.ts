import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { PermissionGroupService } from '../services/permission-group.service';
import { CreatePermissionGroupDto, UpdatePermissionGroupDto } from '../dto/permission-group.dto';

@ApiTags('Permission Groups')
@Controller('v1/permission-groups')
@UseGuards(ClerkAuthGuard)
export class PermissionGroupController {
  constructor(private readonly permissionGroupService: PermissionGroupService) {}

  @Get()
  @ApiOperation({ summary: 'Get all permission groups' })
  @ApiResponse({ status: 200, description: 'Returns all permission groups' })
  async findAll() {
    return this.permissionGroupService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get permission group by ID' })
  @ApiResponse({ status: 200, description: 'Returns a permission group' })
  @ApiResponse({ status: 404, description: 'Permission group not found' })
  async findOne(@Param('id') id: string) {
    return this.permissionGroupService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new permission group' })
  @ApiResponse({ status: 201, description: 'Permission group created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createDto: CreatePermissionGroupDto) {
    return this.permissionGroupService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update permission group' })
  @ApiResponse({ status: 200, description: 'Permission group updated successfully' })
  @ApiResponse({ status: 404, description: 'Permission group not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePermissionGroupDto,
  ) {
    return this.permissionGroupService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete permission group' })
  @ApiResponse({ status: 200, description: 'Permission group deleted successfully' })
  @ApiResponse({ status: 404, description: 'Permission group not found' })
  async remove(@Param('id') id: string) {
    return this.permissionGroupService.remove(id);
  }
}