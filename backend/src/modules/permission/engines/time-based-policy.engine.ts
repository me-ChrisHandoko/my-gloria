import { Injectable } from '@nestjs/common';
import { PolicyType } from '@prisma/client';
import {
  IPolicyEvaluator,
  PolicyContext,
  PolicyEvaluationResult,
  TimeBasedRule,
} from '../interfaces/policy-evaluator.interface';

@Injectable()
export class TimeBasedPolicyEngine implements IPolicyEvaluator {
  type = PolicyType.TIME_BASED;

  async evaluate(
    rules: TimeBasedRule,
    context: PolicyContext,
  ): Promise<PolicyEvaluationResult> {
    const now = context.timestamp || new Date();
    let isApplicable = true;
    const reasons: string[] = [];

    // Check schedule
    if (rules.schedule) {
      const scheduleResult = this.evaluateSchedule(rules.schedule, now);
      if (!scheduleResult.isValid) {
        isApplicable = false;
        reasons.push(scheduleResult.reason);
      }
    }

    // Check date range
    if (rules.dateRange) {
      const rangeResult = this.evaluateDateRange(rules.dateRange, now);
      if (!rangeResult.isValid) {
        isApplicable = false;
        reasons.push(rangeResult.reason);
      }
    }

    // Check recurring periods
    if (rules.recurringPeriods?.length) {
      const recurringResult = this.evaluateRecurringPeriods(
        rules.recurringPeriods,
        now,
      );
      if (!recurringResult.isValid) {
        isApplicable = false;
        reasons.push(recurringResult.reason);
      }
    }

    return {
      isApplicable,
      grantedPermissions: isApplicable ? [] : [],
      reason: reasons.length > 0 ? reasons.join('; ') : undefined,
      metadata: {
        evaluatedAt: now,
        timezone: rules.schedule?.timezone || 'UTC',
      },
    };
  }

  validate(rules: any): boolean {
    if (!rules || typeof rules !== 'object') {
      return false;
    }

    const timeRule = rules as TimeBasedRule;

    // Validate schedule
    if (timeRule.schedule) {
      if (timeRule.schedule.daysOfWeek) {
        if (
          !Array.isArray(timeRule.schedule.daysOfWeek) ||
          !timeRule.schedule.daysOfWeek.every((day) => day >= 0 && day <= 6)
        ) {
          return false;
        }
      }

      if (
        timeRule.schedule.startTime &&
        !this.isValidTimeFormat(timeRule.schedule.startTime)
      ) {
        return false;
      }

      if (
        timeRule.schedule.endTime &&
        !this.isValidTimeFormat(timeRule.schedule.endTime)
      ) {
        return false;
      }
    }

    // Validate date range
    if (timeRule.dateRange) {
      if (timeRule.dateRange.startDate && timeRule.dateRange.endDate) {
        const start = new Date(timeRule.dateRange.startDate);
        const end = new Date(timeRule.dateRange.endDate);
        if (start >= end) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateSchedule(
    schedule: TimeBasedRule['schedule'],
    now: Date,
  ): { isValid: boolean; reason: string } {
    if (!schedule) {
      return { isValid: true, reason: '' };
    }

    // Convert to timezone if specified
    const localTime = this.convertToTimezone(now, schedule.timezone || 'UTC');
    const dayOfWeek = localTime.getDay();
    const currentTime = `${String(localTime.getHours()).padStart(2, '0')}:${String(localTime.getMinutes()).padStart(2, '0')}`;

    // Check day of week
    if (schedule.daysOfWeek && !schedule.daysOfWeek.includes(dayOfWeek)) {
      return {
        isValid: false,
        reason: `Access not allowed on ${this.getDayName(dayOfWeek)}`,
      };
    }

    // Check time range
    if (schedule.startTime && currentTime < schedule.startTime) {
      return {
        isValid: false,
        reason: `Access not allowed before ${schedule.startTime}`,
      };
    }

    if (schedule.endTime && currentTime > schedule.endTime) {
      return {
        isValid: false,
        reason: `Access not allowed after ${schedule.endTime}`,
      };
    }

    return { isValid: true, reason: '' };
  }

  private evaluateDateRange(
    dateRange: TimeBasedRule['dateRange'],
    now: Date,
  ): { isValid: boolean; reason: string } {
    if (!dateRange) {
      return { isValid: true, reason: '' };
    }

    if (dateRange.startDate && now < new Date(dateRange.startDate)) {
      return {
        isValid: false,
        reason: `Policy not active until ${new Date(dateRange.startDate).toLocaleDateString()}`,
      };
    }

    if (dateRange.endDate && now > new Date(dateRange.endDate)) {
      return {
        isValid: false,
        reason: `Policy expired on ${new Date(dateRange.endDate).toLocaleDateString()}`,
      };
    }

    return { isValid: true, reason: '' };
  }

  private evaluateRecurringPeriods(
    periods: TimeBasedRule['recurringPeriods'],
    now: Date,
  ): { isValid: boolean; reason: string } {
    // This is a simplified implementation
    // In production, you'd want more sophisticated recurring period logic
    for (const period of periods || []) {
      switch (period.type) {
        case 'daily':
          // Check if it's the right hour of day
          if (now.getHours() !== period.value) {
            return {
              isValid: false,
              reason: `Not in allowed daily period (hour ${period.value})`,
            };
          }
          break;
        case 'weekly':
          // Check if it's the right day of week
          if (now.getDay() !== period.value) {
            return {
              isValid: false,
              reason: `Not in allowed weekly period (day ${period.value})`,
            };
          }
          break;
        case 'monthly':
          // Check if it's the right day of month
          if (now.getDate() !== period.value) {
            return {
              isValid: false,
              reason: `Not in allowed monthly period (day ${period.value})`,
            };
          }
          break;
        case 'yearly':
          // Check if it's the right day of year
          const dayOfYear = Math.floor(
            (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
              86400000,
          );
          if (dayOfYear !== period.value) {
            return {
              isValid: false,
              reason: `Not in allowed yearly period (day ${period.value})`,
            };
          }
          break;
      }
    }

    return { isValid: true, reason: '' };
  }

  private isValidTimeFormat(time: string): boolean {
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  }

  private convertToTimezone(date: Date, timezone: string): Date {
    // Simplified timezone conversion
    // In production, use a proper timezone library like moment-timezone or date-fns-tz
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };

      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(date);

      const dateParts: any = {};
      parts.forEach((part) => {
        dateParts[part.type] = part.value;
      });

      return new Date(
        parseInt(dateParts.year),
        parseInt(dateParts.month) - 1,
        parseInt(dateParts.day),
        parseInt(dateParts.hour),
        parseInt(dateParts.minute),
      );
    } catch {
      return date;
    }
  }

  private getDayName(day: number): string {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[day] || 'Unknown';
  }
}
