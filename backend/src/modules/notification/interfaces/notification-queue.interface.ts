import {
  Priority,
  NotificationChannel,
  NotificationType,
} from '@prisma/client';

export interface NotificationJob {
  id: string;
  userProfileId: string;
  type?: NotificationType;
  channels: NotificationChannel[];
  priority: Priority;
  payload: NotificationPayload;
  retryCount?: number;
  maxRetries?: number;
}

export interface NotificationPayload {
  title: string;
  message: string;
  data?: Record<string, any>;
  templateId?: string;
  templateVariables?: Record<string, any>;
  timestamp?: Date;
  recipient?: string;
}

export interface NotificationQueueOptions {
  delay?: number;
  priority?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}
