import { PolicyType } from '@prisma/client';

export interface PolicyContext {
  userId: string;
  userProfileId: string;
  timestamp?: Date;
  location?: {
    ipAddress?: string;
    country?: string;
    city?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  attributes?: Record<string, any>;
  department?: string;
  school?: string;
  position?: string;
  roles?: string[];
}

export interface PolicyEvaluationResult {
  isApplicable: boolean;
  grantedPermissions: string[];
  deniedPermissions?: string[];
  reason?: string;
  metadata?: Record<string, any>;
}

export interface IPolicyEvaluator {
  type: PolicyType;
  evaluate(rules: any, context: PolicyContext): Promise<PolicyEvaluationResult>;
  validate(rules: any): boolean;
}

export interface PolicyRule {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'in'
    | 'not_in'
    | 'greater_than'
    | 'less_than'
    | 'between';
  value: any;
  condition?: 'AND' | 'OR';
}

export interface TimeBasedRule {
  schedule?: {
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    startTime?: string; // HH:mm format
    endTime?: string; // HH:mm format
    timezone?: string;
  };
  dateRange?: {
    startDate?: Date;
    endDate?: Date;
  };
  recurringPeriods?: Array<{
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    value: number;
  }>;
}

export interface LocationBasedRule {
  allowedLocations?: Array<{
    type: 'ip' | 'country' | 'city' | 'coordinates';
    value: string | { latitude: number; longitude: number; radius: number };
  }>;
  deniedLocations?: Array<{
    type: 'ip' | 'country' | 'city' | 'coordinates';
    value: string | { latitude: number; longitude: number; radius: number };
  }>;
}

export interface AttributeBasedRule {
  userAttributes?: PolicyRule[];
  resourceAttributes?: PolicyRule[];
  environmentAttributes?: PolicyRule[];
}
