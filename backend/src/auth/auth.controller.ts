import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { ClerkWebhookGuard } from './guards/clerk-webhook.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Verify current session and get user profile
   */
  @Get('me')
  @UseGuards(ClerkAuthGuard)
  async getCurrentUser(@Request() req: any) {
    return req.user;
  }

  /**
   * Sync user data from Clerk
   */
  @Post('sync')
  @UseGuards(ClerkAuthGuard)
  async syncUser(@Request() req: any) {
    const user = await this.authService.syncUserFromClerk(req.auth.userId);
    return {
      success: true,
      user,
    };
  }

  /**
   * Clerk webhook endpoint
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkWebhookGuard)
  async handleWebhook(
    @Body() body: any,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    const { type, data } = body;

    this.logger.log(`Received webhook: ${type}`);

    try {
      await this.authService.handleWebhookEvent(type, data);
      return { success: true };
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate email before allowing login
   * This endpoint is public for Clerk to check
   */
  @Post('validate-email')
  @HttpCode(HttpStatus.OK)
  async validateEmail(@Body() body: { email: string }) {
    const { email } = body;

    this.logger.log(`Email validation request received for: "${email}"`);

    if (!email) {
      this.logger.error('Email validation failed: No email provided');
      return {
        valid: false,
        message: 'Email is required',
        debug: {
          receivedEmail: email,
          normalizedEmail: null,
        },
      };
    }

    // Log the exact email received
    this.logger.log(`Raw email received: "${email}"`);
    this.logger.log(`Email length: ${email.length} characters`);

    const isValid = await this.authService.validateUserEmail(email);

    if (!isValid) {
      this.logger.warn(`Email validation failed for: "${email}"`);
      return {
        valid: false,
        message:
          'Email not registered in employee database. Please contact administrator.',
        debug: {
          receivedEmail: email,
          normalizedEmail: email.trim().toLowerCase(),
          suggestion:
            'Please ensure the email is correctly registered in data_karyawan table',
        },
      };
    }

    // Get employee data for the email
    const employee = await this.authService.getEmployeeByEmail(email);

    this.logger.log(`Email validation successful for: "${email}"`);

    return {
      valid: true,
      message: 'Email is registered',
      employee: employee
        ? {
            nip: employee.nip,
            nama: employee.nama,
          }
        : null,
      debug: {
        receivedEmail: email,
        normalizedEmail: email.trim().toLowerCase(),
        employeeFound: !!employee,
      },
    };
  }

  /**
   * Debug endpoint to check email in database
   * This endpoint is for debugging purposes only
   */
  @Post('debug/check-email')
  @HttpCode(HttpStatus.OK)
  async debugCheckEmail(@Body() body: { email: string }) {
    const { email } = body;

    if (!email) {
      return { error: 'Email is required' };
    }

    try {
      // Try different query methods
      const normalizedEmail = email.trim().toLowerCase();

      // Method 1: Prisma with case-insensitive
      const method1 = await this.authService.prisma.dataKaryawan.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
        select: {
          nip: true,
          nama: true,
          email: true,
        },
      });

      // Method 2: Prisma with contains
      const method2 = await this.authService.prisma.dataKaryawan.findFirst({
        where: {
          email: {
            contains: email,
            mode: 'insensitive',
          },
        },
        select: {
          nip: true,
          nama: true,
          email: true,
        },
      });

      // Method 3: Raw SQL
      const method3 = await this.authService.prisma.$queryRaw`
        SELECT nip, nama, email 
        FROM gloria_master.data_karyawan 
        WHERE LOWER(TRIM(email)) = ${normalizedEmail}
        LIMIT 1
      `;

      // Method 4: List all emails that contain the domain
      const domain = email.includes('@') ? email.split('@')[1] : '';
      const similarEmails = domain
        ? await this.authService.prisma.dataKaryawan.findMany({
            where: {
              email: {
                contains: domain,
                mode: 'insensitive',
              },
            },
            select: {
              email: true,
              nama: true,
            },
            take: 10,
          })
        : [];

      return {
        searchedEmail: email,
        normalizedEmail,
        results: {
          method1_prismaExact: method1,
          method2_prismaContains: method2,
          method3_rawSql: method3,
          similarEmails: similarEmails,
        },
        debug: {
          emailLength: email.length,
          normalizedLength: normalizedEmail.length,
          hasWhitespace: email !== email.trim(),
          domain: domain,
        },
      };
    } catch (error) {
      this.logger.error('Debug check email failed:', error);
      return {
        error: error.message,
        searchedEmail: email,
      };
    }
  }

  /**
   * Health check for auth service
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'auth',
      timestamp: new Date().toISOString(),
    };
  }
}
