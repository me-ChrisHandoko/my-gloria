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
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PositionService } from '../services/position.service';
import {
  CreatePositionDto,
  UpdatePositionDto,
  PositionFilterDto,
  PositionAvailabilityDto,
} from '../dto/position.dto';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { AuditInterceptor } from '../../../middleware/security.middleware';
import { Audit } from '../../../middleware/security.middleware';
import { PaginationResponseDto } from '../../../common/dto/pagination.dto';
import { ApiResponseInterceptor } from '../../../common/interceptors/api-response.interceptor';

@ApiTags('Positions')
@ApiBearerAuth()
@Controller('positions')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(AuditInterceptor, ApiResponseInterceptor)
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new position' })
  @ApiResponse({ status: 201, description: 'Position created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Position code already exists' })
  @Audit('CREATE', 'Position')
  async create(
    @Body(ValidationPipe) dto: CreatePositionDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.positionService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all positions with pagination' })
  @ApiResponse({
    status: 200,
    description: 'List of positions with pagination',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginationResponseDto' },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Position' },
            },
          },
        },
      ],
    },
  })
  async findAll(
    @Query(ValidationPipe) filters: PositionFilterDto,
    @Req() req: any,
  ): Promise<PaginationResponseDto<any>> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.positionService.findAll(filters, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get position by ID' })
  @ApiResponse({ status: 200, description: 'Position details' })
  @ApiResponse({ status: 404, description: 'Position not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.positionService.findOne(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update position' })
  @ApiResponse({ status: 200, description: 'Position updated successfully' })
  @ApiResponse({ status: 404, description: 'Position not found' })
  @Audit('UPDATE', 'Position')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdatePositionDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.positionService.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete position' })
  @ApiResponse({ status: 204, description: 'Position deleted successfully' })
  @ApiResponse({ status: 404, description: 'Position not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete position with active assignments',
  })
  @Audit('DELETE', 'Position')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<void> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    await this.positionService.remove(id, userId);
  }

  @Get(':id/holders')
  @ApiOperation({ summary: 'Get position holders with history' })
  @ApiResponse({ status: 200, description: 'Position holders' })
  async getHolders(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.positionService.getHolders(id, userId);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Check position availability' })
  @ApiResponse({
    status: 200,
    description: 'Position availability',
    type: PositionAvailabilityDto,
  })
  async checkAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<PositionAvailabilityDto> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.positionService.checkAvailability(id, userId);
  }
}
