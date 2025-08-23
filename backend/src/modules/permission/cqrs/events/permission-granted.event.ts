import { IEvent } from '@nestjs/cqrs';

/**
 * Event emitted when a permission is granted to a user
 */
export class PermissionGrantedEvent implements IEvent {
  constructor(
    public readonly userProfileId: string,
    public readonly permissionId: string,
    public readonly permissionCode: string,
    public readonly grantedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}