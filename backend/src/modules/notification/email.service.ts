import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { TemplateService } from './template.service';
import { SanitizationService } from './services/sanitization.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { FallbackQueueService } from './services/fallback-queue.service';
import { NotificationType } from './enums/notification.enum';
import { NotificationTemplateVariables } from './interfaces/notification-template.interface';
import { NotificationProviderFactory } from './factories/provider.factory';
import { NotificationProvider, NotificationSendOptions } from './interfaces/notification-provider.interface';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
  templateId?: string;
  templateData?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean = false;
  private emailProvider: NotificationProvider | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: TemplateService,
    private readonly sanitizationService: SanitizationService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly fallbackQueueService: FallbackQueueService,
    private readonly providerFactory: NotificationProviderFactory,
  ) {
    this.initializeProvider();
    this.initializeTransporter();
    this.setupCircuitBreaker();
  }

  private async initializeProvider(): Promise<void> {
    try {
      // Try to get the configured email provider
      this.emailProvider = await this.providerFactory.getHealthyProvider('email');
      
      if (this.emailProvider) {
        this.logger.log(`Using ${this.emailProvider.name} as email provider`);
        const isValid = await this.emailProvider.validateConfiguration();
        if (!isValid) {
          this.logger.warn(`Email provider ${this.emailProvider.name} configuration is invalid`);
          this.emailProvider = null;
        }
      } else {
        this.logger.warn('No healthy email provider available, falling back to SMTP');
      }
    } catch (error) {
      this.logger.error('Failed to initialize email provider:', error);
    }
  }

  private initializeTransporter(): void {
    try {
      const emailConfig = {
        host: this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
        port: this.configService.get<number>('EMAIL_PORT', 587),
        secure: this.configService.get<boolean>('EMAIL_SECURE', false),
        auth: {
          user: this.configService.get<string>('EMAIL_USER'),
          pass: this.configService.get<string>('EMAIL_PASSWORD'),
        },
      };

      // Check if email configuration is provided
      if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        this.logger.warn(
          'Email service not configured. Email notifications will be disabled.',
        );
        this.isConfigured = false;
        return;
      }

      this.transporter = nodemailer.createTransport(emailConfig);
      this.isConfigured = true;

      // Verify transporter configuration
      this.transporter.verify((error, success) => {
        if (error) {
          this.logger.error('Email transporter verification failed:', error);
          this.isConfigured = false;
        } else {
          this.logger.log('Email transporter is ready to send emails');
        }
      });
    } catch (error) {
      this.logger.error('Failed to initialize email transporter:', error);
      this.isConfigured = false;
    }
  }

  private setupCircuitBreaker(): void {
    // Configure circuit breaker for email service
    const circuit = this.circuitBreakerService.getCircuit('email-service', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      errorThresholdPercentage: 30,
      volumeThreshold: 10,
      healthCheckInterval: 30000, // 30 seconds
      fallbackFunction: undefined, // We'll handle fallback manually
    });

    // Listen to circuit state changes
    this.circuitBreakerService.on('circuit-state-change', (data) => {
      if (data.name === 'email-service') {
        this.logger.warn(
          `Email service circuit state changed from ${data.from} to ${data.to}`,
        );

        // If circuit opens, mark service as temporarily unavailable
        if (data.to === 'OPEN') {
          this.isConfigured = false;
          // Schedule a configuration check
          setTimeout(() => this.checkEmailServiceHealth(), 30000);
        } else if (data.to === 'CLOSED') {
          this.isConfigured = true;
        }
      }
    });
  }

  private async checkEmailServiceHealth(): Promise<void> {
    try {
      // Verify transporter is still working
      await new Promise((resolve, reject) => {
        this.transporter.verify((error, success) => {
          if (error) {
            reject(error);
          } else {
            resolve(success);
          }
        });
      });

      this.logger.log('Email service health check passed');
      this.isConfigured = true;

      // Try to close the circuit if it's open
      this.circuitBreakerService.forceClose('email-service');
    } catch (error) {
      this.logger.error('Email service health check failed:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    // Try to use provider-based sending first
    if (this.emailProvider) {
      try {
        const providerOptions: NotificationSendOptions = {
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
          cc: options.cc,
          bcc: options.bcc,
          replyTo: options.from,
          attachments: options.attachments?.map(att => ({
            name: att.filename,
            content: typeof att.content === 'string' ? att.content : att.content?.toString('base64') || '',
            contentType: 'application/octet-stream',
          })),
          templateId: options.templateId,
          templateData: options.templateData,
        };

        const result = await this.emailProvider.send(providerOptions);
        
        if (result.status === 'sent') {
          this.logger.log(`Email sent via ${this.emailProvider.name}: ${result.messageId}`);
          return true;
        } else {
          this.logger.warn(`Email failed via ${this.emailProvider.name}: ${result.error}`);
          // Fall through to SMTP fallback
        }
      } catch (error) {
        this.logger.error(`Provider ${this.emailProvider.name} failed:`, error);
        // Fall through to SMTP fallback
      }
    }

    // Fallback to SMTP if provider fails or is not available
    if (!this.isConfigured) {
      this.logger.warn('Email service is not configured. Skipping email send.');
      // Store in fallback queue for retry when service is available
      await this.fallbackQueueService.storeFailedEmail(
        options,
        'Email service not configured',
      );
      return false;
    }

    try {
      // Execute email sending through circuit breaker
      return await this.circuitBreakerService.execute(
        'email-service',
        async () => this.sendEmailInternal(options),
      );
    } catch (error) {
      this.logger.error('Circuit breaker prevented email send:', error.message);

      // Store failed email in fallback queue for retry
      await this.fallbackQueueService.storeFailedEmail(
        options,
        `Circuit breaker: ${error.message}`,
      );

      return false;
    }
  }

  private async sendEmailInternal(options: EmailOptions): Promise<boolean> {
    const defaultFrom = this.configService.get<string>(
      'EMAIL_FROM',
      'YPK Gloria System <noreply@ypkgloria.org>',
    );

    // Sanitize email addresses and content
    const sanitizedTo = Array.isArray(options.to)
      ? options.to
          .map((email) => this.sanitizationService.sanitizeEmail(email))
          .filter(Boolean)
      : this.sanitizationService.sanitizeEmail(options.to);

    if (
      !sanitizedTo ||
      (Array.isArray(sanitizedTo) && sanitizedTo.length === 0)
    ) {
      this.logger.error('Invalid email address(es) after sanitization');
      return false;
    }

    const mailOptions = {
      from: options.from || defaultFrom,
      to: Array.isArray(sanitizedTo) ? sanitizedTo.join(', ') : sanitizedTo,
      subject: this.sanitizationService.sanitizeText(options.subject),
      text: options.text
        ? this.sanitizationService.sanitizeText(options.text)
        : undefined,
      html: options.html
        ? this.sanitizationService.sanitizeEmailHtml(options.html)
        : options.text
          ? this.sanitizationService.sanitizeText(options.text)
          : undefined,
      cc: options.cc
        ? Array.isArray(options.cc)
          ? options.cc
              .map((email) => this.sanitizationService.sanitizeEmail(email))
              .filter(Boolean)
              .join(', ')
          : this.sanitizationService.sanitizeEmail(options.cc)
        : undefined,
      bcc: options.bcc
        ? Array.isArray(options.bcc)
          ? options.bcc
              .map((email) => this.sanitizationService.sanitizeEmail(email))
              .filter(Boolean)
              .join(', ')
          : this.sanitizationService.sanitizeEmail(options.bcc)
        : undefined,
      attachments: options.attachments,
    };

    const info = await this.transporter.sendMail(mailOptions);
    this.logger.log(`Email sent successfully: ${info.messageId}`);
    return true;
  }

  async sendNotificationEmail(
    to: string,
    type: NotificationType,
    variables: NotificationTemplateVariables,
  ): Promise<boolean> {
    try {
      const rendered = this.templateService.renderTemplate(type, variables);

      return await this.sendEmail({
        to,
        subject: rendered.subject,
        text: rendered.body,
        html: rendered.html,
      });
    } catch (error) {
      this.logger.error('Failed to send notification email:', error);
      return false;
    }
  }

  async sendBulkEmails(
    recipients: string[],
    type: NotificationType,
    baseVariables: NotificationTemplateVariables,
  ): Promise<{ sent: number; failed: number }> {
    const results = { sent: 0, failed: 0 };

    // Process emails in batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const promises = batch.map(async (email) => {
        const variables = {
          ...baseVariables,
          recipientEmail: email,
        };

        const success = await this.sendNotificationEmail(
          email,
          type,
          variables,
        );
        if (success) {
          results.sent++;
        } else {
          results.failed++;
        }
      });

      await Promise.all(promises);

      // Add a small delay between batches to prevent rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.logger.log(
      `Bulk email results: ${results.sent} sent, ${results.failed} failed`,
    );
    return results;
  }

  async sendTestEmail(to: string): Promise<boolean> {
    // Sanitize the email address before sending
    const sanitizedTo = this.sanitizationService.sanitizeEmail(to);
    if (!sanitizedTo) {
      this.logger.error('Invalid test email address');
      return false;
    }

    return await this.sendEmail({
      to: sanitizedTo,
      subject: 'Test Email from YPK Gloria System',
      text: 'This is a test email to verify that the email service is working correctly.',
      html: `
        <html>
          <body>
            <h2>Test Email</h2>
            <p>This is a test email to verify that the email service is working correctly.</p>
            <p>If you received this email, the email configuration is set up properly.</p>
            <hr>
            <p><small>YPK Gloria Management System</small></p>
          </body>
        </html>
      `,
    });
  }

  isEmailServiceConfigured(): boolean {
    return this.isConfigured || this.emailProvider !== null;
  }

  async getProviderStatus(): Promise<{ provider: string | null; healthy: boolean }> {
    if (!this.emailProvider) {
      return { provider: 'smtp', healthy: this.isConfigured };
    }

    const isHealthy = await this.emailProvider.isHealthy();
    return { provider: this.emailProvider.name, healthy: isHealthy };
  }

  async switchProvider(): Promise<void> {
    this.logger.log('Attempting to switch email provider...');
    this.emailProvider = await this.providerFactory.getHealthyProvider('email');
    
    if (this.emailProvider) {
      this.logger.log(`Switched to ${this.emailProvider.name} provider`);
    } else {
      this.logger.warn('No healthy email provider available');
    }
  }

  async sendWithRetry(
    options: EmailOptions,
    _maxRetries: number = 3,
    _delay: number = 1000,
  ): Promise<boolean> {
    // Circuit breaker already handles retries internally
    // This method now just delegates to sendEmail
    return await this.sendEmail(options);
  }

  /**
   * Get circuit breaker metrics for email service
   */
  getCircuitMetrics() {
    return this.circuitBreakerService.getMetrics('email-service');
  }

  /**
   * Manually reset the email service circuit breaker
   */
  resetCircuit(): void {
    this.circuitBreakerService.resetCircuit('email-service');
    this.logger.log('Email service circuit breaker has been reset');
  }
}
