import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';

@Injectable()
export class ClerkWebhookGuard implements CanActivate {
  private readonly logger = new Logger(ClerkWebhookGuard.name);
  private readonly webhookSecret: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');
    if (!this.webhookSecret) {
      this.logger.warn(
        'CLERK_WEBHOOK_SECRET is not defined - webhooks will be disabled',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip webhook validation in development if secret not configured
    if (!this.webhookSecret) {
      const isDevelopment =
        this.configService.get<string>('NODE_ENV') === 'development';
      if (isDevelopment) {
        this.logger.warn('Webhook validation skipped in development mode');
        return true; // Allow webhook in dev mode without validation
      }
      this.logger.error('Webhook secret not configured');
      throw new UnauthorizedException('Webhook endpoint not configured');
    }

    const request = context.switchToHttp().getRequest();

    try {
      // Get Svix headers
      const svixId = request.headers['svix-id'];
      const svixTimestamp = request.headers['svix-timestamp'];
      const svixSignature = request.headers['svix-signature'];

      if (!svixId || !svixTimestamp || !svixSignature) {
        throw new UnauthorizedException('Missing webhook headers');
      }

      // Verify webhook signature
      const webhook = new Webhook(this.webhookSecret);

      // Get raw body for verification
      const body = JSON.stringify(request.body);

      // Verify the webhook
      webhook.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });

      this.logger.log('Webhook signature verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Webhook verification failed:', error);
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}
