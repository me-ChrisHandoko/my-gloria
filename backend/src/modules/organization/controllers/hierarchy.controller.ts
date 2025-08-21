import {
  Controller,
  Get,
  Post,
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
import { HierarchyService } from '../services/hierarchy.service';
import {
  SetHierarchyDto,
  OrgChartDto,
  ReportingChainDto,
  HierarchyValidationResultDto,
} from '../dto/hierarchy.dto';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { AuditInterceptor } from '../../../middleware/security.middleware';
import { Audit } from '../../../middleware/security.middleware';

@ApiTags('Hierarchy')
@ApiBearerAuth()
@Controller('hierarchy')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(AuditInterceptor)
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  @Post('set')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set position hierarchy' })
  @ApiResponse({ status: 200, description: 'Hierarchy set successfully' })
  @ApiResponse({ status: 400, description: 'Invalid hierarchy' })
  @ApiResponse({ status: 409, description: 'Circular reference detected' })
  @Audit('UPDATE', 'PositionHierarchy')
  async setHierarchy(
    @Body(ValidationPipe) dto: SetHierarchyDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.hierarchyService.setHierarchy(dto, userId);
  }

  @Get('org-chart')
  @ApiOperation({ summary: 'Get organizational chart' })
  @ApiResponse({
    status: 200,
    description: 'Organization chart',
    type: OrgChartDto,
  })
  async getOrgChart(
    @Query('rootPositionId') rootPositionId: string | undefined,
    @Req() req: any,
  ): Promise<OrgChartDto> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.hierarchyService.getOrgChart(rootPositionId || null, userId);
  }

  @Get('position/:id')
  @ApiOperation({ summary: 'Get position hierarchy details' })
  @ApiResponse({ status: 200, description: 'Position hierarchy' })
  @ApiResponse({ status: 404, description: 'Position not found' })
  async getPositionHierarchy(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.hierarchyService.getPositionHierarchy(id, userId);
  }

  @Get('position/:id/reporting-chain')
  @ApiOperation({ summary: 'Get reporting chain for position' })
  @ApiResponse({
    status: 200,
    description: 'Reporting chain',
    type: ReportingChainDto,
  })
  @ApiResponse({ status: 404, description: 'Position not found' })
  async getReportingChain(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<ReportingChainDto> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.hierarchyService.getReportingChain(id, userId);
  }

  @Get('position/:id/subordinates')
  @ApiOperation({ summary: 'Get all subordinates for position' })
  @ApiResponse({ status: 200, description: 'List of subordinate positions' })
  async getSubordinates(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<any[]> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.hierarchyService.getSubordinates(id, userId);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate hierarchy consistency' })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    type: HierarchyValidationResultDto,
  })
  async validateHierarchy(
    @Req() req: any,
  ): Promise<HierarchyValidationResultDto> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.hierarchyService.validateHierarchy(userId);
  }
}
