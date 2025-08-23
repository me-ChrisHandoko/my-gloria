import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ApprovalMatrix, Prisma } from '@prisma/client';
import {
  CreateApprovalMatrixDto,
  UpdateApprovalMatrixDto,
  ApprovalMatrixFilterDto,
} from '../dto/approval-matrix.dto';
import { v7 as uuidv7 } from 'uuid';
import { ApprovalMatrixRepository } from '../repositories/approval-matrix.repository';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ApprovalMatrixService {
  constructor(
    private readonly approvalMatrixRepository: ApprovalMatrixRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateApprovalMatrixDto,
    createdBy: string,
  ): Promise<ApprovalMatrix> {
    // Check for duplicate
    const existing = await this.approvalMatrixRepository.exists(
      dto.module,
      dto.approvalSequence,
      dto.approverType,
      dto.approverValue,
    );

    if (existing) {
      throw new ConflictException(
        'Approval matrix with the same module, requester role, and sequence already exists',
      );
    }

    return this.approvalMatrixRepository.create({
      id: this.generateId(),
      ...dto,
      createdBy,
    });
  }

  async findAll(filter?: ApprovalMatrixFilterDto): Promise<ApprovalMatrix[]> {
    const result = await this.approvalMatrixRepository.findAll(filter);
    return result.data;
  }

  async findOne(id: string): Promise<ApprovalMatrix> {
    const matrix = await this.approvalMatrixRepository.findById(id);

    if (!matrix) {
      throw new NotFoundException(`Approval matrix with ID ${id} not found`);
    }

    return matrix;
  }

  async findByModule(
    module: string,
    requesterRole?: string,
    requesterPosition?: string,
  ): Promise<ApprovalMatrix[]> {
    return this.approvalMatrixRepository.findApplicableMatrices(
      module,
      requesterRole,
      requesterPosition,
    );
  }

  async update(
    id: string,
    dto: UpdateApprovalMatrixDto,
  ): Promise<ApprovalMatrix> {
    const existing = await this.findOne(id);

    // Check for duplicate if changing unique fields
    if (dto.module || dto.requesterRole !== undefined || dto.approvalSequence) {
      const exists = await this.approvalMatrixRepository.exists(
        dto.module || existing.module,
        dto.approvalSequence || existing.approvalSequence,
        dto.approverType || existing.approverType,
        dto.approverValue || existing.approverValue,
      );

      if (exists && existing.id !== id) {
        throw new ConflictException(
          'Approval matrix with the same module, requester role, and sequence already exists',
        );
      }
    }

    return this.approvalMatrixRepository.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.approvalMatrixRepository.delete(id);
  }

  async toggleActive(id: string): Promise<ApprovalMatrix> {
    const matrix = await this.findOne(id);
    return this.approvalMatrixRepository.setActive(id, !matrix.isActive);
  }

  async duplicateMatrix(
    sourceModule: string,
    targetModule: string,
    createdBy: string,
  ): Promise<ApprovalMatrix[]> {
    const sourceMatrices =
      await this.approvalMatrixRepository.findByModule(sourceModule);

    if (sourceMatrices.length === 0) {
      throw new NotFoundException(
        `No approval matrices found for module ${sourceModule}`,
      );
    }

    const newMatrices = await Promise.all(
      sourceMatrices.map((matrix) =>
        this.approvalMatrixRepository.create({
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
        }),
      ),
    );

    return newMatrices;
  }

  async findByModuleWithTx(
    tx: Prisma.TransactionClient,
    module: string,
    requesterRole?: string,
    requesterPosition?: string,
  ): Promise<ApprovalMatrix[]> {
    const where: Prisma.ApprovalMatrixWhereInput = {
      module,
      isActive: true,
    };

    // Build OR conditions for requester matching
    if (requesterRole || requesterPosition) {
      where.OR = [];

      // Specific requester role/position match
      if (requesterRole && requesterPosition) {
        where.OR.push({ requesterRole, requesterPosition });
        where.OR.push({ requesterRole, requesterPosition: null });
        where.OR.push({ requesterRole: null, requesterPosition });
      } else if (requesterRole) {
        where.OR.push({ requesterRole });
      } else if (requesterPosition) {
        where.OR.push({ requesterPosition });
      }

      // Also include generic rules (no specific requester)
      where.OR.push({ requesterRole: null, requesterPosition: null });
    }

    return tx.approvalMatrix.findMany({
      where,
      orderBy: {
        approvalSequence: 'asc',
      },
    });
  }

  private generateId(): string {
    return uuidv7();
  }
}
