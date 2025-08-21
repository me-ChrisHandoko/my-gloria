import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestContext {
  correlationId: string;
  userId?: string;
  organizationId?: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

/**
 * Decorator to extract request context
 * Usage: @ReqContext() context: RequestContext
 */
export const ReqContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx.switchToHttp().getRequest();

    return {
      correlationId:
        request.correlationId ||
        request.headers['x-correlation-id'] ||
        'unknown',
      userId: request.user?.id || request.auth?.userId,
      organizationId: request.user?.organizationId || request.auth?.orgId,
      method: request.method,
      path: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
    };
  },
);
