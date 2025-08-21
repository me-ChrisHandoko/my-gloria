import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalMatrix, Prisma } from '@prisma/client';
import { CreateApprovalMatrixDto, UpdateApprovalMatrixDto, ApprovalMatrixFilterDto } from '../dto/approval-matrix.dto';

@Injectable()
export class ApprovalMatrixService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateApprovalMatrixDto, createdBy: string): Promise<ApprovalMatrix> {
    // Check for duplicate
    const existing = await this.prisma.approvalMatrix.findUnique({
      where: {
        module_requesterRole_approvalSequence: {
          module: dto.module,
          requesterRole: dto.requesterRole || '',
          approvalSequence: dto.approvalSequence,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Approval matrix with the same module, requester role, and sequence already exists');
    }

    return this.prisma.approvalMatrix.create({
      data: {
        id: this.generateId(),
        ...dto,
        createdBy,
      },
    });
  }

  async findAll(filter?: ApprovalMatrixFilterDto): Promise<ApprovalMatrix[]> {
    const where: Prisma.ApprovalMatrixWhereInput = {};

    if (filter) {
      if (filter.module) where.module = filter.module;
      if (filter.requesterRole) where.requesterRole = filter.requesterRole;
      if (filter.requesterPosition) where.requesterPosition = filter.requesterPosition;
      if (filter.isActive !== undefined) where.isActive = filter.isActive;
    }

    return this.prisma.approvalMatrix.findMany({
      where,
      orderBy: [
        { module: 'asc' },
        { requesterRole: 'asc' },
        { approvalSequence: 'asc' },
      ],
    });
  }

  async findOne(id: string): Promise<ApprovalMatrix> {
    const matrix = await this.prisma.approvalMatrix.findUnique({
      where: { id },
    });

    if (!matrix) {
      throw new NotFoundException(`Approval matrix with ID ${id} not found`);
    }

    return matrix;
  }

  async findByModule(module: string, requesterRole?: string, requesterPosition?: string): Promise<ApprovalMatrix[]> {
    const where: Prisma.ApprovalMatrixWhereInput = {
      module,
      isActive: true,
    };

    // Match by role or position
    if (requesterRole || requesterPosition) {
      where.OR = [];
      if (requesterRole) {
        where.OR.push({ requesterRole });
      }
      if (requesterPosition) {
        where.OR.push({ requesterPosition });
      }
      // Also include generic rules (no specific requester)
      where.OR.push({ requesterRole: null, requesterPosition: null });
    }

    return this.prisma.approvalMatrix.findMany({
      where,
      orderBy: {
        approvalSequence: 'asc',
      },
    });
  }

  async update(id: string, dto: UpdateApprovalMatrixDto): Promise<ApprovalMatrix> {
    const existing = await this.findOne(id);

    // Check for duplicate if changing unique fields
    if (dto.module || dto.requesterRole !== undefined || dto.approvalSequence) {
      const duplicate = await this.prisma.approvalMatrix.findFirst({
        where: {
          module: dto.module || existing.module,
          requesterRole: dto.requesterRole !== undefined ? dto.requesterRole : existing.requesterRole,
          approvalSequence: dto.approvalSequence || existing.approvalSequence,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException('Approval matrix with the same module, requester role, and sequence already exists');
      }
    }

    return this.prisma.approvalMatrix.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.approvalMatrix.delete({
      where: { id },
    });
  }

  async toggleActive(id: string): Promise<ApprovalMatrix> {
    const matrix = await this.findOne(id);
    return this.prisma.approvalMatrix.update({
      where: { id },
      data: { isActive: !matrix.isActive },
    });
  }

  async duplicateMatrix(sourceModule: string, targetModule: string, createdBy: string): Promise<ApprovalMatrix[]> {
    const sourceMatrices = await this.prisma.approvalMatrix.findMany({
      where: { module: sourceModule },
    });

    if (sourceMatrices.length === 0) {
      throw new NotFoundException(`No approval matrices found for module ${sourceModule}`);
    }

    const newMatrices = await Promise.all(
      sourceMatrices.map(matrix =>
        this.prisma.approvalMatrix.create({
          data: {
            id: this.generateId(),
            module: targetModule,
            requesterRole: matrix.requesterRole,
            requesterPosition: matrix.requesterPosition,
            approvalSequence: matrix.approvalSequence,
            approverType: matrix.approverType,
            approverValue: matrix.approverValue,
            conditions: matrix.conditions as any,
            isActive: matrix.isActive,
            createdBy,
          },
        })
      )
    );

    return newMatrices;
  }

  private generateId(): string {
    return `apm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}