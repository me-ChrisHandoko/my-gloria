import {
  Controller,
  Post,
  Body,
  Headers,
  HttpStatus,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import {
  ClerkWebhookService,
  ClerkWebhookEvent,
} from '../services/clerk-webhook.service';
import { Webhook } from 'svix';
import { ConfigService } from '@nestjs/config';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);
  private webhookSecret: string;

  constructor(
    private readonly clerkWebhookService: ClerkWebhookService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret =
      this.configService.get<string>('CLERK_WEBHOOK_SECRET') || '';
  }

  @Post('clerk')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Hide from Swagger as this is internal
  @ApiOperation({ summary: 'Handle Clerk webhook events' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook signature or payload',
  })
  async handleClerkWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Body() payload: any,
  ) {
    // Verify webhook signature if secret is configured
    if (this.webhookSecret) {
      try {
        const wh = new Webhook(this.webhookSecret);
        const webhookPayload = wh.verify(JSON.stringify(payload), {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        }) as ClerkWebhookEvent;

        await this.clerkWebhookService.handleWebhook(webhookPayload);
      } catch (error) {
        this.logger.error('Invalid webhook signature', error);
        throw new BadRequestException('Invalid webhook signature');
      }
    } else {
      // If no secret configured, process without verification (development only)
      this.logger.warn('Processing webhook without signature verification');
      await this.clerkWebhookService.handleWebhook(
        payload as ClerkWebhookEvent,
      );
    }

    return { received: true };
  }
}
