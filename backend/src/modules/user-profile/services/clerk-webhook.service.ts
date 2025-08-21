import { Injectable, Logger } from '@nestjs/common';
import { UserProfileService } from './user-profile.service';
import { PrismaService } from '../../../prisma/prisma.service';

export interface ClerkWebhookEvent {
  type: string;
  data: any;
  object: string;
  timestamp: number;
}

export interface ClerkUserData {
  id: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
    verification?: {
      status: string;
    };
  }>;
  first_name?: string;
  last_name?: string;
  image_url?: string;
  phone_numbers?: Array<{
    phone_number: string;
    id: string;
  }>;
  created_at: number;
  updated_at: number;
}

@Injectable()
export class ClerkWebhookService {
  private readonly logger = new Logger(ClerkWebhookService.name);

  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly prisma: PrismaService,
  ) {}

  async handleWebhook(event: ClerkWebhookEvent): Promise<void> {
    this.logger.log(`Handling webhook event: ${event.type}`);

    switch (event.type) {
      case 'user.created':
        await this.handleUserCreated(event.data as ClerkUserData);
        break;
      case 'user.updated':
        await this.handleUserUpdated(event.data as ClerkUserData);
        break;
      case 'user.deleted':
        await this.handleUserDeleted(event.data as ClerkUserData);
        break;
      case 'session.created':
        await this.handleSessionCreated(event.data);
        break;
      default:
        this.logger.warn(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handleUserCreated(userData: ClerkUserData): Promise<void> {
    try {
      const primaryEmail =
        userData.email_addresses.find(
          (email) => email.verification?.status === 'verified',
        ) || userData.email_addresses[0];

      if (!primaryEmail) {
        this.logger.warn(`No email found for Clerk user ${userData.id}`);
        return;
      }

      // Check if profile already exists
      const existingProfile = await this.userProfileService.findByClerkId(
        userData.id,
      );

      if (existingProfile) {
        this.logger.log(`Profile already exists for Clerk user ${userData.id}`);
        return;
      }

      // Try to match with existing employee by email
      const employee = await this.prisma.dataKaryawan.findFirst({
        where: {
          email: {
            equals: primaryEmail.email_address,
            mode: 'insensitive',
          },
        },
      });

      if (!employee) {
        this.logger.warn(
          `No employee found for Clerk user ${userData.id} with email ${primaryEmail.email_address}. User profile not created.`,
        );
        return;
      }

      // Generate unique ID
      const id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create user profile linked to employee
      await this.userProfileService.create({
        clerkUserId: userData.id,
        nip: employee.nip,
        isSuperadmin: false,
        isActive: true,
        createdBy: 'CLERK_WEBHOOK',
      });

      this.logger.log(
        `Created user profile for Clerk user ${userData.id} (${primaryEmail.email_address})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle user.created webhook for ${userData.id}`,
        error,
      );
    }
  }

  private async handleUserUpdated(userData: ClerkUserData): Promise<void> {
    try {
      const profile = await this.userProfileService.findByClerkId(userData.id);

      if (!profile) {
        // Profile doesn't exist, create it
        await this.handleUserCreated(userData);
        return;
      }

      const primaryEmail =
        userData.email_addresses.find(
          (email) => email.verification?.status === 'verified',
        ) || userData.email_addresses[0];

      // Update last active timestamp
      await this.userProfileService.updateLastActive(userData.id);

      this.logger.log(`Updated user profile for Clerk user ${userData.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle user.updated webhook for ${userData.id}`,
        error,
      );
    }
  }

  private async handleUserDeleted(userData: ClerkUserData): Promise<void> {
    try {
      const profile = await this.userProfileService.findByClerkId(userData.id);

      if (!profile) {
        this.logger.warn(
          `No profile found for deleted Clerk user ${userData.id}`,
        );
        return;
      }

      // Soft delete: mark as inactive instead of deleting
      await this.userProfileService.toggleActive(profile.id, false);

      this.logger.log(
        `Marked user profile as inactive for deleted Clerk user ${userData.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle user.deleted webhook for ${userData.id}`,
        error,
      );
    }
  }

  private async handleSessionCreated(sessionData: any): Promise<void> {
    try {
      const userId = sessionData.user_id;

      if (!userId) {
        return;
      }

      // Update last active time
      await this.userProfileService.updateLastActive(userId);

      this.logger.log(`Updated last login for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to handle session.created webhook', error);
    }
  }

  async syncClerkUser(clerkUserId: string): Promise<void> {
    try {
      // This method can be called manually to sync a specific user
      // You would need to fetch the user data from Clerk API
      // For now, this is a placeholder
      this.logger.log(`Manual sync requested for Clerk user ${clerkUserId}`);

      // TODO: Implement manual sync logic
      // const clerkUser = await this.clerkService.getUser(clerkUserId);
      // await this.handleUserUpdated(clerkUser);
    } catch (error) {
      this.logger.error(`Failed to sync Clerk user ${clerkUserId}`, error);
    }
  }
}
