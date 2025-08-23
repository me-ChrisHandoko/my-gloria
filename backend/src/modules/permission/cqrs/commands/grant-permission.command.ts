import { ICommand } from '@nestjs/cqrs';

/**
 * Command to grant a permission to a user
 * Part of the CQRS write model
 */
export class GrantPermissionCommand implements ICommand {
  constructor(
    public readonly userProfileId: string,
    public readonly permissionId: string,
    public readonly grantedBy: string,
    public readonly validFrom?: Date,
    public readonly validUntil?: Date,
    public readonly reason?: string,
  ) {}
}