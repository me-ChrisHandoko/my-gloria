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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PolicyEngineService } from '../services/policy-engine.service';
import { PermissionPolicyService } from '../services/permission-policy.service';
import {
  CreatePolicyDto,
  UpdatePolicyDto,
  AssignPolicyDto,
  EvaluatePolicyDto,
} from '../dto/policy/create-policy.dto';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/permission.decorator';
import { PermissionAction, PolicyType } from '@prisma/client';

@ApiTags('permission-policies')
@Controller('v1/policies')
@UseGuards(ClerkAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class PermissionPolicyController {
  constructor(
    private readonly policyService: PermissionPolicyService,
    private readonly policyEngine: PolicyEngineService,
  ) {}

  @Post()
  @RequirePermission('policy', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Create a new permission policy' })
  @ApiResponse({ status: 201, description: 'Policy created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid policy rules' })
  async create(@Body() createPolicyDto: CreatePolicyDto, @Request() req: any) {
    return this.policyService.create(createPolicyDto, req.user.userId);
  }

  @Get()
  @RequirePermission('policy', PermissionAction.READ)
  @ApiOperation({ summary: 'Get all policies' })
  @ApiResponse({ status: 200, description: 'List of policies' })
  async findAll(
    @Query('type') type?: PolicyType,
    @Query('isActive') isActive?: string,
  ) {
    return this.policyService.findAll({
      policyType: type,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get(':id')
  @RequirePermission('policy', PermissionAction.READ)
  @ApiOperation({ summary: 'Get policy by ID' })
  @ApiResponse({ status: 200, description: 'Policy details' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async findOne(@Param('id') id: string) {
    return this.policyService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('policy', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Update policy' })
  @ApiResponse({ status: 200, description: 'Policy updated successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdatePolicyDto,
    @Request() req: any,
  ) {
    return this.policyService.update(id, updatePolicyDto, req.user.userId);
  }

  @Delete(':id')
  @RequirePermission('policy', PermissionAction.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete policy' })
  @ApiResponse({ status: 204, description: 'Policy deleted successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async remove(@Param('id') id: string, @Request() req: any) {
    await this.policyService.remove(id, req.user.userId);
  }

  @Post(':id/assign')
  @RequirePermission('policy', PermissionAction.ASSIGN)
  @ApiOperation({ summary: 'Assign policy to user/role/department/position' })
  @ApiResponse({ status: 201, description: 'Policy assigned successfully' })
  async assignPolicy(
    @Param('id') id: string,
    @Body() assignPolicyDto: AssignPolicyDto,
    @Request() req: any,
  ) {
    return this.policyService.assignPolicy(
      id,
      assignPolicyDto,
      req.user.userId,
    );
  }

  @Delete(':id/assignments/:assignmentId')
  @RequirePermission('policy', PermissionAction.ASSIGN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove policy assignment' })
  @ApiResponse({ status: 204, description: 'Assignment removed successfully' })
  async removeAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Request() req: any,
  ) {
    await this.policyService.removeAssignment(assignmentId, req.user.userId);
  }

  @Post(':id/evaluate')
  @RequirePermission('policy', PermissionAction.READ)
  @ApiOperation({ summary: 'Evaluate policy for a user' })
  @ApiResponse({ status: 200, description: 'Policy evaluation result' })
  async evaluatePolicy(
    @Param('id') id: string,
    @Body() evaluateDto: EvaluatePolicyDto,
  ) {
    return this.policyEngine.evaluatePolicy(
      id,
      evaluateDto.userId,
      evaluateDto.context,
    );
  }

  @Post('evaluate-all')
  @RequirePermission('policy', PermissionAction.READ)
  @ApiOperation({ summary: 'Evaluate all applicable policies for a user' })
  @ApiResponse({ status: 200, description: 'All policy evaluation results' })
  async evaluateAllPolicies(@Body() evaluateDto: EvaluatePolicyDto) {
    const results = await this.policyEngine.evaluatePolicies(
      evaluateDto.userId,
      evaluateDto.context,
    );

    // Convert Map to object for JSON response
    const resultObject: Record<string, any> = {};
    results.forEach((value, key) => {
      resultObject[key] = value;
    });

    return resultObject;
  }

  @Post('validate-rules')
  @RequirePermission('policy', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Validate policy rules' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateRules(@Body() body: { policyType: PolicyType; rules: any }) {
    const isValid = this.policyEngine.validatePolicyRules(
      body.policyType,
      body.rules,
    );
    return { isValid };
  }

  @Get(':id/assignments')
  @RequirePermission('policy', PermissionAction.READ)
  @ApiOperation({ summary: 'Get policy assignments' })
  @ApiResponse({ status: 200, description: 'List of policy assignments' })
  async getPolicyAssignments(@Param('id') id: string) {
    return this.policyService.getPolicyAssignments(id);
  }
}
