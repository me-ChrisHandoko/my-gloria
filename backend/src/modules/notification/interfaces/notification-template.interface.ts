import { NotificationType } from '../enums/notification.enum';

export interface NotificationTemplate {
  type: NotificationType;
  subject: string;
  body: string;
  variables?: string[];
}

export interface NotificationTemplateVariables {
  [key: string]: string | number | boolean | Date;
}

export interface RenderedTemplate {
  subject: string;
  body: string;
  html?: string;
}
