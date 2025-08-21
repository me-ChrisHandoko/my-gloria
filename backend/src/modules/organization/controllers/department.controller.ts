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
import { DepartmentService } from '../services/department.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentFilterDto,
  MoveDepartmentDto,
  DepartmentTreeDto,
} from '../dto/department.dto';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { AuditInterceptor } from '../../../middleware/security.middleware';
import { Audit } from '../../../middleware/security.middleware';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(AuditInterceptor)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new department' })
  @ApiResponse({ status: 201, description: 'Department created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Department code already exists' })
  @Audit('CREATE', 'Department')
  async create(
    @Body(ValidationPipe) dto: CreateDepartmentDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.departmentService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all departments' })
  @ApiResponse({ status: 200, description: 'List of departments' })
  async findAll(
    @Query(ValidationPipe) filters: DepartmentFilterDto,
    @Req() req: any,
  ): Promise<any[]> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.departmentService.findAll(filters, userId);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get department tree structure' })
  @ApiResponse({ status: 200, description: 'Department tree' })
  async getTree(
    @Query('rootId') rootId: string | undefined,
    @Req() req: any,
  ): Promise<DepartmentTreeDto[]> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.departmentService.getTree(rootId || null, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiResponse({ status: 200, description: 'Department details' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async findOne(@Param('id') id: string, @Req() req: any): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.departmentService.findOne(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update department' })
  @ApiResponse({ status: 200, description: 'Department updated successfully' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @Audit('UPDATE', 'Department')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateDepartmentDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.departmentService.update(id, dto, userId);
  }

  @Post('move')
  @ApiOperation({ summary: 'Move department to new parent or school' })
  @ApiResponse({ status: 200, description: 'Department moved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid move operation' })
  @Audit('UPDATE', 'Department')
  async move(
    @Body(ValidationPipe) dto: MoveDepartmentDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.departmentService.move(dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete department' })
  @ApiResponse({ status: 204, description: 'Department deleted successfully' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete department with children or positions',
  })
  @Audit('DELETE', 'Department')
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    await this.departmentService.remove(id, userId);
  }

  @Post('validate-hierarchy')
  @ApiOperation({ summary: 'Validate department hierarchy consistency' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateHierarchy(@Req() req: any): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.departmentService.validateHierarchy(userId);
  }
}
