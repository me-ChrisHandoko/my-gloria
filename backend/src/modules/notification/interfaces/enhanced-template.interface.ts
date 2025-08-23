import { NotificationType } from '../enums/notification.enum';

export interface EnhancedNotificationTemplate {
  id: string;
  type: NotificationType;
  name: string;
  description?: string;
  subject: {
    [locale: string]: string;
  };
  body: {
    [locale: string]: string;
  };
  mjmlTemplate?: {
    [locale: string]: string;
  };
  variables: TemplateVariable[];
  metadata?: {
    version: number;
    author?: string;
    createdAt: Date;
    updatedAt: Date;
    tags?: string[];
  };
  abTesting?: ABTestingConfig;
  active: boolean;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  description?: string;
  defaultValue?: any;
  format?: string; // For dates, numbers, etc.
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

export interface ABTestingConfig {
  enabled: boolean;
  variants: ABTestVariant[];
  distribution: 'random' | 'weighted' | 'user-based';
  startDate?: Date;
  endDate?: Date;
  metrics?: string[];
}

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number; // 0-100
  subject?: {
    [locale: string]: string;
  };
  body?: {
    [locale: string]: string;
  };
  mjmlTemplate?: {
    [locale: string]: string;
  };
}

export interface TemplateRenderOptions {
  locale: string;
  variables: Record<string, any>;
  format: 'text' | 'html' | 'mjml';
  variant?: string; // A/B testing variant ID
  userId?: string; // For user-based A/B testing
  preview?: boolean;
}

export interface RenderedEnhancedTemplate {
  subject: string;
  body: string;
  html?: string;
  mjml?: string;
  variant?: string;
  locale: string;
  metadata?: {
    renderTime: number;
    templateId: string;
    templateVersion: number;
  };
}

export interface TemplatePreviewRequest {
  templateId: string;
  locale: string;
  sampleData?: Record<string, any>;
  format: 'text' | 'html' | 'mjml';
  variant?: string;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors?: {
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }[];
  warnings?: string[];
}
