import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { v7 as uuidv7 } from 'uuid';
import { Prisma } from '@prisma/client';
import { Cron } from '@nestjs/schedule';

export interface AnalyticsEventDto {
  userProfileId: string;
  permissionCode: string;
  action: 'check' | 'grant' | 'revoke' | 'use';
  resource?: string;
  resourceId?: string;
  result?: 'allowed' | 'denied' | 'error';
  responseTime?: number;
  context?: any;
}

export interface AnalyticsQueryDto {
  userProfileId?: string;
  permissionCode?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  includeAnomalies?: boolean;
  limit?: number;
  offset?: number;
}

export interface UsagePattern {
  permissionCode: string;
  totalChecks: number;
  allowedCount: number;
  deniedCount: number;
  avgResponseTime: number;
  peakHours: { hour: number; count: number }[];
  topResources: { resource: string; count: number }[];
}

export interface AnomalyReport {
  userProfileId: string;
  anomalies: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    detectedAt: Date;
    details: any;
  }[];
}

@Injectable()
export class PermissionAnalyticsService {
  private readonly ANOMALY_THRESHOLD = 0.7;
  private readonly RESPONSE_TIME_THRESHOLD = 1000; // 1 second

  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(dto: AnalyticsEventDto) {
    const anomalyAnalysis = await this.detectAnomaly(dto);

    await this.prisma.permissionAnalytics.create({
      data: {
        id: uuidv7(),
        userProfileId: dto.userProfileId,
        permissionCode: dto.permissionCode,
        action: dto.action,
        resource: dto.resource,
        resourceId: dto.resourceId,
        result: dto.result,
        responseTime: dto.responseTime,
        context: dto.context || Prisma.JsonNull,
        anomalyScore: anomalyAnalysis.score,
        anomalyReasons:
          anomalyAnalysis.reasons.length > 0
            ? anomalyAnalysis.reasons
            : Prisma.JsonNull,
      },
    });
  }

  async getUsagePatterns(params: {
    userProfileId?: string;
    permissionCode?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UsagePattern[]> {
    const where: Prisma.PermissionAnalyticsWhereInput = {
      action: 'check',
    };

    if (params.userProfileId) {
      where.userProfileId = params.userProfileId;
    }

    if (params.permissionCode) {
      where.permissionCode = params.permissionCode;
    }

    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) {
        where.timestamp.gte = params.startDate;
      }
      if (params.endDate) {
        where.timestamp.lte = params.endDate;
      }
    }

    const analytics = await this.prisma.permissionAnalytics.findMany({
      where,
    });

    // Group by permission code
    const patterns = new Map<string, any[]>();

    analytics.forEach((record) => {
      if (!patterns.has(record.permissionCode)) {
        patterns.set(record.permissionCode, []);
      }
      patterns.get(record.permissionCode)!.push(record);
    });

    const results: UsagePattern[] = [];

    for (const [permissionCode, records] of patterns) {
      const allowedCount = records.filter((r) => r.result === 'allowed').length;
      const deniedCount = records.filter((r) => r.result === 'denied').length;
      const responseTimes = records
        .filter((r) => r.responseTime !== null)
        .map((r) => r.responseTime!);

      const avgResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

      // Calculate peak hours
      const hourCounts = new Map<number, number>();
      records.forEach((r) => {
        const hour = r.timestamp.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });

      const peakHours = Array.from(hourCounts.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get top resources
      const resourceCounts = new Map<string, number>();
      records.forEach((r) => {
        if (r.resource) {
          resourceCounts.set(
            r.resource,
            (resourceCounts.get(r.resource) || 0) + 1,
          );
        }
      });

      const topResources = Array.from(resourceCounts.entries())
        .map(([resource, count]) => ({ resource, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      results.push({
        permissionCode,
        totalChecks: records.length,
        allowedCount,
        deniedCount,
        avgResponseTime: Math.round(avgResponseTime),
        peakHours,
        topResources,
      });
    }

    return results.sort((a, b) => b.totalChecks - a.totalChecks);
  }

  async getAnomalies(params: AnalyticsQueryDto): Promise<any[]> {
    const where: Prisma.PermissionAnalyticsWhereInput = {
      anomalyScore: { gte: this.ANOMALY_THRESHOLD },
    };

    if (params.userProfileId) {
      where.userProfileId = params.userProfileId;
    }

    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) {
        where.timestamp.gte = params.startDate;
      }
      if (params.endDate) {
        where.timestamp.lte = params.endDate;
      }
    }

    const anomalies = await this.prisma.permissionAnalytics.findMany({
      where,
      orderBy: { anomalyScore: 'desc' },
      take: params.limit || 100,
      skip: params.offset || 0,
    });

    return anomalies;
  }

  async getUserAnomalyReport(userProfileId: string): Promise<AnomalyReport> {
    const recentAnomalies = await this.prisma.permissionAnalytics.findMany({
      where: {
        userProfileId,
        anomalyScore: { gte: this.ANOMALY_THRESHOLD },
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      },
      orderBy: { timestamp: 'desc' },
    });

    const anomalies = recentAnomalies.map((record) => {
      const reasons = record.anomalyReasons as any[];
      const severity: 'low' | 'medium' | 'high' =
        record.anomalyScore! >= 0.9
          ? 'high'
          : record.anomalyScore! >= 0.8
            ? 'medium'
            : 'low';

      return {
        type: reasons[0]?.type || 'unknown',
        severity,
        description: reasons[0]?.description || 'Anomalous activity detected',
        detectedAt: record.timestamp,
        details: {
          permissionCode: record.permissionCode,
          action: record.action,
          resource: record.resource,
          anomalyScore: record.anomalyScore,
          reasons,
        },
      };
    });

    return {
      userProfileId,
      anomalies,
    };
  }

  private async detectAnomaly(event: AnalyticsEventDto): Promise<{
    score: number;
    reasons: any[];
  }> {
    const reasons: any[] = [];
    let score = 0;

    // 1. Check unusual access time
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      // Outside business hours
      score += 0.2;
      reasons.push({
        type: 'unusual_time',
        description: 'Access outside normal business hours',
        hour,
      });
    }

    // 2. Check response time anomaly
    if (
      event.responseTime &&
      event.responseTime > this.RESPONSE_TIME_THRESHOLD
    ) {
      score += 0.3;
      reasons.push({
        type: 'slow_response',
        description: 'Unusually slow response time',
        responseTime: event.responseTime,
        threshold: this.RESPONSE_TIME_THRESHOLD,
      });
    }

    // 3. Check recent denial rate
    if (event.action === 'check') {
      const recentChecks = await this.prisma.permissionAnalytics.count({
        where: {
          userProfileId: event.userProfileId,
          action: 'check',
          timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
        },
      });

      const recentDenials = await this.prisma.permissionAnalytics.count({
        where: {
          userProfileId: event.userProfileId,
          action: 'check',
          result: 'denied',
          timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });

      if (recentChecks > 10 && recentDenials / recentChecks > 0.5) {
        score += 0.4;
        reasons.push({
          type: 'high_denial_rate',
          description: 'High rate of permission denials',
          denialRate: recentDenials / recentChecks,
          recentChecks,
          recentDenials,
        });
      }
    }

    // 4. Check for permission elevation
    if (event.action === 'grant') {
      const criticalPermissions = [
        'permission.grant',
        'permission.revoke',
        'user.delete',
        'system.admin',
      ];

      if (criticalPermissions.includes(event.permissionCode)) {
        score += 0.3;
        reasons.push({
          type: 'critical_permission_grant',
          description: 'Critical permission granted',
          permission: event.permissionCode,
        });
      }
    }

    // 5. Check rapid permission changes
    if (event.action === 'grant' || event.action === 'revoke') {
      const recentChanges = await this.prisma.permissionAnalytics.count({
        where: {
          userProfileId: event.userProfileId,
          action: { in: ['grant', 'revoke'] },
          timestamp: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 minutes
        },
      });

      if (recentChanges > 5) {
        score += 0.3;
        reasons.push({
          type: 'rapid_permission_changes',
          description: 'Unusually high rate of permission changes',
          recentChanges,
          timeWindow: '15 minutes',
        });
      }
    }

    return { score: Math.min(score, 1), reasons };
  }

  async getDashboardStats(params?: { startDate?: Date; endDate?: Date }) {
    const where: Prisma.PermissionAnalyticsWhereInput = {};

    if (params?.startDate || params?.endDate) {
      where.timestamp = {};
      if (params.startDate) {
        where.timestamp.gte = params.startDate;
      }
      if (params.endDate) {
        where.timestamp.lte = params.endDate;
      }
    }

    const [
      totalChecks,
      totalGrants,
      totalRevokes,
      anomalyCount,
      avgResponseTime,
      topUsers,
      topPermissions,
    ] = await Promise.all([
      this.prisma.permissionAnalytics.count({
        where: { ...where, action: 'check' },
      }),
      this.prisma.permissionAnalytics.count({
        where: { ...where, action: 'grant' },
      }),
      this.prisma.permissionAnalytics.count({
        where: { ...where, action: 'revoke' },
      }),
      this.prisma.permissionAnalytics.count({
        where: { ...where, anomalyScore: { gte: this.ANOMALY_THRESHOLD } },
      }),
      this.prisma.permissionAnalytics.aggregate({
        where: { ...where, responseTime: { not: null } },
        _avg: { responseTime: true },
      }),
      this.prisma.permissionAnalytics.groupBy({
        by: ['userProfileId'],
        where,
        _count: true,
        orderBy: { _count: { userProfileId: 'desc' } },
        take: 10,
      }),
      this.prisma.permissionAnalytics.groupBy({
        by: ['permissionCode'],
        where,
        _count: true,
        orderBy: { _count: { permissionCode: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      summary: {
        totalChecks,
        totalGrants,
        totalRevokes,
        anomalyCount,
        avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
      },
      topUsers: topUsers.map((u) => ({
        userProfileId: u.userProfileId,
        count: u._count,
      })),
      topPermissions: topPermissions.map((p) => ({
        permissionCode: p.permissionCode,
        count: p._count,
      })),
    };
  }

  @Cron('0 0 * * *') // Run daily at midnight
  async generateDailyReport() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await this.getDashboardStats({
      startDate: yesterday,
      endDate: today,
    });

    const anomalies = await this.getAnomalies({
      startDate: yesterday,
      endDate: today,
    });

    // Store or send the report
    console.log('Daily Permission Analytics Report:', {
      date: yesterday.toISOString().split('T')[0],
      stats,
      anomalyCount: anomalies.length,
      criticalAnomalies: anomalies.filter((a) => a.anomalyScore >= 0.9).length,
    });

    return {
      date: yesterday,
      stats,
      anomalies: anomalies.length,
    };
  }

  async getPermissionTrends(permissionCode: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await this.prisma.permissionAnalytics.findMany({
      where: {
        permissionCode,
        action: 'check',
        timestamp: { gte: startDate },
      },
      select: {
        timestamp: true,
        result: true,
        responseTime: true,
      },
    });

    // Group by day
    const dailyStats = new Map<string, any>();

    data.forEach((record) => {
      const day = record.timestamp.toISOString().split('T')[0];

      if (!dailyStats.has(day)) {
        dailyStats.set(day, {
          date: day,
          total: 0,
          allowed: 0,
          denied: 0,
          avgResponseTime: 0,
          responseTimes: [],
        });
      }

      const stats = dailyStats.get(day)!;
      stats.total++;

      if (record.result === 'allowed') {
        stats.allowed++;
      } else if (record.result === 'denied') {
        stats.denied++;
      }

      if (record.responseTime) {
        stats.responseTimes.push(record.responseTime);
      }
    });

    // Calculate averages
    const trends = Array.from(dailyStats.values()).map((stats) => {
      const avgResponseTime =
        stats.responseTimes.length > 0
          ? stats.responseTimes.reduce((a: number, b: number) => a + b, 0) /
            stats.responseTimes.length
          : 0;

      return {
        date: stats.date,
        total: stats.total,
        allowed: stats.allowed,
        denied: stats.denied,
        denialRate: stats.total > 0 ? stats.denied / stats.total : 0,
        avgResponseTime: Math.round(avgResponseTime),
      };
    });

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }
}
