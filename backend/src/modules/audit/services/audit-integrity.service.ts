import { Injectable, Logger } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditableChange } from '../interfaces/audit.interface';

export interface IntegrityVerificationResult {
  isValid: boolean;
  expectedHash?: string;
  actualHash?: string;
  reason?: string;
}

export interface ChainedAuditLog {
  id: string;
  hash: string;
  previousHash: string | null;
  signature: string;
  timestamp: Date;
}

@Injectable()
export class AuditIntegrityService {
  private readonly logger = new Logger(AuditIntegrityService.name);
  private readonly secretKey: string;
  private readonly hashAlgorithm = 'sha256';
  private readonly signatureAlgorithm = 'sha256';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.secretKey =
      this.configService.get<string>('AUDIT_INTEGRITY_SECRET') ||
      this.generateDefaultSecret();

    if (!this.configService.get<string>('AUDIT_INTEGRITY_SECRET')) {
      this.logger.warn(
        'AUDIT_INTEGRITY_SECRET not set, using generated secret. ' +
          'Please set this in production environment.',
      );
    }
  }

  /**
   * Generate hash for audit log entry with blockchain-style chaining
   */
  async generateIntegrityHash(
    entry: AuditableChange,
    previousHash?: string,
  ): Promise<ChainedAuditLog> {
    try {
      // Create deterministic string representation of the entry
      const entryData = this.createDeterministicString(entry);

      // Generate hash including previous hash for chain integrity
      const hashInput = previousHash
        ? `${previousHash}:${entryData}`
        : entryData;

      const hash = createHash(this.hashAlgorithm)
        .update(hashInput)
        .digest('hex');

      // Generate HMAC signature for tamper detection
      const signature = this.generateSignature(hash);

      return {
        id: entry.id || this.generateId(),
        hash,
        previousHash: previousHash || null,
        signature,
        timestamp: entry.createdAt || new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate integrity hash: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verify integrity of a single audit log entry
   */
  async verifyIntegrity(
    auditLogId: string,
  ): Promise<IntegrityVerificationResult> {
    try {
      const auditLog = await this.prisma.auditLog.findUnique({
        where: { id: auditLogId },
      });

      if (!auditLog) {
        return {
          isValid: false,
          reason: 'Audit log not found',
        };
      }

      // Check if integrity metadata exists
      const metadata = auditLog.metadata as any;
      const integrityMeta = metadata?.integrity as ChainedAuditLog;
      if (!integrityMeta) {
        return {
          isValid: false,
          reason: 'No integrity metadata found',
        };
      }

      // Verify signature
      const isSignatureValid = this.verifySignature(
        integrityMeta.hash,
        integrityMeta.signature,
      );

      if (!isSignatureValid) {
        return {
          isValid: false,
          reason: 'Invalid signature detected - possible tampering',
        };
      }

      // Recalculate hash and compare
      const recalculatedData = this.createDeterministicString({
        actorId: auditLog.actorId,
        action: auditLog.action,
        module: auditLog.module,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        oldValues: auditLog.oldValues,
        newValues: auditLog.newValues,
        createdAt: auditLog.createdAt,
      } as AuditableChange);

      const hashInput = integrityMeta.previousHash
        ? `${integrityMeta.previousHash}:${recalculatedData}`
        : recalculatedData;

      const expectedHash = createHash(this.hashAlgorithm)
        .update(hashInput)
        .digest('hex');

      const isValid = expectedHash === integrityMeta.hash;

      return {
        isValid,
        expectedHash,
        actualHash: integrityMeta.hash,
        reason: isValid ? 'Integrity verified' : 'Hash mismatch detected',
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify integrity for ${auditLogId}: ${error.message}`,
        error.stack,
      );
      return {
        isValid: false,
        reason: `Verification error: ${error.message}`,
      };
    }
  }

  /**
   * Verify integrity of the entire audit chain
   */
  async verifyChainIntegrity(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    isValid: boolean;
    totalChecked: number;
    invalidEntries: string[];
    brokenChainAt?: string;
  }> {
    try {
      const whereClause: any = {};

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const auditLogs = await this.prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          metadata: true,
          createdAt: true,
        },
      });

      let isValid = true;
      const invalidEntries: string[] = [];
      let previousHash: string | null = null;
      let brokenChainAt: string | undefined;

      for (const log of auditLogs) {
        const metadata = log.metadata as any;
        const integrityMeta = metadata?.integrity as ChainedAuditLog;

        if (!integrityMeta) {
          invalidEntries.push(log.id);
          continue;
        }

        // Check chain continuity
        if (previousHash && integrityMeta.previousHash !== previousHash) {
          isValid = false;
          brokenChainAt = log.id;
          this.logger.error(
            `Chain broken at ${log.id}: expected previous hash ${previousHash}, got ${integrityMeta.previousHash}`,
          );
          break;
        }

        // Verify individual entry
        const verification = await this.verifyIntegrity(log.id);
        if (!verification.isValid) {
          isValid = false;
          invalidEntries.push(log.id);
        }

        previousHash = integrityMeta.hash;
      }

      return {
        isValid: isValid && invalidEntries.length === 0,
        totalChecked: auditLogs.length,
        invalidEntries,
        brokenChainAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify chain integrity: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Repair chain integrity (for migration or recovery)
   */
  async repairChainIntegrity(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    repaired: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const whereClause: any = {};

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const auditLogs = await this.prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
      });

      let repaired = 0;
      let failed = 0;
      const errors: string[] = [];
      let previousHash: string | null = null;

      for (const log of auditLogs) {
        try {
          const integrityData = await this.generateIntegrityHash(
            {
              id: log.id,
              actorId: log.actorId,
              action: log.action,
              module: log.module,
              entityType: log.entityType,
              entityId: log.entityId,
              oldValues: log.oldValues,
              newValues: log.newValues,
              createdAt: log.createdAt,
            } as AuditableChange,
            previousHash || undefined,
          );

          await this.prisma.auditLog.update({
            where: { id: log.id },
            data: {
              metadata: {
                ...((log.metadata as any) || {}),
                integrity: integrityData,
              },
            },
          });

          previousHash = integrityData.hash;
          repaired++;
        } catch (error) {
          failed++;
          errors.push(`${log.id}: ${error.message}`);
          this.logger.error(
            `Failed to repair integrity for ${log.id}: ${error.message}`,
          );
        }
      }

      return { repaired, failed, errors };
    } catch (error) {
      this.logger.error(
        `Failed to repair chain integrity: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get the last valid hash in the chain
   */
  async getLastChainHash(): Promise<string | null> {
    try {
      const lastLog = await this.prisma.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { metadata: true },
      });

      if (!lastLog || !lastLog.metadata) {
        return null;
      }

      const metadata = lastLog.metadata as any;
      const integrityMeta = metadata?.integrity as ChainedAuditLog;
      return integrityMeta?.hash || null;
    } catch (error) {
      this.logger.error(
        `Failed to get last chain hash: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Create deterministic string representation of audit entry
   */
  private createDeterministicString(entry: AuditableChange): string {
    const components = [
      entry.actorId,
      entry.action,
      entry.module,
      entry.entityType,
      entry.entityId,
      JSON.stringify(entry.oldValues || {}),
      JSON.stringify(entry.newValues || {}),
      entry.createdAt?.toISOString() || new Date().toISOString(),
    ];

    return components.join('|');
  }

  /**
   * Generate HMAC signature for a hash
   */
  private generateSignature(hash: string): string {
    return createHmac(this.signatureAlgorithm, this.secretKey)
      .update(hash)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  private verifySignature(hash: string, signature: string): boolean {
    const expectedSignature = this.generateSignature(hash);
    return expectedSignature === signature;
  }

  /**
   * Generate default secret (for development only)
   */
  private generateDefaultSecret(): string {
    return createHash('sha256')
      .update(`audit-integrity-${Date.now()}-${Math.random()}`)
      .digest('hex');
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return uuidv7();
  }

  /**
   * Export integrity report
   */
  async exportIntegrityReport(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    generatedAt: Date;
    period: { start?: Date; end?: Date };
    chainStatus: any;
    statistics: {
      totalEntries: number;
      verifiedEntries: number;
      invalidEntries: number;
      missingIntegrity: number;
    };
    recommendations: string[];
  }> {
    const chainStatus = await this.verifyChainIntegrity(startDate, endDate);

    const whereClause: any = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const stats = await this.prisma.auditLog.aggregate({
      where: whereClause,
      _count: true,
    });

    const missingIntegrity = await this.prisma.auditLog.count({
      where: {
        ...whereClause,
        metadata: {
          path: ['integrity'],
          equals: null,
        },
      },
    });

    const recommendations: string[] = [];

    if (!chainStatus.isValid) {
      recommendations.push(
        'Chain integrity is broken. Consider running repair operation.',
      );
    }

    if (missingIntegrity > 0) {
      recommendations.push(
        `${missingIntegrity} entries missing integrity data. Run repair to add integrity.`,
      );
    }

    if (chainStatus.invalidEntries.length > 0) {
      recommendations.push(
        'Invalid entries detected. Investigate potential tampering.',
      );
    }

    return {
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      chainStatus,
      statistics: {
        totalEntries: stats._count,
        verifiedEntries:
          chainStatus.totalChecked - chainStatus.invalidEntries.length,
        invalidEntries: chainStatus.invalidEntries.length,
        missingIntegrity,
      },
      recommendations,
    };
  }
}
