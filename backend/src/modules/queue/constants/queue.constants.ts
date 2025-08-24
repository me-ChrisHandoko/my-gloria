export const QUEUE_NAMES = {
  BACKUP: 'backup-queue',
  NOTIFICATION: 'notification-queue',
  AUDIT: 'audit-queue',
  MAINTENANCE: 'maintenance-queue',
} as const;

export const JOB_NAMES = {
  BACKUP: {
    CREATE_BACKUP: 'create-backup',
    RESTORE_BACKUP: 'restore-backup',
    SCHEDULE_BACKUP: 'schedule-backup',
    CLEANUP_OLD_BACKUPS: 'cleanup-old-backups',
  },
} as const;

export const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const BACKUP_JOB_PRIORITY = {
  SCHEDULED: 1,
  MANUAL: 2,
  URGENT: 3,
} as const;