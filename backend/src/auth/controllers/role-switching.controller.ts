import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  Session,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../guards/clerk-auth.guard';
import {
  RoleSwitchingService,
  ImpersonationContext,
} from '../services/role-switching.service';

interface SessionData {
  impersonationContext?: ImpersonationContext;
}

@Controller('auth/impersonate')
@UseGuards(ClerkAuthGuard)
export class RoleSwitchingController {
  private readonly logger = new Logger(RoleSwitchingController.name);

  constructor(private readonly roleSwitchingService: RoleSwitchingService) {}

  /**
   * Start impersonation session
   * POST /auth/impersonate/start
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startImpersonation(
    @Request() req: any,
    @Body()
    body: {
      mode: 'user' | 'position' | 'role';
      userId?: string;
      positionId?: string;
      roleId?: string;
      schoolId?: string;
      departmentId?: string;
    },
    @Session() session: SessionData,
  ) {
    const clerkUserId = req.auth.userId;

    this.logger.log(
      `Starting impersonation for user: ${clerkUserId}, mode: ${body.mode}`,
    );

    try {
      const impersonationContext =
        await this.roleSwitchingService.startImpersonation(clerkUserId, {
          userId: body.userId,
          positionId: body.positionId,
          roleId: body.roleId,
          schoolId: body.schoolId,
          departmentId: body.departmentId,
        });

      // Store impersonation context in session
      session.impersonationContext = impersonationContext;

      // Get the modified context for the impersonated user/role
      const modifiedContext =
        await this.roleSwitchingService.getImpersonatedContext(
          clerkUserId,
          impersonationContext,
        );

      return {
        success: true,
        impersonationContext,
        effectiveContext: modifiedContext,
        message: `Successfully started impersonation in ${body.mode} mode`,
      };
    } catch (error) {
      this.logger.error('Failed to start impersonation:', error);
      throw error;
    }
  }

  /**
   * Stop impersonation and return to original context
   * POST /auth/impersonate/stop
   */
  @Post('stop')
  @HttpCode(HttpStatus.OK)
  async stopImpersonation(
    @Request() req: any,
    @Session() session: SessionData,
  ) {
    const clerkUserId = req.auth.userId;

    this.logger.log(`Stopping impersonation for user: ${clerkUserId}`);

    try {
      await this.roleSwitchingService.stopImpersonation(clerkUserId);

      // Clear impersonation context from session
      delete session.impersonationContext;

      return {
        success: true,
        message: 'Successfully stopped impersonation',
      };
    } catch (error) {
      this.logger.error('Failed to stop impersonation:', error);
      throw error;
    }
  }

  /**
   * Get current impersonation status
   * GET /auth/impersonate/status
   */
  @Get('status')
  async getImpersonationStatus(
    @Request() req: any,
    @Session() session: SessionData,
  ) {
    const clerkUserId = req.auth.userId;
    const impersonationContext = session.impersonationContext;

    if (!impersonationContext) {
      return {
        isImpersonating: false,
        message: 'Not currently impersonating',
      };
    }

    // Check if impersonation has expired
    if (new Date() > new Date(impersonationContext.expiresAt)) {
      delete session.impersonationContext;
      return {
        isImpersonating: false,
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
      isImpersonating: true,
      impersonationContext,
      effectiveContext,
      remainingTime: Math.floor(
        (new Date(impersonationContext.expiresAt).getTime() - Date.now()) /
          1000,
      ), // in seconds
    };
  }

  /**
   * Get available impersonation targets
   * GET /auth/impersonate/targets
   */
  @Get('targets')
  async getAvailableTargets(@Request() req: any) {
    const clerkUserId = req.auth.userId;

    this.logger.log(
      `Fetching available impersonation targets for user: ${clerkUserId}`,
    );

    try {
      const targets =
        await this.roleSwitchingService.getAvailableImpersonationTargets(
          clerkUserId,
        );

      return {
        success: true,
        targets,
      };
    } catch (error) {
      this.logger.error('Failed to fetch impersonation targets:', error);
      throw error;
    }
  }

  /**
   * Quick switch to specific predefined roles
   * POST /auth/impersonate/quick-switch
   */
  @Post('quick-switch')
  @HttpCode(HttpStatus.OK)
  async quickSwitch(
    @Request() req: any,
    @Body()
    body: {
      target: 'kepala_sekolah' | 'kepala_bagian' | 'guru' | 'staff';
      schoolId?: string;
      departmentId?: string;
    },
    @Session() session: SessionData,
  ) {
    const clerkUserId = req.auth.userId;

    this.logger.log(`Quick switch requested: ${body.target}`);

    try {
      let impersonationOptions: any = {};

      // Map quick switch targets to actual positions/roles
      switch (body.target) {
        case 'kepala_sekolah':
          // Find a principal position
          const principalPosition = await this.roleSwitchingService[
            'prisma'
          ].position.findFirst({
            where: {
              OR: [
                { code: 'KEPSEK' },
                { name: { contains: 'Kepala Sekolah', mode: 'insensitive' } },
              ],
              isActive: true,
              schoolId: body.schoolId || undefined,
            },
          });

          if (principalPosition) {
            impersonationOptions = {
              positionId: principalPosition.id,
            };
          } else {
            throw new Error('No active Kepala Sekolah position found');
          }
          break;

        case 'kepala_bagian':
          // Find a department head position
          const deptHeadPosition = await this.roleSwitchingService[
            'prisma'
          ].position.findFirst({
            where: {
              OR: [
                { code: 'KABAG' },
                { name: { contains: 'Kepala Bagian', mode: 'insensitive' } },
              ],
              isActive: true,
              departmentId: body.departmentId || undefined,
            },
          });

          if (deptHeadPosition) {
            impersonationOptions = {
              positionId: deptHeadPosition.id,
            };
          } else {
            throw new Error('No active Kepala Bagian position found');
          }
          break;

        case 'guru':
          // Find a teacher role
          const teacherRole = await this.roleSwitchingService[
            'prisma'
          ].role.findFirst({
            where: {
              OR: [
                { code: 'GURU' },
                { name: { contains: 'Guru', mode: 'insensitive' } },
              ],
              isActive: true,
            },
          });

          if (teacherRole) {
            impersonationOptions = {
              roleId: teacherRole.id,
              schoolId: body.schoolId,
            };
          } else {
            throw new Error('No active Guru role found');
          }
          break;

        case 'staff':
          // Find a staff role
          const staffRole = await this.roleSwitchingService[
            'prisma'
          ].role.findFirst({
            where: {
              OR: [
                { code: 'STAFF' },
                { name: { contains: 'Staff', mode: 'insensitive' } },
              ],
              isActive: true,
            },
          });

          if (staffRole) {
            impersonationOptions = {
              roleId: staffRole.id,
              departmentId: body.departmentId,
            };
          } else {
            throw new Error('No active Staff role found');
          }
          break;

        default:
          throw new Error(`Unknown quick switch target: ${body.target}`);
      }

      // Start impersonation with the determined options
      const impersonationContext =
        await this.roleSwitchingService.startImpersonation(
          clerkUserId,
          impersonationOptions,
        );

      // Store in session
      session.impersonationContext = impersonationContext;

      // Get the modified context
      const modifiedContext =
        await this.roleSwitchingService.getImpersonatedContext(
          clerkUserId,
          impersonationContext,
        );

      return {
        success: true,
        quickSwitchTarget: body.target,
        impersonationContext,
        effectiveContext: modifiedContext,
        message: `Successfully switched to ${body.target} view`,
      };
    } catch (error) {
      this.logger.error('Quick switch failed:', error);
      throw error;
    }
  }
}
