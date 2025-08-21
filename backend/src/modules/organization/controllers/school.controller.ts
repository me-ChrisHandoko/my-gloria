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
  ValidationPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SchoolService } from '../services/school.service';
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  SchoolFilterDto,
  SchoolResponseDto,
} from '../dto/school.dto';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { AuditInterceptor } from '../../../middleware/security.middleware';
import { Audit } from '../../../middleware/security.middleware';

@ApiTags('Schools')
@ApiBearerAuth()
@Controller('schools')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(AuditInterceptor)
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new school' })
  @ApiResponse({
    status: 201,
    description: 'School created successfully',
    type: SchoolResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'School code already exists' })
  @Audit('CREATE', 'School')
  async create(
    @Body(ValidationPipe) dto: CreateSchoolDto,
    @Req() req: any,
  ): Promise<SchoolResponseDto> {
    const userId = req.user?.clerkUserId;
    return this.schoolService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all schools' })
  @ApiResponse({
    status: 200,
    description: 'List of schools',
    type: [SchoolResponseDto],
  })
  async findAll(
    @Query(ValidationPipe) filters: SchoolFilterDto,
    @Req() req: any,
  ): Promise<SchoolResponseDto[]> {
    const userId = req.user?.clerkUserId;
    return this.schoolService.findAll(filters, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get school by ID' })
  @ApiResponse({
    status: 200,
    description: 'School details',
    type: SchoolResponseDto,
  })
  @ApiResponse({ status: 404, description: 'School not found' })
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<SchoolResponseDto> {
    const userId = req.user?.clerkUserId;
    return this.schoolService.findOne(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update school' })
  @ApiResponse({
    status: 200,
    description: 'School updated successfully',
    type: SchoolResponseDto,
  })
  @ApiResponse({ status: 404, description: 'School not found' })
  @Audit('UPDATE', 'School')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateSchoolDto,
    @Req() req: any,
  ): Promise<SchoolResponseDto> {
    const userId = req.user?.clerkUserId;
    return this.schoolService.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete school' })
  @ApiResponse({ status: 204, description: 'School deleted successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete school with departments or positions',
  })
  @Audit('DELETE', 'School')
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    const userId = req.user?.clerkUserId;
    await this.schoolService.remove(id, userId);
  }

  @Get(':id/hierarchy')
  @ApiOperation({ summary: 'Get school organizational hierarchy' })
  @ApiResponse({ status: 200, description: 'School hierarchy structure' })
  async getHierarchy(@Param('id') id: string, @Req() req: any): Promise<any> {
    const userId = req.user?.clerkUserId;
    return this.schoolService.getHierarchy(id, userId);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get school statistics' })
  @ApiResponse({ status: 200, description: 'School statistics' })
  async getStatistics(@Param('id') id: string, @Req() req: any): Promise<any> {
    const userId = req.user?.clerkUserId;
    return this.schoolService.getStatistics(id, userId);
  }

  @Get('available-codes')
  @ApiOperation({ summary: 'Get available school codes from DataKaryawan' })
  @ApiResponse({ status: 200, description: 'List of available school codes' })
  async getAvailableCodes(): Promise<{ value: string; label: string }[]> {
    return this.schoolService.getAvailableSchoolCodes();
  }

  @Post('sync-lokasi')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync school locations with data_karyawan' })
  @ApiResponse({ status: 200, description: 'Sync completed' })
  async syncWithDataKaryawan(
    @Req() req: any,
  ): Promise<{ synced: number; created: number; updated: number }> {
    const userId = req.user?.clerkUserId;
    return this.schoolService.syncWithDataKaryawan(userId);
  }
}
