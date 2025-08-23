import { ICommand } from '@nestjs/cqrs';
import { PermissionAction, PermissionScope } from '@prisma/client';

/**
 * Command to create a new permission
 * Part of the CQRS write model
 */
export class CreatePermissionCommand implements ICommand {
  constructor(
    public readonly code: string,
    public readonly name: string,
    public readonly description: string,
    public readonly resource: string,
    public readonly action: PermissionAction,
    public readonly createdBy: string,
    public readonly scope?: PermissionScope,
    public readonly groupId?: string,
    public readonly conditions?: any,
    public readonly isSystem?: boolean,
    public readonly dependencies?: string[],
  ) {}
}