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
  UseInterceptors,
  Req,
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
import { AuditInterceptor } from '../../../middleware/security.middleware';
import { Audit } from '../../../middleware/security.middleware';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/permission.decorator';
import { PermissionAction, PolicyType } from '@prisma/client';

@ApiTags('Permission Policies')
@ApiBearerAuth()
@Controller('permission-policies')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(AuditInterceptor)
export class PermissionPolicyController {
  constructor(
    private readonly policyService: PermissionPolicyService,
    private readonly policyEngine: PolicyEngineService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new permission policy' })
  @ApiResponse({ status: 201, description: 'Policy created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid policy rules' })
  @Audit('CREATE', 'PermissionPolicy')
  async create(@Body() createPolicyDto: CreatePolicyDto, @Req() req: any) {
    const userId = req.user?.clerkUserId;
    return this.policyService.create(createPolicyDto, userId);
  }

  @Get()
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
  @ApiOperation({ summary: 'Get policy by ID' })
  @ApiResponse({ status: 200, description: 'Policy details' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async findOne(@Param('id') id: string) {
    return this.policyService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update policy' })
  @ApiResponse({ status: 200, description: 'Policy updated successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @Audit('UPDATE', 'PermissionPolicy')
  async update(
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdatePolicyDto,
    @Req() req: any,
  ) {
    const userId = req.user?.clerkUserId;
    return this.policyService.update(id, updatePolicyDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete policy' })
  @ApiResponse({ status: 204, description: 'Policy deleted successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @Audit('DELETE', 'PermissionPolicy')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.clerkUserId;
    await this.policyService.remove(id, userId);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign policy to user/role/department/position' })
  @ApiResponse({ status: 201, description: 'Policy assigned successfully' })
  @Audit('ASSIGN', 'PermissionPolicy')
  async assignPolicy(
    @Param('id') id: string,
    @Body() assignPolicyDto: AssignPolicyDto,
    @Req() req: any,
  ) {
    const userId = req.user?.clerkUserId;
    return this.policyService.assignPolicy(id, assignPolicyDto, userId);
  }

  @Delete(':id/assignments/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove policy assignment' })
  @ApiResponse({ status: 204, description: 'Assignment removed successfully' })
  @Audit('UNASSIGN', 'PermissionPolicy')
  async removeAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.clerkUserId;
    await this.policyService.removeAssignment(assignmentId, userId);
  }

  @Post(':id/evaluate')
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
  @ApiOperation({ summary: 'Get policy assignments' })
  @ApiResponse({ status: 200, description: 'List of policy assignments' })
  async getPolicyAssignments(@Param('id') id: string) {
    return this.policyService.getPolicyAssignments(id);
  }
}
