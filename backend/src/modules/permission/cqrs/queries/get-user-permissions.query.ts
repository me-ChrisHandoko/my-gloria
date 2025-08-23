import { IQuery } from '@nestjs/cqrs';

/**
 * Query to get all permissions for a user
 * Part of the CQRS read model
 */
export class GetUserPermissionsQuery implements IQuery {
  constructor(
    public readonly userProfileId: string,
    public readonly includeInherited?: boolean,
    public readonly includeExpired?: boolean,
  ) {}
}