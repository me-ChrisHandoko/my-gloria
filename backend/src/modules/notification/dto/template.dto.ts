import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsObject,
  IsArray,
  IsEnum,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsDate,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '../enums/notification.enum';

export class TemplateVariableDto {
  @ApiProperty({ description: 'Variable name' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Variable type',
    enum: ['string', 'number', 'boolean', 'date', 'array', 'object'],
  })
  @IsEnum(['string', 'number', 'boolean', 'date', 'array', 'object'])
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

  @ApiProperty({ description: 'Is the variable required' })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ description: 'Variable description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Default value for the variable' })
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional({ description: 'Format for dates, numbers, etc.' })
  @IsString()
  @IsOptional()
  format?: string;

  @ApiPropertyOptional({ description: 'Validation rules' })
  @IsObject()
  @IsOptional()
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

export class ABTestVariantDto {
  @ApiProperty({ description: 'Variant ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Variant name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Variant weight (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;

  @ApiPropertyOptional({ description: 'Variant subject lines by locale' })
  @IsObject()
  @IsOptional()
  subject?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Variant body content by locale' })
  @IsObject()
  @IsOptional()
  body?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Variant MJML templates by locale' })
  @IsObject()
  @IsOptional()
  mjmlTemplate?: Record<string, string>;
}

export class ABTestingConfigDto {
  @ApiProperty({ description: 'Is A/B testing enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'A/B test variants', type: [ABTestVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ABTestVariantDto)
  variants: ABTestVariantDto[];

  @ApiProperty({
    description: 'Distribution method',
    enum: ['random', 'weighted', 'user-based'],
  })
  @IsEnum(['random', 'weighted', 'user-based'])
  distribution: 'random' | 'weighted' | 'user-based';

  @ApiPropertyOptional({ description: 'A/B test start date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'A/B test end date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Metrics to track', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  metrics?: string[];
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Subject lines by locale' })
  @IsObject()
  subject: Record<string, string>;

  @ApiProperty({ description: 'Body content by locale' })
  @IsObject()
  body: Record<string, string>;

  @ApiPropertyOptional({ description: 'MJML templates by locale' })
  @IsObject()
  @IsOptional()
  mjmlTemplate?: Record<string, string>;

  @ApiProperty({
    description: 'Template variables',
    type: [TemplateVariableDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables: TemplateVariableDto[];

  @ApiPropertyOptional({ description: 'A/B testing configuration' })
  @ValidateNested()
  @Type(() => ABTestingConfigDto)
  @IsOptional()
  abTesting?: ABTestingConfigDto;

  @ApiProperty({ description: 'Is the template active' })
  @IsBoolean()
  active: boolean;

  @ApiPropertyOptional({ description: 'Template tags', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Subject lines by locale' })
  @IsObject()
  @IsOptional()
  subject?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Body content by locale' })
  @IsObject()
  @IsOptional()
  body?: Record<string, string>;

  @ApiPropertyOptional({ description: 'MJML templates by locale' })
  @IsObject()
  @IsOptional()
  mjmlTemplate?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Template variables',
    type: [TemplateVariableDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  @IsOptional()
  variables?: TemplateVariableDto[];

  @ApiPropertyOptional({ description: 'A/B testing configuration' })
  @ValidateNested()
  @Type(() => ABTestingConfigDto)
  @IsOptional()
  abTesting?: ABTestingConfigDto;

  @ApiPropertyOptional({ description: 'Is the template active' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Template metadata' })
  @IsObject()
  @IsOptional()
  metadata?: {
    tags?: string[];
  };
}

export class PreviewTemplateDto {
  @ApiProperty({ description: 'Locale for preview' })
  @IsString()
  locale: string;

  @ApiPropertyOptional({ description: 'Sample data for preview' })
  @IsObject()
  @IsOptional()
  sampleData?: Record<string, any>;

  @ApiProperty({
    description: 'Output format',
    enum: ['text', 'html', 'mjml'],
  })
  @IsEnum(['text', 'html', 'mjml'])
  format: 'text' | 'html' | 'mjml';

  @ApiPropertyOptional({ description: 'A/B test variant ID' })
  @IsString()
  @IsOptional()
  variant?: string;
}

export class RenderTemplateDto {
  @ApiProperty({ description: 'Locale for rendering' })
  @IsString()
  locale: string;

  @ApiProperty({ description: 'Template variables' })
  @IsObject()
  variables: Record<string, any>;

  @ApiProperty({
    description: 'Output format',
    enum: ['text', 'html', 'mjml'],
  })
  @IsEnum(['text', 'html', 'mjml'])
  format: 'text' | 'html' | 'mjml';

  @ApiPropertyOptional({ description: 'A/B test variant ID' })
  @IsString()
  @IsOptional()
  variant?: string;

  @ApiPropertyOptional({ description: 'Use user-based A/B testing' })
  @IsBoolean()
  @IsOptional()
  useUserBasedABTesting?: boolean;
}

export class TemplateResponseDto {
  @ApiProperty({ description: 'Template ID' })
  id: string;

  @ApiProperty({ description: 'Notification type' })
  type: NotificationType;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  description?: string;

  @ApiProperty({ description: 'Supported locales', type: [String] })
  supportedLocales: string[];

  @ApiProperty({
    description: 'Template variables',
    type: [TemplateVariableDto],
  })
  variables: TemplateVariableDto[];

  @ApiPropertyOptional({ description: 'Template metadata' })
  metadata?: {
    version: number;
    author?: string;
    createdAt: Date;
    updatedAt: Date;
    tags?: string[];
  };

  @ApiPropertyOptional({ description: 'A/B testing configuration' })
  abTesting?: ABTestingConfigDto;

  @ApiProperty({ description: 'Is the template active' })
  active: boolean;
}

export class RenderedTemplateResponseDto {
  @ApiProperty({ description: 'Rendered subject' })
  subject: string;

  @ApiProperty({ description: 'Rendered body' })
  body: string;

  @ApiPropertyOptional({ description: 'Rendered HTML' })
  html?: string;

  @ApiPropertyOptional({ description: 'MJML source' })
  mjml?: string;

  @ApiPropertyOptional({ description: 'A/B test variant used' })
  variant?: string;

  @ApiProperty({ description: 'Locale used' })
  locale: string;

  @ApiPropertyOptional({ description: 'Render metadata' })
  metadata?: {
    renderTime: number;
    templateId: string;
    templateVersion: number;
  };
}
