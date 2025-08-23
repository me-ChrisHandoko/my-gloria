export enum NotificationType {
  APPROVAL_REQUEST = 'APPROVAL_REQUEST',
  APPROVAL_RESULT = 'APPROVAL_RESULT',
  WORK_ORDER_UPDATE = 'WORK_ORDER_UPDATE',
  KPI_REMINDER = 'KPI_REMINDER',
  TRAINING_INVITATION = 'TRAINING_INVITATION',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  GENERAL = 'GENERAL',
  DELEGATION = 'DELEGATION',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
  REMINDER = 'REMINDER',
  ALERT = 'ALERT',
  USER_ACTION = 'USER_ACTION',
  DATA_CHANGE = 'DATA_CHANGE',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

// Alias for consistency with metrics service
export const NotificationPriority = Priority;

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
}
