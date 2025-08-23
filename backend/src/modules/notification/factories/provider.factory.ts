import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationProvider } from '../interfaces/notification-provider.interface';
import { PostmarkProvider } from '../providers/postmark.provider';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { NotificationMetricsService } from '../services/metrics.service';

export type ProviderType = 'email' | 'sms' | 'whatsapp';
export type EmailProviderName = 'postmark' | 'smtp' | 'sendgrid';

@Injectable()
export class NotificationProviderFactory {
  private readonly logger = new Logger(NotificationProviderFactory.name);
  private providers: Map<string, NotificationProvider> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly metricsService: NotificationMetricsService,
  ) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize email providers based on configuration
    const emailProvider = this.configService.get<EmailProviderName>(
      'NOTIFICATION_EMAIL_PROVIDER',
      'postmark'
    );

    switch (emailProvider) {
      case 'postmark':
        this.registerProvider(
          'email',
          new PostmarkProvider(
            this.configService,
            this.circuitBreaker,
            this.metricsService,
          ),
        );
        break;
      case 'smtp':
        // TODO: Implement SMTP provider with existing email service
        this.logger.warn('SMTP provider not yet implemented');
        break;
      case 'sendgrid':
        // TODO: Implement SendGrid provider
        this.logger.warn('SendGrid provider not yet implemented');
        break;
      default:
        this.logger.error(`Unknown email provider: ${emailProvider}`);
    }

    // TODO: Initialize SMS provider (Twilio, etc.)
    // TODO: Initialize WhatsApp provider
  }

  private registerProvider(type: ProviderType, provider: NotificationProvider): void {
    const key = `${type}:${provider.name}`;
    this.providers.set(key, provider);
    this.logger.log(`Registered provider: ${key}`);
  }

  getProvider(type: ProviderType): NotificationProvider | null {
    // Find the first available provider for the given type
    for (const [key, provider] of this.providers) {
      if (key.startsWith(`${type}:`)) {
        return provider;
      }
    }
    return null;
  }

  getProviderByName(type: ProviderType, name: string): NotificationProvider | null {
    const key = `${type}:${name}`;
    return this.providers.get(key) || null;
  }

  async getHealthyProvider(type: ProviderType): Promise<NotificationProvider | null> {
    const providers = Array.from(this.providers.entries())
      .filter(([key]) => key.startsWith(`${type}:`))
      .map(([, provider]) => provider);

    // Try to find a healthy provider
    for (const provider of providers) {
      try {
        const isHealthy = await provider.isHealthy();
        if (isHealthy) {
          return provider;
        }
      } catch (error) {
        this.logger.warn(`Provider ${provider.name} health check failed`, error);
      }
    }

    return null;
  }

  getAllProviders(): Map<string, NotificationProvider> {
    return new Map(this.providers);
  }

  async validateAllProviders(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [key, provider] of this.providers) {
      try {
        const isValid = await provider.validateConfiguration();
        results.set(key, isValid);
      } catch (error) {
        this.logger.error(`Provider ${key} validation failed`, error);
        results.set(key, false);
      }
    }

    return results;
  }
}