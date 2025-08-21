import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { CanCreate, CanRead, CanUpdate, CanDelete } from '../../permission/decorators/permission.decorator';
import { ApprovalMatrixService } from '../services/approval-matrix.service';
import { ApprovalValidatorService } from '../services/approval-validator.service';
import {
  CreateApprovalMatrixDto,
  UpdateApprovalMatrixDto,
  ApprovalMatrixFilterDto,
} from '../dto/approval-matrix.dto';

@ApiTags('Approval Matrix')
@ApiBearerAuth()
@Controller('api/v1/approval-matrix')
@UseGuards(ClerkAuthGuard)
export class ApprovalMatrixController {
  constructor(
    private readonly approvalMatrixService: ApprovalMatrixService,
    private readonly validatorService: ApprovalValidatorService,
  ) {}

  @Post()
  @CanCreate('approval_matrix')
  @ApiOperation({ summary: 'Create a new approval matrix' })
  @ApiResponse({ status: 201, description: 'Approval matrix created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Conflict - duplicate matrix' })
  async create(@Body() dto: CreateApprovalMatrixDto, @Req() req: any) {
    // Validate conditions if provided
    if (dto.conditions) {
      const isValid = this.validatorService.validateMatrixConditions(dto.conditions);
      if (!isValid) {
        throw new Error('Invalid conditions format');
      }
    }

    return this.approvalMatrixService.create(dto, req.user.clerkId);
  }

  @Get()
  @CanRead('approval_matrix')
  @ApiOperation({ summary: 'Get all approval matrices' })
  @ApiResponse({ status: 200, description: 'List of approval matrices' })
  async findAll(@Query() filter: ApprovalMatrixFilterDto) {
    return this.approvalMatrixService.findAll(filter);
  }

  @Get('module/:module')
  @CanRead('approval_matrix')
  @ApiOperation({ summary: 'Get approval matrices for a specific module' })
  @ApiResponse({ status: 200, description: 'List of approval matrices for the module' })
  async findByModule(
    @Param('module') module: string,
    @Query('requesterRole') requesterRole?: string,
    @Query('requesterPosition') requesterPosition?: string,
  ) {
    return this.approvalMatrixService.findByModule(module, requesterRole, requesterPosition);
  }

  @Get(':id')
  @CanRead('approval_matrix')
  @ApiOperation({ summary: 'Get approval matrix by ID' })
  @ApiResponse({ status: 200, description: 'Approval matrix details' })
  @ApiResponse({ status: 404, description: 'Approval matrix not found' })
  async findOne(@Param('id') id: string) {
    return this.approvalMatrixService.findOne(id);
  }

  @Patch(':id')
  @CanUpdate('approval_matrix')
  @ApiOperation({ summary: 'Update approval matrix' })
  @ApiResponse({ status: 200, description: 'Approval matrix updated successfully' })
  @ApiResponse({ status: 404, description: 'Approval matrix not found' })
  @ApiResponse({ status: 409, description: 'Conflict - duplicate matrix' })
  async update(@Param('id') id: string, @Body() dto: UpdateApprovalMatrixDto) {
    // Validate conditions if provided
    if (dto.conditions) {
      const isValid = this.validatorService.validateMatrixConditions(dto.conditions);
      if (!isValid) {
        throw new Error('Invalid conditions format');
      }
    }

    return this.approvalMatrixService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  @CanUpdate('approval_matrix')
  @ApiOperation({ summary: 'Toggle approval matrix active status' })
  @ApiResponse({ status: 200, description: 'Approval matrix status toggled' })
  @ApiResponse({ status: 404, description: 'Approval matrix not found' })
  async toggleActive(@Param('id') id: string) {
    return this.approvalMatrixService.toggleActive(id);
  }

  @Post('duplicate')
  @CanCreate('approval_matrix')
  @ApiOperation({ summary: 'Duplicate approval matrices from one module to another' })
  @ApiResponse({ status: 201, description: 'Approval matrices duplicated successfully' })
  @ApiResponse({ status: 404, description: 'Source module matrices not found' })
  async duplicate(
    @Body() dto: { sourceModule: string; targetModule: string },
    @Req() req: any,
  ) {
    return this.approvalMatrixService.duplicateMatrix(
      dto.sourceModule,
      dto.targetModule,
      req.user.clerkId,
    );
  }

  @Delete(':id')
  @CanDelete('approval_matrix')
  @ApiOperation({ summary: 'Delete approval matrix' })
  @ApiResponse({ status: 200, description: 'Approval matrix deleted successfully' })
  @ApiResponse({ status: 404, description: 'Approval matrix not found' })
  async remove(@Param('id') id: string) {
    await this.approvalMatrixService.remove(id);
    return { message: 'Approval matrix deleted successfully' };
  }
}