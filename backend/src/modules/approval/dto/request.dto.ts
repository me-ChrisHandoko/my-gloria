import { IsString, IsObject, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RequestStatus } from '@prisma/client';

export class CreateRequestDto {
  @ApiProperty({ description: 'Module name for the request' })
  @IsString()
  module: string;

  @ApiProperty({ description: 'Type of request' })
  @IsString()
  requestType: string;

  @ApiProperty({ description: 'Request details (JSON)' })
  @IsObject()
  details: Record<string, any>;

  @ApiPropertyOptional({ description: 'Attachments for the request' })
  @IsOptional()
  @IsArray()
  attachmentIds?: string[];
}

export class UpdateRequestDto {
  @ApiPropertyOptional({ description: 'Request details (JSON)' })
  @IsOptional()
  @IsObject()
  details?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Attachments for the request' })
  @IsOptional()
  @IsArray()
  attachmentIds?: string[];
}

export class CancelRequestDto {
  @ApiProperty({ description: 'Reason for cancelling the request' })
  @IsString()
  cancelReason: string;
}

export class RequestFilterDto {
  @ApiPropertyOptional({ description: 'Filter by module' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: 'Filter by request type' })
  @IsOptional()
  @IsString()
  requestType?: string;

  @ApiPropertyOptional({ enum: RequestStatus, description: 'Filter by status' })
  @IsOptional()
  status?: RequestStatus;

  @ApiPropertyOptional({ description: 'Filter by requester profile ID' })
  @IsOptional()
  @IsString()
  requesterProfileId?: string;

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class CreateAttachmentDto {
  @ApiProperty({ description: 'File name' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'File URL' })
  @IsString()
  fileUrl: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;
}