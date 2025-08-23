import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FeatureFlagService } from '../services/feature-flag.service';

export interface ResponseWithFeatures<T> {
  data: T;
  features?: string[];
}

@Injectable()
export class FeatureFlagInterceptor<T>
  implements NestInterceptor<T, ResponseWithFeatures<T>>
{
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<ResponseWithFeatures<T>>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Get enabled features for the user
    let enabledFeatures: string[] = [];
    if (user?.userId) {
      const userGroups = user.roles || [];
      enabledFeatures = await this.featureFlagService.getEnabledFeatures(
        user.userId,
        userGroups,
      );
    }

    return next.handle().pipe(
      map((data) => {
        // If response is already formatted with data property, add features
        if (data && typeof data === 'object' && 'data' in data) {
          return {
            ...data,
            features: enabledFeatures,
          };
        }

        // Otherwise, wrap in data property and add features
        return {
          data,
          features: enabledFeatures,
        };
      }),
    );
  }
}
