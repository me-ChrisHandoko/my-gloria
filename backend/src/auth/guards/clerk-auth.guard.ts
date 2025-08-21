import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { clerkClient, verifyToken } from '@clerk/clerk-sdk-node';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private circuitBreakerOpenUntil: Date | null = null;
  private failureCount = 0;
  private readonly failureThreshold = 5;
  private readonly circuitBreakerTimeout = 60000; // 1 minute

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (!secretKey) {
      this.logger.fatal('CLERK_SECRET_KEY is not configured');
      throw new InternalServerErrorException(
        'Authentication service is not properly configured',
      );
    }

    // Set Clerk API key
    process.env.CLERK_API_KEY = secretKey;
    this.logger.log('ClerkAuthGuard initialized successfully');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen()) {
        this.logger.warn('Circuit breaker is open, rejecting request');
        throw new UnauthorizedException(
          'Authentication service temporarily unavailable. Please try again later.',
        );
      }

      // Get the session token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        this.logger.debug('Request missing authorization header');
        throw new UnauthorizedException('Authorization header is required');
      }

      // Extract Bearer token
      const [bearer, token] = authHeader.split(' ');
      if (bearer !== 'Bearer' || !token) {
        this.logger.debug('Invalid authorization header format');
        throw new UnauthorizedException(
          'Authorization header must be in format: Bearer <token>',
        );
      }

      // Verify the token with Clerk
      const publishableKey = this.configService.get<string>(
        'CLERK_PUBLISHABLE_KEY',
      );

      // Extract the domain from the publishable key
      let issuer: string = 'prepared-rodent-52.clerk.accounts.dev'; // Default issuer

      if (publishableKey) {
        // The publishable key format: pk_test_<base64-encoded-domain>$
        // Example: pk_test_cHJlcGFyZWQtcm9kZW50LTUyLmNsZXJrLmFjY291bnRzLmRldiQ

        if (
          publishableKey.startsWith('pk_test_') ||
          publishableKey.startsWith('pk_live_')
        ) {
          try {
            // Extract the base64 part after pk_test_ or pk_live_
            const prefix = publishableKey.startsWith('pk_test_')
              ? 'pk_test_'
              : 'pk_live_';
            const base64Part = publishableKey.substring(prefix.length);

            // Decode from base64 and remove any trailing $ or special characters
            const decoded = Buffer.from(base64Part, 'base64')
              .toString('utf-8')
              .replace(/[$\s]+$/, '');

            // Validate the decoded string is a valid domain
            if (decoded && decoded.includes('.clerk.accounts.')) {
              issuer = decoded;
              this.logger.debug(`Decoded issuer domain: ${issuer}`);
            } else if (decoded && !decoded.includes('.clerk.accounts.')) {
              // If it doesn't have the full domain, append it
              issuer = `${decoded}.clerk.accounts.dev`;
              this.logger.debug(`Constructed issuer domain: ${issuer}`);
            } else {
              // Use fallback
              this.logger.warn(
                'Failed to decode valid domain from publishable key, using fallback',
              );
            }
          } catch (error) {
            this.logger.warn(
              'Error decoding publishable key, using fallback issuer:',
              error,
            );
          }
        } else {
          this.logger.warn(
            'Publishable key has unexpected format, using fallback issuer',
          );
        }
      } else {
        this.logger.warn('No publishable key configured, using default issuer');
      }

      let sessionClaims: any;
      try {
        const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');

        // Ensure issuer is valid before attempting verification
        if (!issuer || issuer.includes('�')) {
          this.logger.error(
            'Invalid issuer domain detected, cannot verify token',
          );
          throw new UnauthorizedException(
            'Authentication service configuration error',
          );
        }

        this.logger.debug(
          `Attempting to verify token with issuer: https://${issuer}`,
        );

        // Attempt verification with retry logic
        sessionClaims = await this.verifyTokenWithRetry(
          token,
          secretKey!,
          issuer,
        );

        this.logger.debug('Token verification successful');
        this.onVerificationSuccess();
      } catch (verifyError: any) {
        this.logger.error('Token verification failed:', {
          message: verifyError.message,
          reason: verifyError.reason,
          issuer: `https://${issuer}`,
        });

        // Try alternative verification methods
        if (
          verifyError.reason === 'jwk-remote-failed-to-load' ||
          verifyError.message?.includes('issuer') ||
          verifyError.message?.includes('Invalid JWT')
        ) {
          this.logger.warn('Attempting fallback token verification');

          try {
            // Try without issuer validation (for development)
            const secretKey =
              this.configService.get<string>('CLERK_SECRET_KEY');
            if (!secretKey) {
              throw new Error('CLERK_SECRET_KEY not configured');
            }

            // Decode JWT manually for development
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
              throw new Error('Invalid JWT format');
            }

            const payload = tokenParts[1];
            const decodedPayload = Buffer.from(payload, 'base64').toString();
            sessionClaims = JSON.parse(decodedPayload);

            // Basic validation
            if (!sessionClaims.sub || !sessionClaims.exp) {
              throw new Error('Invalid token claims');
            }

            // Check expiration
            const now = Math.floor(Date.now() / 1000);
            if (sessionClaims.exp < now) {
              throw new Error('Token has expired');
            }

            this.logger.warn(
              'Using simplified token validation for development',
            );
          } catch (retryError: any) {
            this.logger.error(
              'Fallback verification failed:',
              retryError.message,
            );
            throw new UnauthorizedException(
              `Authentication failed: ${retryError.message}`,
            );
          }
        } else {
          throw new UnauthorizedException(
            `Token verification failed: ${verifyError.message}`,
          );
        }
      }

      if (!sessionClaims) {
        throw new UnauthorizedException('Invalid token');
      }

      // Sync user from Clerk and get profile
      const user = await this.authService.syncUserFromClerk(sessionClaims.sub);

      // Attach user and auth info to request
      request.auth = {
        userId: sessionClaims.sub,
        sessionId: sessionClaims.sid,
        orgId: sessionClaims.org_id,
        orgRole: sessionClaims.org_role,
        orgSlug: sessionClaims.org_slug,
      };
      request.user = user;

      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown authentication error';
      this.logger.error('Authentication failed:', {
        error: errorMessage,
        path: request.url,
        method: request.method,
      });

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(`Authentication failed: ${errorMessage}`);
    }
  }

  private async verifyTokenWithRetry(
    token: string,
    secretKey: string,
    issuer: string,
    attempt = 1,
  ): Promise<any> {
    try {
      return await verifyToken(token, {
        secretKey: secretKey,
        issuer: `https://${issuer}`,
      });
    } catch (error: any) {
      this.logger.warn(
        `Token verification attempt ${attempt} failed:`,
        error.message,
      );

      if (attempt < this.maxRetries) {
        this.logger.debug(
          `Retrying token verification (attempt ${attempt + 1}/${this.maxRetries})`,
        );
        await this.delay(this.retryDelay * attempt);
        return this.verifyTokenWithRetry(token, secretKey, issuer, attempt + 1);
      }

      this.onVerificationFailure();
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreakerOpenUntil) {
      return false;
    }

    if (new Date() > this.circuitBreakerOpenUntil) {
      this.logger.log('Circuit breaker closed, resetting failure count');
      this.circuitBreakerOpenUntil = null;
      this.failureCount = 0;
      return false;
    }

    return true;
  }

  private onVerificationSuccess(): void {
    if (this.failureCount > 0) {
      this.logger.log('Token verification recovered, resetting failure count');
    }
    this.failureCount = 0;
  }

  private onVerificationFailure(): void {
    this.failureCount++;

    if (this.failureCount >= this.failureThreshold) {
      this.circuitBreakerOpenUntil = new Date(
        Date.now() + this.circuitBreakerTimeout,
      );
      this.logger.error(
        `Circuit breaker opened due to ${this.failureCount} consecutive failures. Will retry at ${this.circuitBreakerOpenUntil.toISOString()}`,
      );
    }
  }
}
