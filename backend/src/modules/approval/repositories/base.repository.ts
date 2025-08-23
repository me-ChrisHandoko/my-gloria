import { PrismaService } from '../../../prisma/prisma.service';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class BaseRepository<T> {
  constructor(protected readonly prisma: PrismaService) {}

  protected buildPagination(options?: PaginationOptions) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    return {
      skip,
      take: limit,
      page,
      limit,
    };
  }

  protected createPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
