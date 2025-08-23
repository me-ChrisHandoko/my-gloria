import { IQuery } from '@nestjs/cqrs';

/**
 * Query to check if a user has a specific permission
 * Part of the CQRS read model
 */
export class CheckPermissionQuery implements IQuery {
  constructor(
    public readonly userProfileId: string,
    public readonly resource: string,
    public readonly action: string,
    public readonly scope?: string,
    public readonly context?: Record<string, any>,
  ) {}
}