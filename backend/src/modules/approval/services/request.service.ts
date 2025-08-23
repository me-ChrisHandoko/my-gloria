import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Request, RequestStatus, ApprovalStatus, Prisma } from '@prisma/client';
import {
  CreateRequestDto,
  UpdateRequestDto,
  CancelRequestDto,
  RequestFilterDto,
  RequestQueryDto,
} from '../dto/request.dto';
import { v7 as uuidv7 } from 'uuid';
import { RequestRepository } from '../repositories/request.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PaginatedResult,
  PaginationOptions,
} from '../repositories/base.repository';
import { PaginationResponseDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class RequestService {
  constructor(
    private readonly requestRepository: RequestRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateRequestDto,
    requesterProfileId: string,
  ): Promise<Request> {
    const requestNumber = await this.generateRequestNumber(dto.module);

    return this.requestRepository.create({
      id: this.generateId(),
      requestNumber,
      module: dto.module,
      requestType: dto.requestType,
      details: dto.details,
      status: RequestStatus.PENDING,
      currentStep: 1,
      requester: {
        connect: { id: requesterProfileId },
      },
    });
  }

  async findAll(
    filter?: RequestFilterDto,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Request>> {
    return this.requestRepository.findAll(filter, pagination);
  }

  async findAllWithQuery(
    query: RequestQueryDto,
  ): Promise<PaginationResponseDto<Request>> {
    const filter: RequestFilterDto = {
      module: query.module,
      requestType: query.requestType,
      status: query.status,
      requesterProfileId: query.requesterProfileId,
      startDate: query.startDate,
      endDate: query.endDate,
    };

    const pagination: PaginationOptions = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.requestRepository.findAll(filter, pagination);
    return new PaginationResponseDto(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  async findOne(id: string): Promise<Request> {
    const request = await this.requestRepository.findById(id);

    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    return request;
  }

  async findByRequestNumber(requestNumber: string): Promise<Request> {
    const request = await this.prisma.request.findUnique({
      where: { requestNumber },
      include: {
        requester: true,
        approvalSteps: {
          include: {
            approver: true,
          },
          orderBy: {
            sequence: 'asc',
          },
        },
        attachments: true,
      },
    });

    if (!request) {
      throw new NotFoundException(
        `Request with number ${requestNumber} not found`,
      );
    }

    return request;
  }

  async findMyRequests(
    requesterProfileId: string,
    filter?: RequestFilterDto,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Request>> {
    return this.requestRepository.findByRequester(
      requesterProfileId,
      filter,
      pagination,
    );
  }

  async findMyRequestsWithQuery(
    requesterProfileId: string,
    query: RequestQueryDto,
  ): Promise<PaginationResponseDto<Request>> {
    const filter: RequestFilterDto = {
      module: query.module,
      requestType: query.requestType,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    };

    const pagination: PaginationOptions = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.requestRepository.findByRequester(
      requesterProfileId,
      filter,
      pagination,
    );
    return new PaginationResponseDto(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  async findPendingApprovals(
    approverProfileId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Request>> {
    return this.requestRepository.findPendingForApprover(
      approverProfileId,
      pagination,
    );
  }

  async findPendingApprovalsWithPagination(
    approverProfileId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginationResponseDto<Request>> {
    const result = await this.requestRepository.findPendingForApprover(
      approverProfileId,
      { page, limit },
    );
    return new PaginationResponseDto(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  async update(
    id: string,
    dto: UpdateRequestDto,
    updaterProfileId: string,
  ): Promise<Request> {
    const request = await this.findOne(id);

    // Only requester can update their own request
    if (request.requesterProfileId !== updaterProfileId) {
      throw new ForbiddenException('You can only update your own requests');
    }

    // Can only update pending requests
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Can only update pending requests');
    }

    try {
      return await this.requestRepository.update(id, {
        details:
          dto.details !== undefined ? dto.details : (request.details as any),
        version: { increment: 1 },
      });
    } catch (error) {
      if (error.message.includes('Concurrent update detected')) {
        throw new ConflictException(
          'Request has been modified by another user. Please refresh and try again.',
        );
      }
      throw error;
    }
  }

  async cancel(
    id: string,
    dto: CancelRequestDto,
    cancelerProfileId: string,
  ): Promise<Request> {
    const request = await this.findOne(id);

    // Only requester can cancel their own request
    if (request.requesterProfileId !== cancelerProfileId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    // Can only cancel pending or in-progress requests
    const cancellableStatuses: RequestStatus[] = [
      RequestStatus.PENDING,
      RequestStatus.IN_PROGRESS,
    ];
    if (!cancellableStatuses.includes(request.status)) {
      throw new BadRequestException(
        'Can only cancel pending or in-progress requests',
      );
    }

    try {
      return await this.requestRepository.update(id, {
        status: RequestStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: dto.cancelReason,
        version: { increment: 1 },
      });
    } catch (error) {
      if (error.message.includes('Concurrent update detected')) {
        throw new ConflictException(
          'Request has been modified by another user. Please refresh and try again.',
        );
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: RequestStatus,
    expectedVersion?: number,
  ): Promise<Request> {
    try {
      return await this.requestRepository.updateStatus(
        id,
        status,
        expectedVersion,
      );
    } catch (error) {
      if (error.message.includes('Concurrent update detected')) {
        throw new ConflictException(
          'Request has been modified by another user. Please refresh and try again.',
        );
      }
      throw error;
    }
  }

  async updateCurrentStep(id: string, currentStep: number): Promise<Request> {
    return this.requestRepository.update(id, {
      currentStep,
      status: RequestStatus.IN_PROGRESS,
    });
  }

  private async generateRequestNumber(module: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Get the last request number for this month
    const lastRequest = await this.prisma.request.findFirst({
      where: {
        requestNumber: {
          startsWith: `REQ-${module.toUpperCase()}-${year}${month}`,
        },
      },
      orderBy: {
        requestNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastRequest) {
      const lastSequence = parseInt(
        lastRequest.requestNumber.split('-').pop() || '0',
      );
      sequence = lastSequence + 1;
    }

    return `REQ-${module.toUpperCase()}-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  private generateId(): string {
    return uuidv7();
  }
}
