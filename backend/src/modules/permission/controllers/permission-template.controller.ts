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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { PermissionTemplateService } from '../services/permission-template.service';
import {
  CreatePermissionTemplateDto,
  UpdatePermissionTemplateDto,
  ApplyPermissionTemplateDto,
  RevokePermissionTemplateDto,
  PermissionTemplateCategory,
} from '../dto/permission-template';
import { RequirePermission } from '../decorators/permission.decorator';

@ApiTags('Permission Templates')
@ApiBearerAuth()
@Controller('permission-templates')
@UseGuards(ClerkAuthGuard)
export class PermissionTemplateController {
  constructor(private readonly templateService: PermissionTemplateService) {}

  @Post()
  @RequirePermission('permission.template.create')
  @ApiOperation({ summary: 'Create a new permission template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async create(
    @Body() dto: CreatePermissionTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templateService.create(dto, user.id);
  }

  @Get()
  @RequirePermission('permission.template.read')
  @ApiOperation({ summary: 'Get all permission templates' })
  @ApiQuery({ name: 'category', enum: PermissionTemplateCategory, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiQuery({ name: 'isSystem', type: Boolean, required: false })
  async findAll(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('isSystem') isSystem?: string,
  ) {
    return this.templateService.findAll({
      category,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      isSystem: isSystem === undefined ? undefined : isSystem === 'true',
    });
  }

  @Get(':id')
  @RequirePermission('permission.template.read')
  @ApiOperation({ summary: 'Get a permission template by ID' })
  async findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Put(':id')
  @RequirePermission('permission.template.update')
  @ApiOperation({ summary: 'Update a permission template' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templateService.update(id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermission('permission.template.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a permission template' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.templateService.delete(id, user.id);
  }

  @Post('apply')
  @RequirePermission('permission.template.apply')
  @ApiOperation({ summary: 'Apply a permission template to a role or user' })
  async apply(
    @Body() dto: ApplyPermissionTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templateService.apply(dto, user.id);
  }

  @Post('revoke')
  @RequirePermission('permission.template.revoke')
  @ApiOperation({ summary: 'Revoke a permission template application' })
  async revoke(
    @Body() dto: RevokePermissionTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templateService.revoke(dto, user.id);
  }

  @Get('category/:category')
  @RequirePermission('permission.template.read')
  @ApiOperation({ summary: 'Get templates by category' })
  @ApiParam({ name: 'category', enum: PermissionTemplateCategory })
  async getByCategory(@Param('category') category: string) {
    return this.templateService.getTemplatesByCategory(category);
  }
}