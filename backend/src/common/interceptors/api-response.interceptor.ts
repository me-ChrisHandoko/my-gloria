import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto, PaginatedResponseDto } from '../dto/api-response.dto';
import { PaginationResponseDto } from '../dto/pagination.dto';

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    return next.handle().pipe(
      map((data) => {
        // If response is already wrapped, return as is
        if (data instanceof ApiResponseDto) {
          if (!data.meta?.path) {
            data.meta = {
              timestamp: data.meta?.timestamp || new Date().toISOString(),
              ...data.meta,
              path,
            };
          }
          return data;
        }

        // Handle pagination responses
        if (data instanceof PaginationResponseDto) {
          return PaginatedResponseDto.paginate(
            data.data,
            data.total,
            data.page,
            data.limit,
            undefined,
            { path },
          );
        }

        // Handle paginated response structure
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'total' in data &&
          'page' in data &&
          'limit' in data
        ) {
          return PaginatedResponseDto.paginate(
            data.data,
            data.total,
            data.page,
            data.limit,
            undefined,
            { path },
          );
        }

        // Wrap regular responses
        return ApiResponseDto.success(data, undefined, { path });
      }),
    );
  }
}