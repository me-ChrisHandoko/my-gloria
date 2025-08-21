import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
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
import { UserPositionService } from '../services/user-position.service';
import {
  AssignPositionDto,
  TerminatePositionDto,
  TransferPositionDto,
  UserPositionFilterDto,
  UserPositionHistoryDto,
} from '../dto/user-position.dto';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { AuditInterceptor } from '../../../middleware/security.middleware';
import { Audit } from '../../../middleware/security.middleware';

@ApiTags('User Positions')
@ApiBearerAuth()
@Controller('user-positions')
@UseGuards(ClerkAuthGuard)
@UseInterceptors(AuditInterceptor)
export class UserPositionController {
  constructor(private readonly userPositionService: UserPositionService) {}

  @Post('assign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign position to user' })
  @ApiResponse({ status: 201, description: 'Position assigned successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Position assignment conflict' })
  @Audit('CREATE', 'UserPosition')
  async assignPosition(
    @Body(ValidationPipe) dto: AssignPositionDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.userPositionService.assignPosition(dto, userId);
  }

  @Put('terminate')
  @ApiOperation({ summary: 'Terminate position assignment' })
  @ApiResponse({ status: 200, description: 'Position terminated successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  @Audit('UPDATE', 'UserPosition')
  async terminatePosition(
    @Body(ValidationPipe) dto: TerminatePositionDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.userPositionService.terminatePosition(dto, userId);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer user to new position' })
  @ApiResponse({ status: 200, description: 'User transferred successfully' })
  @ApiResponse({ status: 404, description: 'Current assignment not found' })
  @ApiResponse({ status: 409, description: 'Transfer conflict' })
  @Audit('UPDATE', 'UserPosition')
  async transferPosition(
    @Body(ValidationPipe) dto: TransferPositionDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.userPositionService.transferPosition(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user positions' })
  @ApiResponse({ status: 200, description: 'List of user positions' })
  async findAll(
    @Query(ValidationPipe) filters: UserPositionFilterDto,
    @Req() req: any,
  ): Promise<any[]> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.userPositionService.findAll(filters, userId);
  }

  @Get('user/:userProfileId/history')
  @ApiOperation({ summary: 'Get user position history' })
  @ApiResponse({
    status: 200,
    description: 'User position history',
    type: [UserPositionHistoryDto],
  })
  async getUserHistory(
    @Param('userProfileId', ParseUUIDPipe) userProfileId: string,
    @Req() req: any,
  ): Promise<UserPositionHistoryDto[]> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.userPositionService.getUserHistory(userProfileId, userId);
  }

  @Get('user/:userProfileId/active')
  @ApiOperation({ summary: 'Get active positions for user' })
  @ApiResponse({ status: 200, description: 'Active positions' })
  async getActivePositions(
    @Param('userProfileId', ParseUUIDPipe) userProfileId: string,
    @Req() req: any,
  ): Promise<any[]> {
    const userId = req.user?.clerkUserId || req.auth?.userId;
    return this.userPositionService.getActivePositions(userProfileId, userId);
  }
}
