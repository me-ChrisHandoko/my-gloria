import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';

@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private clerkClient: ReturnType<typeof createClerkClient>;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY is not configured');
    }

    this.clerkClient = createClerkClient({
      secretKey,
    });
  }

  async getUser(userId: string) {
    try {
      return await this.clerkClient.users.getUser(userId);
    } catch (error) {
      this.logger.error(`Failed to get user ${userId} from Clerk`, error);
      return null;
    }
  }

  async getUserByEmail(email: string) {
    try {
      const users = await this.clerkClient.users.getUserList({
        emailAddress: [email],
      });
      return users.data[0] || null;
    } catch (error) {
      this.logger.error(
        `Failed to get user by email ${email} from Clerk`,
        error,
      );
      return null;
    }
  }

  async updateUser(userId: string, data: any) {
    try {
      return await this.clerkClient.users.updateUser(userId, data);
    } catch (error) {
      this.logger.error(`Failed to update user ${userId} in Clerk`, error);
      throw error;
    }
  }

  async deleteUser(userId: string) {
    try {
      return await this.clerkClient.users.deleteUser(userId);
    } catch (error) {
      this.logger.error(`Failed to delete user ${userId} from Clerk`, error);
      throw error;
    }
  }

  async verifyToken(token: string) {
    try {
      // Note: verifyToken is not directly available in @clerk/backend
      // Token verification is typically handled by the ClerkAuthGuard
      // This method is kept for compatibility but returns null
      this.logger.warn(
        'verifyToken called but not implemented - use ClerkAuthGuard instead',
      );
      return null;
    } catch (error) {
      this.logger.error('Failed to verify Clerk token', error);
      return null;
    }
  }
}
