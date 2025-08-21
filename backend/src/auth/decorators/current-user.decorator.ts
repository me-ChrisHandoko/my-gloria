import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to get current authenticated user from request
 * Usage: @CurrentUser() user: any
 */
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

/**
 * Decorator to get current auth context from request
 * Usage: @CurrentAuth() auth: any
 */
export const CurrentAuth = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const auth = request.auth;

    return data ? auth?.[data] : auth;
  },
);
