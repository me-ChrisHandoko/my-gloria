import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { PermissionGuard } from '../../permission/guards/permission.guard';
import { RequirePermission } from '../../permission/decorators/permission.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserProfile, PermissionAction } from '@prisma/client';
import { EnhancedTemplateService } from '../services/enhanced-template.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  PreviewTemplateDto,
  RenderTemplateDto,
  TemplateResponseDto,
  RenderedTemplateResponseDto,
} from '../dto/template.dto';

@ApiTags('notification-templates')
@ApiBearerAuth()
@Controller('notification/templates')
@UseGuards(ClerkAuthGuard, PermissionGuard)
export class TemplateController {
  constructor(private readonly templateService: EnhancedTemplateService) {}

  @Get()
  @RequirePermission('notification_template', PermissionAction.READ)
  @ApiOperation({ summary: 'Get all notification templates' })
  @ApiResponse({
    status: 200,
    description: 'List of all notification templates',
    type: [TemplateResponseDto],
  })
  async getAllTemplates(): Promise<TemplateResponseDto[]> {
    const templates = this.templateService.getAllTemplates();
    return templates.map((template) => ({
      id: template.id,
      type: template.type,
      name: template.name,
      description: template.description,
      supportedLocales: Object.keys(template.subject),
      variables: template.variables,
      metadata: template.metadata,
      abTesting: template.abTesting,
      active: template.active,
    }));
  }

  @Get('locales')
  @RequirePermission('notification_template', PermissionAction.READ)
  @ApiOperation({ summary: 'Get supported locales' })
  @ApiResponse({
    status: 200,
    description: 'List of supported locales',
    type: [String],
  })
  getSupportedLocales(): string[] {
    return this.templateService.getSupportedLocales();
  }

  @Get(':id')
  @RequirePermission('notification_template', PermissionAction.READ)
  @ApiOperation({ summary: 'Get a specific notification template' })
  @ApiResponse({
    status: 200,
    description: 'The notification template',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async getTemplate(@Param('id') id: string): Promise<TemplateResponseDto> {
    const template = this.templateService.getTemplate(id);
    if (!template) {
      throw new BadRequestException(`Template not found: ${id}`);
    }

    return {
      id: template.id,
      type: template.type,
      name: template.name,
      description: template.description,
      supportedLocales: Object.keys(template.subject),
      variables: template.variables,
      metadata: template.metadata,
      abTesting: template.abTesting,
      active: template.active,
    };
  }

  @Post()
  @RequirePermission('notification_template', PermissionAction.CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new notification template' })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
  })
  async createTemplate(
    @Body() createDto: CreateTemplateDto,
    @CurrentUser() user: UserProfile,
  ): Promise<void> {
    const template = {
      ...createDto,
      metadata: {
        version: 1,
        author: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: createDto.tags || [],
      },
    };

    await this.templateService.createTemplate(template);
  }

  @Put(':id')
  @RequirePermission('notification_template', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Update a notification template' })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateDto: UpdateTemplateDto,
    @CurrentUser() user: UserProfile,
  ): Promise<void> {
    const existingTemplate = await this.templateService.getTemplate(id);
    if (!existingTemplate) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    
    await this.templateService.updateTemplate(id, {
      ...updateDto,
      metadata: {
        ...existingTemplate.metadata,
        ...updateDto.metadata,
        author: user.id,
        updatedAt: new Date(),
        version: (existingTemplate.metadata?.version || 0) + 1,
        createdAt: existingTemplate.metadata?.createdAt || new Date(),
      },
    });
  }

  @Post(':id/preview')
  @RequirePermission('notification_template', PermissionAction.READ)
  @ApiOperation({ summary: 'Preview a notification template' })
  @ApiResponse({
    status: 200,
    description: 'Rendered template preview',
    type: RenderedTemplateResponseDto,
  })
  async previewTemplate(
    @Param('id') id: string,
    @Body() previewDto: PreviewTemplateDto,
  ): Promise<RenderedTemplateResponseDto> {
    const result = await this.templateService.previewTemplate({
      templateId: id,
      locale: previewDto.locale,
      sampleData: previewDto.sampleData,
      format: previewDto.format,
      variant: previewDto.variant,
    });

    return {
      subject: result.subject,
      body: result.body,
      html: result.html,
      mjml: result.mjml,
      variant: result.variant,
      locale: result.locale,
      metadata: result.metadata,
    };
  }

  @Post(':id/render')
  @RequirePermission('notification', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Render a notification template' })
  @ApiResponse({
    status: 200,
    description: 'Rendered template',
    type: RenderedTemplateResponseDto,
  })
  async renderTemplate(
    @Param('id') id: string,
    @Body() renderDto: RenderTemplateDto,
    @CurrentUser() user: UserProfile,
  ): Promise<RenderedTemplateResponseDto> {
    const result = await this.templateService.renderTemplate(id, {
      locale: renderDto.locale,
      variables: renderDto.variables,
      format: renderDto.format,
      variant: renderDto.variant,
      userId: renderDto.useUserBasedABTesting ? user.id : undefined,
    });

    return {
      subject: result.subject,
      body: result.body,
      html: result.html,
      mjml: result.mjml,
      variant: result.variant,
      locale: result.locale,
      metadata: result.metadata,
    };
  }
}

// Add missing import
import { BadRequestException } from '@nestjs/common';
