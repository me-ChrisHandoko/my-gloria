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
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { AuditInterceptor } from '../../../middleware/security.middleware';
import { Audit } from '../../../middleware/security.middleware';
import { PermissionGroupService } from '../services/permission-group.service';
import {
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
} from '../dto/permission-group.dto';

@ApiTags('Permission Groups')
@ApiBearerAuth()
@Controller('permission-groups')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(AuditInterceptor)
export class PermissionGroupController {
  constructor(
    private readonly permissionGroupService: PermissionGroupService,
  ) {}

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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new permission group' })
  @ApiResponse({
    status: 201,
    description: 'Permission group created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @Audit('CREATE', 'PermissionGroup')
  async create(@Body() createDto: CreatePermissionGroupDto, @Req() req: any) {
    return this.permissionGroupService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update permission group' })
  @ApiResponse({
    status: 200,
    description: 'Permission group updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Permission group not found' })
  @Audit('UPDATE', 'PermissionGroup')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePermissionGroupDto,
    @Req() req: any,
  ) {
    return this.permissionGroupService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete permission group' })
  @ApiResponse({
    status: 204,
    description: 'Permission group deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Permission group not found' })
  @Audit('DELETE', 'PermissionGroup')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.permissionGroupService.remove(id);
  }
}
