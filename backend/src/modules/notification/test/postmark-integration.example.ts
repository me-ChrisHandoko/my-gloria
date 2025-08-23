import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from '../email.service';
import { NotificationProviderFactory } from '../factories/provider.factory';

/**
 * Example of how to test the Postmark integration
 * 
 * To use Postmark:
 * 1. Set NOTIFICATION_EMAIL_PROVIDER=postmark in your .env file
 * 2. Set POSTMARK_SERVER_TOKEN=your-server-token
 * 3. Set POSTMARK_FROM_EMAIL=your-verified-email@example.com
 * 
 * To use SMTP (fallback):
 * 1. Set NOTIFICATION_EMAIL_PROVIDER=smtp (or leave it unset)
 * 2. Configure EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD
 */
async function testPostmarkIntegration() {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
      }),
    ],
    providers: [
      EmailService,
      NotificationProviderFactory,
      // Add other required services here
    ],
  }).compile();

  const emailService = module.get<EmailService>(EmailService);
  const providerFactory = module.get<NotificationProviderFactory>(NotificationProviderFactory);

  // Check provider status
  const status = await emailService.getProviderStatus();
  console.log('Email provider status:', status);

  // Validate all providers
  const validationResults = await providerFactory.validateAllProviders();
  console.log('Provider validation results:', validationResults);

  // Send a test email
  try {
    const result = await emailService.sendEmail({
      to: 'test@example.com',
      subject: 'Test Email via Postmark',
      html: '<h1>Hello from Postmark!</h1><p>This is a test email sent via the Postmark integration.</p>',
      text: 'Hello from Postmark! This is a test email sent via the Postmark integration.',
    });

    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Failed to send email:', error);
  }

  // Send a templated email (if you have templates configured in Postmark)
  try {
    const result = await emailService.sendEmail({
      to: 'test@example.com',
      subject: 'Welcome Email',
      templateId: '123456', // Replace with your actual Postmark template ID
      templateData: {
        name: 'John Doe',
        company: 'YPK Gloria',
      },
    });

    console.log('Template email sent successfully:', result);
  } catch (error) {
    console.error('Failed to send template email:', error);
  }
}

// Example webhook handler for your controller
export class PostmarkWebhookController {
  constructor(private readonly providerFactory: NotificationProviderFactory) {}

  async handleWebhook(body: any, headers: any) {
    // Verify webhook signature if needed
    // const signature = headers['x-postmark-signature'];
    
    const provider = this.providerFactory.getProviderByName('email', 'postmark');
    if (!provider) {
      throw new Error('Postmark provider not found');
    }

    await provider.handleWebhook({
      type: body.RecordType,
      data: body,
      timestamp: new Date(),
    });
  }
}

// Run the test
if (require.main === module) {
  testPostmarkIntegration().catch(console.error);
}