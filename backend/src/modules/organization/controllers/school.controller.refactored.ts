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
  ApiResponse as ApiResponseSwagger,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SchoolServiceRefactored } from '../services/school.service.refactored';
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  SchoolFilterDto,
  SchoolResponseDto,
} from '../dto/school.dto';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { AuditInterceptor } from '../../../middleware/security.middleware';
import { ApiResponseInterceptor } from '../../../common/interceptors/api-response.interceptor';
import { ApiResponseDto, PaginatedResponseDto } from '../../../common/dto/api-response.dto';

@ApiTags('Schools')
@ApiBearerAuth()
@Controller('schools')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(AuditInterceptor, ApiResponseInterceptor)
export class SchoolControllerRefactored {
  constructor(private readonly schoolService: SchoolServiceRefactored) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new school' })
  @ApiResponseSwagger({
    status: 201,
    description: 'School created successfully',
    type: SchoolResponseDto,
  })
  async create(
    @Body(ValidationPipe) createSchoolDto: CreateSchoolDto,
    @Req() req: any,
  ): Promise<ApiResponseDto<SchoolResponseDto>> {
    const school = await this.schoolService.create(createSchoolDto, req.user.id);
    return ApiResponseDto.success(school, 'School created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all schools with pagination and filters' })
  @ApiResponseSwagger({
    status: 200,
    description: 'List of schools retrieved successfully',
    type: [SchoolResponseDto],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'lokasi', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @Query(ValidationPipe) filters: SchoolFilterDto,
    @Req() req: any,
  ): Promise<PaginatedResponseDto<SchoolResponseDto>> {
    const result = await this.schoolService.findAll(filters, req.user.id);
    
    return PaginatedResponseDto.paginate(
      result.data,
      result.total,
      result.page,
      result.limit,
      'Schools retrieved successfully',
    );
  }

  @Get('available-codes')
  @ApiOperation({ summary: 'Get available school codes from data karyawan' })
  @ApiResponseSwagger({
    status: 200,
    description: 'Available school codes retrieved successfully',
  })
  async getAvailableCodes(): Promise<ApiResponseDto<{ value: string; label: string }[]>> {
    const codes = await this.schoolService.getAvailableSchoolCodes();
    return ApiResponseDto.success(codes, 'Available codes retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get school by ID' })
  @ApiResponseSwagger({
    status: 200,
    description: 'School details retrieved successfully',
    type: SchoolResponseDto,
  })
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ApiResponseDto<SchoolResponseDto>> {
    const school = await this.schoolService.findOne(id, req.user.id);
    return ApiResponseDto.success(school, 'School retrieved successfully');
  }

  @Get(':id/hierarchy')
  @ApiOperation({ summary: 'Get school organizational hierarchy' })
  @ApiResponseSwagger({
    status: 200,
    description: 'School hierarchy retrieved successfully',
  })
  async getHierarchy(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ApiResponseDto<any>> {
    const hierarchy = await this.schoolService.getHierarchy(id, req.user.id);
    return ApiResponseDto.success(hierarchy, 'Hierarchy retrieved successfully');
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get school statistics' })
  @ApiResponseSwagger({
    status: 200,
    description: 'School statistics retrieved successfully',
  })
  async getStatistics(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ApiResponseDto<any>> {
    const statistics = await this.schoolService.getStatistics(id, req.user.id);
    return ApiResponseDto.success(statistics, 'Statistics retrieved successfully');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update school' })
  @ApiResponseSwagger({
    status: 200,
    description: 'School updated successfully',
    type: SchoolResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateSchoolDto: UpdateSchoolDto,
    @Req() req: any,
  ): Promise<ApiResponseDto<SchoolResponseDto>> {
    const school = await this.schoolService.update(id, updateSchoolDto, req.user.id);
    return ApiResponseDto.success(school, 'School updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete school' })
  @ApiResponseSwagger({
    status: 204,
    description: 'School deleted successfully',
  })
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ApiResponseDto<null>> {
    await this.schoolService.remove(id, req.user.id);
    return ApiResponseDto.success(null, 'School deleted successfully');
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync school locations with data karyawan' })
  @ApiResponseSwagger({
    status: 200,
    description: 'School locations synced successfully',
  })
  async syncLocations(
    @Req() req: any,
  ): Promise<ApiResponseDto<{ synced: number; created: number; updated: number }>> {
    const result = await this.schoolService.syncWithDataKaryawan(req.user.id);
    return ApiResponseDto.success(
      result,
      `Synced ${result.synced} locations: ${result.created} created, ${result.updated} updated`,
    );
  }
}