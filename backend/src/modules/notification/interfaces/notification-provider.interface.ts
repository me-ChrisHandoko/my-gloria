export interface NotificationSendOptions {
  to: string | string[];
  subject?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: Array<{
    name: string;
    content: string;
    contentType: string;
  }>;
  headers?: Record<string, string>;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  tag?: string;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  messageId: string;
  status: 'sent' | 'queued' | 'failed';
  provider: string;
  timestamp: Date;
  error?: string;
  details?: Record<string, any>;
}

export interface NotificationStatus {
  messageId: string;
  status: 'delivered' | 'bounced' | 'deferred' | 'failed' | 'pending';
  timestamp: Date;
  events?: Array<{
    type: string;
    timestamp: Date;
    details?: Record<string, any>;
  }>;
}

export interface WebhookPayload {
  type: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface NotificationProvider {
  name: string;
  
  send(options: NotificationSendOptions): Promise<NotificationResult>;
  
  getStatus(messageId: string): Promise<NotificationStatus>;
  
  handleWebhook(payload: WebhookPayload): Promise<void>;
  
  validateConfiguration(): Promise<boolean>;
  
  isHealthy(): Promise<boolean>;
}

export interface ProviderFactory {
  createProvider(type: 'email' | 'sms' | 'whatsapp'): NotificationProvider;
}