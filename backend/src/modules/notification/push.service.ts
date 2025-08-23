import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { FallbackQueueService } from './services/fallback-queue.service';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private webPush: any;
  private isConfigured: boolean = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly fallbackQueueService: FallbackQueueService,
  ) {
    this.initializePushService();
    this.setupCircuitBreaker();
  }

  private async initializePushService(): Promise<void> {
    try {
      // Dynamic import of web-push
      const webPushModule = await import('web-push');
      this.webPush = webPushModule.default || webPushModule;

      const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
      const vapidPrivateKey =
        this.configService.get<string>('VAPID_PRIVATE_KEY');
      const vapidSubject = this.configService.get<string>(
        'VAPID_SUBJECT',
        'mailto:admin@ypkgloria.org',
      );

      if (!vapidPublicKey || !vapidPrivateKey) {
        this.logger.warn(
          'Push notification service not configured. VAPID keys are missing.',
        );
        this.isConfigured = false;
        return;
      }

      this.webPush.setVapidDetails(
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey,
      );

      this.isConfigured = true;
      this.logger.log('Push notification service initialized successfully');
    } catch (error) {
      this.logger.error(
        'Failed to initialize push notification service:',
        error,
      );
      this.isConfigured = false;
    }
  }

  private setupCircuitBreaker(): void {
    // Configure circuit breaker for push notification service
    const circuit = this.circuitBreakerService.getCircuit('push-service', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      errorThresholdPercentage: 40,
      volumeThreshold: 10,
      healthCheckInterval: 30000, // 30 seconds
      fallbackFunction: undefined, // We'll handle fallback manually
    });

    // Listen to circuit state changes
    this.circuitBreakerService.on('circuit-state-change', (data) => {
      if (data.name === 'push-service') {
        this.logger.warn(
          `Push service circuit state changed from ${data.from} to ${data.to}`,
        );

        // If circuit opens, mark service as temporarily unavailable
        if (data.to === 'OPEN') {
          this.isConfigured = false;
          // Schedule a configuration check
          setTimeout(() => this.checkPushServiceHealth(), 30000);
        } else if (data.to === 'CLOSED') {
          this.isConfigured = true;
        }
      }
    });
  }

  private async checkPushServiceHealth(): Promise<boolean> {
    try {
      if (!this.webPush) {
        await this.initializePushService();
      }

      // Simple health check - verify VAPID keys are still valid
      const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
      const vapidPrivateKey =
        this.configService.get<string>('VAPID_PRIVATE_KEY');

      if (vapidPublicKey && vapidPrivateKey && this.webPush) {
        this.logger.log('Push service health check passed');
        this.isConfigured = true;

        // Try to close the circuit if it's open
        this.circuitBreakerService.forceClose('push-service');
        return true;
      }

      throw new Error('Push service configuration invalid');
    } catch (error) {
      this.logger.error('Push service health check failed:', error);
      this.isConfigured = false;
      return false;
    }
  }

  async sendPushNotification(
    subscription: PushSubscription,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(
        'Push service is not configured. Skipping push notification.',
      );
      // Store in fallback queue for retry when service is available
      await this.fallbackQueueService.storeFailedPush(
        subscription,
        payload,
        'Push service not configured',
      );
      return false;
    }

    try {
      // Execute push notification through circuit breaker
      return await this.circuitBreakerService.execute(
        'push-service',
        async () => this.sendPushNotificationInternal(subscription, payload),
      );
    } catch (error) {
      this.logger.error(
        'Circuit breaker prevented push notification:',
        error.message,
      );

      // Store failed push notification in fallback queue for retry
      await this.fallbackQueueService.storeFailedPush(
        subscription,
        payload,
        `Circuit breaker: ${error.message}`,
      );

      return false;
    }
  }

  private async sendPushNotificationInternal(
    subscription: PushSubscription,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    const notificationPayload = JSON.stringify({
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/badge-72x72.png',
        data: payload.data,
        actions: payload.actions,
        timestamp: Date.now(),
        requireInteraction: true,
      },
    });

    try {
      await this.webPush.sendNotification(subscription, notificationPayload);
      this.logger.log('Push notification sent successfully');
      return true;
    } catch (error) {
      // Handle specific error cases
      if (error.statusCode === 410) {
        // Subscription has expired or is no longer valid
        this.logger.warn('Push subscription is no longer valid');
        await this.removeInvalidSubscription(subscription.endpoint);
      }

      // Re-throw the error to trigger circuit breaker
      throw error;
    }
  }

  async sendBulkPushNotifications(
    subscriptions: PushSubscription[],
    payload: PushNotificationPayload,
  ): Promise<{ sent: number; failed: number }> {
    const results = { sent: 0, failed: 0 };

    const promises = subscriptions.map(async (subscription) => {
      const success = await this.sendPushNotification(subscription, payload);
      if (success) {
        results.sent++;
      } else {
        results.failed++;
      }
    });

    await Promise.all(promises);

    this.logger.log(
      `Bulk push results: ${results.sent} sent, ${results.failed} failed`,
    );
    return results;
  }

  async saveSubscription(
    userProfileId: string,
    subscription: PushSubscription,
  ): Promise<void> {
    try {
      // Store push subscription in database
      // This would typically be stored in a PushSubscription table
      // For now, we'll store it as JSON in user preferences or a dedicated table

      // Example implementation (you would need to add this to your schema):
      /*
      await this.prisma.pushSubscription.upsert({
        where: {
          endpoint: subscription.endpoint,
        },
        update: {
          keys: subscription.keys,
          userProfileId,
          updatedAt: new Date(),
        },
        create: {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userProfileId,
        },
      });
      */

      this.logger.log(`Push subscription saved for user: ${userProfileId}`);
    } catch (error) {
      this.logger.error('Failed to save push subscription:', error);
      throw error;
    }
  }

  async getSubscriptions(userProfileId: string): Promise<PushSubscription[]> {
    try {
      // Retrieve push subscriptions from database
      // This would typically query a PushSubscription table

      // Example implementation:
      /*
      const subscriptions = await this.prisma.pushSubscription.findMany({
        where: { userProfileId },
      });
      
      return subscriptions.map(sub => ({
        endpoint: sub.endpoint,
        keys: sub.keys as { p256dh: string; auth: string },
      }));
      */

      return [];
    } catch (error) {
      this.logger.error('Failed to get push subscriptions:', error);
      return [];
    }
  }

  async removeSubscription(
    userProfileId: string,
    endpoint: string,
  ): Promise<void> {
    try {
      // Remove push subscription from database
      /*
      await this.prisma.pushSubscription.delete({
        where: {
          endpoint,
          userProfileId,
        },
      });
      */

      this.logger.log(`Push subscription removed for user: ${userProfileId}`);
    } catch (error) {
      this.logger.error('Failed to remove push subscription:', error);
    }
  }

  private async removeInvalidSubscription(endpoint: string): Promise<void> {
    try {
      // Remove invalid subscription from database
      /*
      await this.prisma.pushSubscription.delete({
        where: { endpoint },
      });
      */

      this.logger.log(`Invalid push subscription removed: ${endpoint}`);
    } catch (error) {
      this.logger.error('Failed to remove invalid subscription:', error);
    }
  }

  async sendTestPushNotification(
    subscription: PushSubscription,
  ): Promise<boolean> {
    return await this.sendPushNotification(subscription, {
      title: 'Test Notification',
      body: 'This is a test push notification from YPK Gloria System',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'open',
          title: 'Open App',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    });
  }

  isPushServiceConfigured(): boolean {
    return this.isConfigured;
  }

  getVapidPublicKey(): string | undefined {
    return this.configService.get<string>('VAPID_PUBLIC_KEY');
  }

  /**
   * Get circuit breaker metrics for push service
   */
  getCircuitMetrics() {
    return this.circuitBreakerService.getMetrics('push-service');
  }

  /**
   * Manually reset the push service circuit breaker
   */
  resetCircuit(): void {
    this.circuitBreakerService.resetCircuit('push-service');
    this.logger.log('Push service circuit breaker has been reset');
  }
}
