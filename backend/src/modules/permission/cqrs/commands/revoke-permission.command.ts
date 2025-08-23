import { ICommand } from '@nestjs/cqrs';

/**
 * Command to revoke a permission from a user
 * Part of the CQRS write model
 */
export class RevokePermissionCommand implements ICommand {
  constructor(
    public readonly userProfileId: string,
    public readonly permissionId: string,
    public readonly revokedBy: string,
    public readonly reason?: string,
  ) {}
}