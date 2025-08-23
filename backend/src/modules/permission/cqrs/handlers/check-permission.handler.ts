import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CheckPermissionQuery } from '../queries/check-permission.query';
import { PermissionReadModelService } from '../../services/permission-read-model.service';
import { PermissionCheckResultDto } from '../../dto/permission/check-permission.dto';

/**
 * Query handler for checking permissions
 * Uses the read model for optimized queries
 */
@QueryHandler(CheckPermissionQuery)
export class CheckPermissionHandler
  implements IQueryHandler<CheckPermissionQuery>
{
  constructor(
    private readonly readModelService: PermissionReadModelService,
  ) {}

  async execute(
    query: CheckPermissionQuery,
  ): Promise<PermissionCheckResultDto> {
    const { userProfileId, resource, action, scope, context } = query;

    // Use the read model service for optimized permission checking
    return this.readModelService.checkPermission(
      userProfileId,
      resource,
      action,
      scope,
      context,
    );
  }
}