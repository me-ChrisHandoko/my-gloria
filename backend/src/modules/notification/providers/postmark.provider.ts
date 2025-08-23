import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as postmark from 'postmark';
import {
  NotificationProvider,
  NotificationSendOptions,
  NotificationResult,
  NotificationStatus,
  WebhookPayload,
} from '../interfaces/notification-provider.interface';
import { CircuitBreakerService, CircuitState } from '../services/circuit-breaker.service';
import { NotificationMetricsService } from '../services/metrics.service';
import { NotificationChannel } from '@prisma/client';

@Injectable()
export class PostmarkProvider implements NotificationProvider {
  private readonly logger = new Logger(PostmarkProvider.name);
  private client: postmark.ServerClient;
  public readonly name = 'postmark';

  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly metricsService: NotificationMetricsService,
  ) {
    const serverToken = this.configService.get<string>('POSTMARK_SERVER_TOKEN');
    if (!serverToken) {
      this.logger.warn('Postmark server token not configured');
    } else {
      this.client = new postmark.ServerClient(serverToken);
    }
  }

  async send(options: NotificationSendOptions): Promise<NotificationResult> {
    const startTime = Date.now();
    
    try {
      // Use circuit breaker to execute the send operation
      return await this.circuitBreaker.execute(
        'postmark',
        async () => this.sendInternal(options, startTime),
      );
    } catch (error) {
      // If circuit breaker rejects or operation fails
      const duration = Date.now() - startTime;
      this.metricsService.recordChannelPerformance(
        NotificationChannel.EMAIL,
        duration,
        false,
      );
      
      return {
        messageId: '',
        status: 'failed',
        provider: this.name,
        timestamp: new Date(),
        error: error.message,
        details: {
          circuitBreaker: true,
        },
      };
    }
  }

  private async sendInternal(options: NotificationSendOptions, startTime: number): Promise<NotificationResult> {
    try {
      if (!this.client) {
        throw new Error('Postmark client not initialized');
      }

      const fromEmail = this.configService.get<string>('POSTMARK_FROM_EMAIL', 'noreply@yourcompany.com');
      
      // Prepare email message
      const message: any = {
        From: fromEmail,
        To: Array.isArray(options.to) ? options.to.join(',') : options.to,
        Subject: options.subject || 'Notification',
        Tag: options.tag,
        TrackOpens: true,
        TrackLinks: 'HtmlAndText',
        Metadata: options.metadata,
      };

      // Add optional fields
      if (options.cc) {
        message.Cc = Array.isArray(options.cc) ? options.cc.join(',') : options.cc;
      }
      if (options.bcc) {
        message.Bcc = Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc;
      }
      if (options.replyTo) {
        message.ReplyTo = options.replyTo;
      }
      if (options.headers) {
        message.Headers = Object.entries(options.headers).map(([name, value]) => ({ Name: name, Value: value }));
      }

      // Handle template or content
      if (options.templateId) {
        // Using template
        const result = await this.client.sendEmailWithTemplate({
          ...message,
          TemplateId: parseInt(options.templateId, 10),
          TemplateModel: options.templateData || {},
        });

        // Record success
        const duration = Date.now() - startTime;
        this.metricsService.recordChannelPerformance(
          NotificationChannel.EMAIL,
          duration,
          true,
        );

        return {
          messageId: result.MessageID,
          status: 'sent',
          provider: this.name,
          timestamp: new Date(),
          details: {
            submittedAt: result.SubmittedAt,
            to: result.To,
          },
        };
      } else {
        // Using HTML/Text content
        if (!options.html && !options.text) {
          throw new Error('Either html or text content is required');
        }

        const result = await this.client.sendEmail({
          ...message,
          HtmlBody: options.html,
          TextBody: options.text,
          Attachments: options.attachments?.map(att => ({
            Name: att.name,
            Content: att.content,
            ContentType: att.contentType,
          })),
        });

        // Record success
        const duration = Date.now() - startTime;
        this.metricsService.recordChannelPerformance(
          NotificationChannel.EMAIL,
          duration,
          true,
        );

        return {
          messageId: result.MessageID,
          status: 'sent',
          provider: this.name,
          timestamp: new Date(),
          details: {
            submittedAt: result.SubmittedAt,
            to: result.To,
          },
        };
      }
    } catch (error) {
      this.logger.error('Failed to send email via Postmark', error);
      
      // Record failure
      const duration = Date.now() - startTime;
      this.metricsService.recordChannelPerformance(
        NotificationChannel.EMAIL,
        duration,
        false,
      );
      
      // Handle specific Postmark errors
      if (error.statusCode) {
        switch (error.statusCode) {
          case 401:
            this.logger.error('Invalid Postmark API token');
            break;
          case 422:
            this.logger.error('Invalid email data', error.message);
            break;
          case 429:
            this.logger.warn('Postmark rate limit reached');
            break;
          case 500:
          case 503:
            this.logger.error('Postmark service unavailable');
            break;
        }
      }

      // Re-throw to trigger circuit breaker
      throw error;
    }
  }

  async getStatus(messageId: string): Promise<NotificationStatus> {
    try {
      if (!this.client) {
        throw new Error('Postmark client not initialized');
      }

      const message = await this.client.getOutboundMessageDetails(messageId);
      
      // Map Postmark status to our status
      let status: NotificationStatus['status'] = 'pending';
      if (message.Status === 'Sent') {
        status = 'delivered';
      } else if (message.Status === 'Bounced') {
        status = 'bounced';
      }

      const events = message.MessageEvents?.map(event => ({
        type: event.Type,
        timestamp: new Date(event.ReceivedAt),
        details: event.Details,
      })) || [];

      return {
        messageId,
        status,
        timestamp: new Date(message.ReceivedAt),
        events,
      };
    } catch (error) {
      this.logger.error(`Failed to get status for message ${messageId}`, error);
      throw error;
    }
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log(`Handling Postmark webhook: ${payload.type}`);
      
      // Handle different webhook types
      switch (payload.type) {
        case 'Bounce':
          await this.handleBounce(payload.data);
          break;
        case 'SpamComplaint':
          await this.handleSpamComplaint(payload.data);
          break;
        case 'Open':
          await this.handleOpen(payload.data);
          break;
        case 'Click':
          await this.handleClick(payload.data);
          break;
        case 'Delivery':
          await this.handleDelivery(payload.data);
          break;
        default:
          this.logger.warn(`Unknown webhook type: ${payload.type}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle webhook', error);
      throw error;
    }
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }

      // Test the configuration by getting server info
      const server = await this.client.getServer();
      this.logger.log(`Postmark server validated: ${server.Name}`);
      return true;
    } catch (error) {
      this.logger.error('Postmark configuration validation failed', error);
      return false;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Check circuit breaker state
      const metrics = this.circuitBreaker.getMetrics('postmark');
      if (metrics && metrics.state === CircuitState.OPEN) {
        return false;
      }

      return await this.validateConfiguration();
    } catch {
      return false;
    }
  }

  private async handleBounce(data: any): Promise<void> {
    this.logger.warn(`Email bounced: ${data.Email}`, {
      messageId: data.MessageID,
      type: data.Type,
      description: data.Description,
    });
    
    // TODO: Update user preferences to mark email as invalid
    // TODO: Notify system administrators
  }

  private async handleSpamComplaint(data: any): Promise<void> {
    this.logger.warn(`Spam complaint received: ${data.Email}`, {
      messageId: data.MessageID,
    });
    
    // TODO: Update user preferences to unsubscribe
    // TODO: Add to suppression list
  }

  private async handleOpen(data: any): Promise<void> {
    this.logger.debug(`Email opened: ${data.Recipient}`, {
      messageId: data.MessageID,
      firstOpen: data.FirstOpen,
    });
    
    // TODO: Update notification metrics
  }

  private async handleClick(data: any): Promise<void> {
    this.logger.debug(`Link clicked: ${data.Recipient}`, {
      messageId: data.MessageID,
      link: data.OriginalLink,
    });
    
    // TODO: Update engagement metrics
  }

  private async handleDelivery(data: any): Promise<void> {
    this.logger.debug(`Email delivered: ${data.Recipient}`, {
      messageId: data.MessageID,
    });
    
    // TODO: Update delivery status
  }
}