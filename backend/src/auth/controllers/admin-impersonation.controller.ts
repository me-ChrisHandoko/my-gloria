import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  Session,
  Version,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../guards/clerk-auth.guard';
import {
  RoleSwitchingService,
  ImpersonationContext,
} from '../services/role-switching.service';

interface SessionData {
  impersonationContext?: ImpersonationContext;
}

/**
 * Admin Impersonation Controller
 * Provides alias routes for frontend compatibility
 * Maps /api/v1/admin/impersonation/* to role switching service
 */
@Controller('admin/impersonation')
@UseGuards(ClerkAuthGuard)
export class AdminImpersonationController {
  private readonly logger = new Logger(AdminImpersonationController.name);

  constructor(private readonly roleSwitchingService: RoleSwitchingService) {}

  /**
   * Get current impersonation session
   * GET /api/v1/admin/impersonation/session
   * Alias for /api/auth/impersonate/status
   */
  @Get('session')
  async getSession(@Request() req: any, @Session() session: SessionData) {
    const clerkUserId = req.auth.userId;
    const impersonationContext = session.impersonationContext;

    if (!impersonationContext) {
      return {
        active: false,
        message: 'No active impersonation session',
      };
    }

    // Check if impersonation has expired
    if (new Date() > new Date(impersonationContext.expiresAt)) {
      delete session.impersonationContext;
      return {
        active: false,
        message: 'Impersonation session has expired',
      };
    }

    // Get the current effective context
    const effectiveContext =
      await this.roleSwitchingService.getImpersonatedContext(
        clerkUserId,
        impersonationContext,
      );

    return {
      active: true,
      session: {
        mode: impersonationContext.impersonationMode,
        targetUserId: impersonationContext.impersonatedUserId,
        targetRoleId: impersonationContext.impersonatedRole,
        targetPositionId: impersonationContext.impersonatedPosition,
        startedAt: impersonationContext.startedAt,
        expiresAt: impersonationContext.expiresAt,
        remainingSeconds: Math.floor(
          (new Date(impersonationContext.expiresAt).getTime() - Date.now()) /
            1000,
        ),
      },
      effectivePermissions: effectiveContext,
    };
  }

  /**
   * Start impersonation
   * POST /api/v1/admin/impersonation/start
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startImpersonation(
    @Request() req: any,
    @Body()
    body: {
      mode: 'user' | 'position' | 'role';
      targetId: string;
      schoolId?: string;
      departmentId?: string;
    },
    @Session() session: SessionData,
  ) {
    const clerkUserId = req.auth.userId;

    this.logger.log(
      `Starting impersonation via admin route for user: ${clerkUserId}, mode: ${body.mode}`,
    );

    try {
      // Map targetId based on mode
      const options: any = {};
      switch (body.mode) {
        case 'user':
          options.userId = body.targetId;
          break;
        case 'position':
          options.positionId = body.targetId;
          break;
        case 'role':
          options.roleId = body.targetId;
          options.schoolId = body.schoolId;
          options.departmentId = body.departmentId;
          break;
      }

      const impersonationContext =
        await this.roleSwitchingService.startImpersonation(
          clerkUserId,
          options,
        );

      // Store impersonation context in session
      session.impersonationContext = impersonationContext;

      // Get the modified context for the impersonated user/role
      const effectiveContext =
        await this.roleSwitchingService.getImpersonatedContext(
          clerkUserId,
          impersonationContext,
        );

      return {
        success: true,
        session: {
          mode: impersonationContext.impersonationMode,
          targetId: body.targetId,
          startedAt: impersonationContext.startedAt,
          expiresAt: impersonationContext.expiresAt,
        },
        effectivePermissions: effectiveContext,
      };
    } catch (error) {
      this.logger.error('Failed to start impersonation:', error);
      throw error;
    }
  }

  /**
   * End impersonation
   * DELETE /api/v1/admin/impersonation/session
   */
  @Delete('session')
  @HttpCode(HttpStatus.OK)
  async endImpersonation(@Request() req: any, @Session() session: SessionData) {
    const clerkUserId = req.auth.userId;

    this.logger.log(
      `Ending impersonation via admin route for user: ${clerkUserId}`,
    );

    try {
      await this.roleSwitchingService.stopImpersonation(clerkUserId);

      // Clear impersonation context from session
      delete session.impersonationContext;

      return {
        success: true,
        message: 'Impersonation session ended successfully',
      };
    } catch (error) {
      this.logger.error('Failed to end impersonation:', error);
      throw error;
    }
  }

  /**
   * Get available impersonation targets
   * GET /api/v1/admin/impersonation/targets
   */
  @Get('targets')
  async getTargets(@Request() req: any) {
    const clerkUserId = req.auth.userId;

    this.logger.log(
      `Fetching impersonation targets via admin route for user: ${clerkUserId}`,
    );

    try {
      const targets =
        await this.roleSwitchingService.getAvailableImpersonationTargets(
          clerkUserId,
        );

      return {
        success: true,
        data: targets,
      };
    } catch (error) {
      this.logger.error('Failed to fetch impersonation targets:', error);
      throw error;
    }
  }
}
