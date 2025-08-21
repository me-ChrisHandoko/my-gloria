import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import {
  AUDIT_METADATA_KEY,
  SKIP_AUDIT_KEY,
  AuditMetadata,
} from '../interceptors/audit.interceptor';

/**
 * Decorator to configure audit logging for a controller method
 */
export const Audit = (metadata: AuditMetadata) =>
  SetMetadata(AUDIT_METADATA_KEY, metadata);

/**
 * Decorator to skip audit logging for a controller method
 */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);

/**
 * Decorator shortcuts for common audit scenarios
 */
export const AuditCreate = (
  entityType: string,
  options?: Partial<AuditMetadata>,
) =>
  Audit({
    entityType,
    action: AuditAction.CREATE,
    captureNewValues: true,
    ...options,
  });

export const AuditUpdate = (
  entityType: string,
  options?: Partial<AuditMetadata>,
) =>
  Audit({
    entityType,
    action: AuditAction.UPDATE,
    captureOldValues: true,
    captureNewValues: true,
    ...options,
  });

export const AuditDelete = (
  entityType: string,
  options?: Partial<AuditMetadata>,
) =>
  Audit({
    entityType,
    action: AuditAction.DELETE,
    captureOldValues: true,
    ...options,
  });

export const AuditApprove = (
  entityType: string,
  options?: Partial<AuditMetadata>,
) =>
  Audit({
    entityType,
    action: AuditAction.APPROVE,
    captureNewValues: true,
    ...options,
  });

export const AuditReject = (
  entityType: string,
  options?: Partial<AuditMetadata>,
) =>
  Audit({
    entityType,
    action: AuditAction.REJECT,
    captureNewValues: true,
    ...options,
  });
