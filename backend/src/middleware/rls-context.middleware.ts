import { Injectable, NestMiddleware, Logger, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RowLevelSecurityService } from '../security/row-level-security.service';
import { RoleSwitchingService } from '../auth/services/role-switching.service';
import { PrismaService } from '../prisma/prisma.service';

interface SessionData {
  impersonationContext?: any;
}

/**
 * RLS Context Middleware
 *
 * This middleware sets up the user context for Row Level Security (RLS)
 * by extracting the user information from the request and storing it
 * in AsyncLocalStorage for use by the Prisma middleware.
 *
 * Also supports impersonation context for role switching.
 */
@Injectable()
export class RLSContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RLSContextMiddleware.name);

  constructor(
    private readonly rlsService: RowLevelSecurityService,
    @Inject(RoleSwitchingService)
    private readonly roleSwitchingService?: RoleSwitchingService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract user from request (set by Clerk auth guard)
    const user = (req as any).user;

    if (!user?.clerkUserId) {
      // No user context, proceed without RLS
      return next();
    }

    try {
      let userContext;

      // Check if there's an impersonation context in the session
      const session = (req as any).session as SessionData;
      const impersonationContext = session?.impersonationContext;

      if (impersonationContext && this.roleSwitchingService) {
        // Check if impersonation hasn't expired
        if (new Date() <= new Date(impersonationContext.expiresAt)) {
          // Get impersonated context
          userContext = await this.roleSwitchingService.getImpersonatedContext(
            user.clerkUserId,
            impersonationContext,
          );

          this.logger.debug(
            `Using impersonated context for user: ${user.clerkUserId}, mode: ${impersonationContext.impersonationMode}`,
          );
        } else {
          // Impersonation expired, clear it from session
          delete session.impersonationContext;
          this.logger.debug(
            `Impersonation expired for user: ${user.clerkUserId}`,
          );

          // Fall back to regular user context
          userContext = await this.rlsService.getUserContext(user.clerkUserId);
        }
      } else {
        // Get normal user context for RLS
        userContext = await this.rlsService.getUserContext(user.clerkUserId);
      }

      // Store context in AsyncLocalStorage
      const asyncLocalStorage = PrismaService.getAsyncLocalStorage();

      // Run the rest of the request with the user context
      asyncLocalStorage.run({ userContext }, () => {
        this.logger.debug(
          `RLS context set for user: ${user.clerkUserId}${userContext.isImpersonating ? ' (impersonating)' : ''}`,
        );
        next();
      });
    } catch (error) {
      this.logger.error(
        `Failed to set RLS context for user ${user.clerkUserId}:`,
        error,
      );
      // Continue without RLS on error
      next();
    }
  }
}

/**
 * RLS Bypass Middleware
 *
 * Special middleware for system operations that need to bypass RLS.
 * Use with extreme caution - only for system-level operations.
 */
@Injectable()
export class RLSBypassMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RLSBypassMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Check if this is a system operation (e.g., health checks, system sync)
    const isSystemOperation =
      req.path.startsWith('/health') ||
      req.path.startsWith('/system') ||
      req.headers['x-system-operation'] === 'true';

    if (isSystemOperation) {
      const asyncLocalStorage = PrismaService.getAsyncLocalStorage();

      // Run with bypass flag
      asyncLocalStorage.run({ bypassRLS: true }, () => {
        this.logger.debug('RLS bypassed for system operation');
        next();
      });
    } else {
      next();
    }
  }
}

/**
 * RLS Debug Middleware
 *
 * Development-only middleware to debug RLS context.
 * Logs the current user context for each request.
 */
@Injectable()
export class RLSDebugMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RLSDebugMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    if (process.env.NODE_ENV !== 'development') {
      return next();
    }

    const asyncLocalStorage = PrismaService.getAsyncLocalStorage();
    const context = asyncLocalStorage.getStore();

    if (context?.userContext) {
      this.logger.debug('RLS Context:', {
        userProfileId: context.userContext.userProfileId,
        isSuperadmin: context.userContext.isSuperadmin,
        schoolIds: context.userContext.schoolIds,
        departmentIds: context.userContext.departmentIds,
        scopes: Array.from(
          context.userContext.permissionScopes?.entries() || [],
        ),
      });
    } else {
      this.logger.debug('No RLS context for this request');
    }

    next();
  }
}
