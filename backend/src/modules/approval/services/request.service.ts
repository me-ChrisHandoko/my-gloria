import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Request, RequestStatus, ApprovalStatus, Prisma } from '@prisma/client';
import { CreateRequestDto, UpdateRequestDto, CancelRequestDto, RequestFilterDto } from '../dto/request.dto';

@Injectable()
export class RequestService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRequestDto, requesterProfileId: string): Promise<Request> {
    const requestNumber = await this.generateRequestNumber(dto.module);

    return this.prisma.request.create({
      data: {
        id: this.generateId(),
        requestNumber,
        module: dto.module,
        requesterProfileId,
        requestType: dto.requestType,
        details: dto.details,
        status: RequestStatus.PENDING,
        currentStep: 1,
      },
      include: {
        requester: true,
        approvalSteps: true,
        attachments: true,
      },
    });
  }

  async findAll(filter?: RequestFilterDto): Promise<Request[]> {
    const where: Prisma.RequestWhereInput = {};

    if (filter) {
      if (filter.module) where.module = filter.module;
      if (filter.requestType) where.requestType = filter.requestType;
      if (filter.status) where.status = filter.status;
      if (filter.requesterProfileId) where.requesterProfileId = filter.requesterProfileId;
      
      if (filter.startDate || filter.endDate) {
        where.createdAt = {};
        if (filter.startDate) {
          where.createdAt.gte = new Date(filter.startDate);
        }
        if (filter.endDate) {
          where.createdAt.lte = new Date(filter.endDate);
        }
      }
    }

    return this.prisma.request.findMany({
      where,
      include: {
        requester: true,
        approvalSteps: {
          include: {
            approver: true,
          },
        },
        attachments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Request> {
    const request = await this.prisma.request.findUnique({
      where: { id },
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
      throw new NotFoundException(`Request with number ${requestNumber} not found`);
    }

    return request;
  }

  async findMyRequests(requesterProfileId: string, filter?: RequestFilterDto): Promise<Request[]> {
    const where: Prisma.RequestWhereInput = {
      requesterProfileId,
    };

    if (filter) {
      if (filter.module) where.module = filter.module;
      if (filter.requestType) where.requestType = filter.requestType;
      if (filter.status) where.status = filter.status;
      
      if (filter.startDate || filter.endDate) {
        where.createdAt = {};
        if (filter.startDate) {
          where.createdAt.gte = new Date(filter.startDate);
        }
        if (filter.endDate) {
          where.createdAt.lte = new Date(filter.endDate);
        }
      }
    }

    return this.prisma.request.findMany({
      where,
      include: {
        requester: true,
        approvalSteps: {
          include: {
            approver: true,
          },
        },
        attachments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findPendingApprovals(approverProfileId: string): Promise<Request[]> {
    return this.prisma.request.findMany({
      where: {
        approvalSteps: {
          some: {
            approverProfileId,
            status: ApprovalStatus.WAITING,
          },
        },
        status: {
          in: [RequestStatus.PENDING, RequestStatus.IN_PROGRESS],
        },
      },
      include: {
        requester: true,
        approvalSteps: {
          include: {
            approver: true,
          },
        },
        attachments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, dto: UpdateRequestDto, updaterProfileId: string): Promise<Request> {
    const request = await this.findOne(id);

    // Only requester can update their own request
    if (request.requesterProfileId !== updaterProfileId) {
      throw new ForbiddenException('You can only update your own requests');
    }

    // Can only update pending requests
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Can only update pending requests');
    }

    return this.prisma.request.update({
      where: { id },
      data: {
        details: dto.details !== undefined ? dto.details : (request.details as any),
      },
      include: {
        requester: true,
        approvalSteps: {
          include: {
            approver: true,
          },
        },
        attachments: true,
      },
    });
  }

  async cancel(id: string, dto: CancelRequestDto, cancelerProfileId: string): Promise<Request> {
    const request = await this.findOne(id);

    // Only requester can cancel their own request
    if (request.requesterProfileId !== cancelerProfileId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    // Can only cancel pending or in-progress requests
    const cancellableStatuses: RequestStatus[] = [RequestStatus.PENDING, RequestStatus.IN_PROGRESS];
    if (!cancellableStatuses.includes(request.status)) {
      throw new BadRequestException('Can only cancel pending or in-progress requests');
    }

    return this.prisma.request.update({
      where: { id },
      data: {
        status: RequestStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: dto.cancelReason,
      },
      include: {
        requester: true,
        approvalSteps: {
          include: {
            approver: true,
          },
        },
        attachments: true,
      },
    });
  }

  async updateStatus(id: string, status: RequestStatus): Promise<Request> {
    return this.prisma.request.update({
      where: { id },
      data: {
        status,
        completedAt: status === RequestStatus.APPROVED ? new Date() : undefined,
      },
      include: {
        requester: true,
        approvalSteps: {
          include: {
            approver: true,
          },
        },
        attachments: true,
      },
    });
  }

  async updateCurrentStep(id: string, currentStep: number): Promise<Request> {
    return this.prisma.request.update({
      where: { id },
      data: {
        currentStep,
        status: RequestStatus.IN_PROGRESS,
      },
      include: {
        requester: true,
        approvalSteps: {
          include: {
            approver: true,
          },
        },
        attachments: true,
      },
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
      const lastSequence = parseInt(lastRequest.requestNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `REQ-${module.toUpperCase()}-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}