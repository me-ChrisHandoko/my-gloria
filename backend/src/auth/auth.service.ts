import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { clerkClient } from '@clerk/clerk-sdk-node';
import type { User as ClerkUser } from '@clerk/clerk-sdk-node';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    public readonly prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (!secretKey) {
      throw new Error(
        'CLERK_SECRET_KEY is not defined in environment variables',
      );
    }

    // Set Clerk API key
    process.env.CLERK_API_KEY = secretKey;
  }

  /**
   * Validate session token from Clerk
   */
  async validateSession(sessionToken: string) {
    try {
      // Verify the session with Clerk
      const sessions = await clerkClient.sessions.getSessionList();
      const activeSession = sessions.find(
        (s) => s.id === sessionToken && s.status === 'active',
      );

      if (!activeSession) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      return activeSession;
    } catch (error) {
      this.logger.error('Session validation failed:', error);
      throw new UnauthorizedException('Session validation failed');
    }
  }

  /**
   * Validate user email against data_karyawan table
   */
  async validateUserEmail(email: string): Promise<boolean> {
    try {
      // Normalize email: trim whitespace and convert to lowercase
      const normalizedEmail = email.trim().toLowerCase();

      this.logger.log(`Validating email: "${normalizedEmail}"`);

      // Handle Microsoft/Google OAuth email format conversion
      // Microsoft often uses dots (.) while database might have underscores (_)
      const emailVariants = [
        normalizedEmail,
        normalizedEmail.replace(/\./g, '_'), // Convert dots to underscores
        normalizedEmail.replace(/_/g, '.'), // Convert underscores to dots
      ];

      this.logger.log(`Checking email variants: ${emailVariants.join(', ')}`);

      let employee: any = null;

      // Try each email variant
      for (const emailVariant of emailVariants) {
        // Try exact match with case-insensitive mode
        employee = await this.prisma.dataKaryawan.findFirst({
          where: {
            email: {
              equals: emailVariant,
              mode: 'insensitive',
            },
          },
        });

        if (employee) {
          this.logger.log(
            `Found employee with email variant: "${emailVariant}"`,
          );
          break;
        }
      }

      // If not found, try with LIKE pattern for more flexible matching
      if (!employee) {
        this.logger.log('Exact match not found, trying pattern match...');
        employee = await this.prisma.dataKaryawan.findFirst({
          where: {
            email: {
              contains: normalizedEmail,
              mode: 'insensitive',
            },
          },
        });
      }

      // If still not found, try raw SQL for maximum compatibility
      if (!employee) {
        this.logger.log('Pattern match not found, trying raw SQL...');
        const result = await this.prisma.$queryRaw`
          SELECT * FROM gloria_master.data_karyawan 
          WHERE LOWER(TRIM(email)) = ${normalizedEmail}
          LIMIT 1
        `;
        employee =
          Array.isArray(result) && result.length > 0 ? result[0] : null;
      }

      const isValid = !!employee;
      this.logger.log(
        `Email validation result for "${normalizedEmail}": ${isValid}`,
      );

      if (employee) {
        this.logger.log(
          `Found employee: NIP=${employee.nip}, Name=${employee.nama}`,
        );
      }

      return isValid;
    } catch (error) {
      this.logger.error('Email validation failed:', error);
      return false;
    }
  }

  /**
   * Get employee data by email
   */
  async getEmployeeByEmail(email: string) {
    try {
      // Normalize email: trim whitespace and convert to lowercase
      const normalizedEmail = email.trim().toLowerCase();

      this.logger.log(`Getting employee data for email: "${normalizedEmail}"`);

      // Handle Microsoft/Google OAuth email format conversion
      const emailVariants = [
        normalizedEmail,
        normalizedEmail.replace(/\./g, '_'), // Convert dots to underscores
        normalizedEmail.replace(/_/g, '.'), // Convert underscores to dots
      ];

      let employee: any = null;

      // Try each email variant
      for (const emailVariant of emailVariants) {
        employee = await this.prisma.dataKaryawan.findFirst({
          where: {
            email: {
              equals: emailVariant,
              mode: 'insensitive',
            },
          },
          select: {
            nip: true,
            nama: true,
            email: true,
            bagianKerja: true,
            lokasi: true,
          },
        });

        if (employee) {
          this.logger.log(
            `Found employee with email variant: "${emailVariant}"`,
          );
          break;
        }
      }

      // If not found, try raw SQL
      if (!employee) {
        const result = await this.prisma.$queryRaw`
          SELECT nip, nama, email, bagian_kerja as "bagianKerja", lokasi 
          FROM gloria_master.data_karyawan 
          WHERE LOWER(TRIM(email)) = ${normalizedEmail}
          LIMIT 1
        `;
        employee =
          Array.isArray(result) && result.length > 0 ? result[0] : null;
      }

      if (employee) {
        this.logger.log(`Found employee: ${employee.nama} (${employee.nip})`);
      } else {
        this.logger.warn(`No employee found for email: "${normalizedEmail}"`);
      }

      return employee;
    } catch (error) {
      this.logger.error('Failed to get employee by email:', error);
      return null;
    }
  }

  /**
   * Get or create user profile from Clerk user
   */
  async syncUserFromClerk(clerkUserId: string) {
    try {
      // Get user from Clerk
      const clerkUser = await clerkClient.users.getUser(clerkUserId);

      if (!clerkUser) {
        throw new UnauthorizedException('User not found in Clerk');
      }

      // Log all email addresses from Clerk
      this.logger.log(
        `Clerk user ${clerkUserId} has ${clerkUser.emailAddresses.length} email addresses`,
      );
      clerkUser.emailAddresses.forEach((email, index) => {
        this.logger.log(
          `  Email ${index + 1}: ${email.emailAddress} (id: ${email.id}, verified: ${email.verification?.status})`,
        );
      });

      // Get primary email
      const primaryEmail = clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      );

      if (!primaryEmail) {
        this.logger.error(`No primary email found for user ${clerkUserId}`);
        this.logger.error(
          `Primary email ID: ${clerkUser.primaryEmailAddressId}`,
        );
        throw new UnauthorizedException('No primary email found for user');
      }

      this.logger.log(
        `Primary email for ${clerkUserId}: ${primaryEmail.emailAddress}`,
      );

      // CRITICAL: Validate email against data_karyawan
      const emailExists = await this.validateUserEmail(
        primaryEmail.emailAddress,
      );
      if (!emailExists) {
        this.logger.warn(
          `Unauthorized login attempt: Email ${primaryEmail.emailAddress} not found in data_karyawan`,
        );

        // Log additional debug info
        this.logger.warn(`Attempted login details:`);
        this.logger.warn(`  - Clerk User ID: ${clerkUserId}`);
        this.logger.warn(`  - Email: ${primaryEmail.emailAddress}`);
        this.logger.warn(
          `  - Email Verified: ${primaryEmail.verification?.status}`,
        );
        this.logger.warn(`  - First Name: ${clerkUser.firstName}`);
        this.logger.warn(`  - Last Name: ${clerkUser.lastName}`);

        throw new UnauthorizedException(
          'Email not registered in employee database. Please contact administrator.',
        );
      }

      // First, check if user profile exists by clerkUserId
      let userProfile = await this.prisma.userProfile.findUnique({
        where: { clerkUserId },
        include: {
          dataKaryawan: true,
          roles: {
            include: {
              role: true,
            },
          },
          positions: {
            where: { isActive: true },
            include: {
              position: {
                include: {
                  department: true,
                  school: true,
                },
              },
            },
          },
        },
      });

      // If user doesn't exist by clerkUserId, try to find or create
      if (!userProfile) {
        // First try to find employee by email
        const dataKaryawan = await this.prisma.dataKaryawan.findFirst({
          where: {
            email: {
              equals: primaryEmail.emailAddress,
              mode: 'insensitive',
            },
          },
        });

        let nip: string;

        if (!dataKaryawan) {
          // If not found by email, try to extract NIP from metadata
          const extractedNip = this.extractNipFromClerkUser(clerkUser);

          if (!extractedNip) {
            throw new UnauthorizedException(
              'Unable to identify employee. Please ensure your email is registered.',
            );
          }

          nip = extractedNip;

          // Check if NIP exists in data_karyawan
          const dataKaryawanByNip = await this.prisma.dataKaryawan.findUnique({
            where: { nip },
          });

          if (!dataKaryawanByNip) {
            throw new UnauthorizedException(
              'Employee data not found. Please contact administrator.',
            );
          }
        } else {
          nip = dataKaryawan.nip;
        }

        // Check if a UserProfile with this NIP already exists
        const existingProfile = await this.prisma.userProfile.findUnique({
          where: { nip },
          include: {
            dataKaryawan: true,
            roles: {
              include: {
                role: true,
              },
            },
            positions: {
              where: { isActive: true },
              include: {
                position: {
                  include: {
                    department: true,
                    school: true,
                  },
                },
              },
            },
          },
        });

        if (existingProfile) {
          // Update existing profile with new clerkUserId (user might have switched from email to OAuth login)
          userProfile = await this.prisma.userProfile.update({
            where: { nip },
            data: {
              clerkUserId,
              lastActive: new Date(),
            },
            include: {
              dataKaryawan: true,
              roles: {
                include: {
                  role: true,
                },
              },
              positions: {
                where: { isActive: true },
                include: {
                  position: {
                    include: {
                      department: true,
                      school: true,
                    },
                  },
                },
              },
            },
          });
          this.logger.log(
            `Updated existing user profile for ${clerkUserId} with NIP: ${nip}`,
          );
        } else {
          // Create new user profile
          userProfile = await this.prisma.userProfile.create({
            data: {
              id: uuidv7(),
              clerkUserId,
              nip,
              isActive: true,
              lastActive: new Date(),
              preferences: {},
            },
            include: {
              dataKaryawan: true,
              roles: {
                include: {
                  role: true,
                },
              },
              positions: {
                where: { isActive: true },
                include: {
                  position: {
                    include: {
                      department: true,
                      school: true,
                    },
                  },
                },
              },
            },
          });
          this.logger.log(
            `Created new user profile for ${clerkUserId} with NIP: ${nip}`,
          );
        }
      } else {
        // Update last active
        await this.prisma.userProfile.update({
          where: { id: userProfile.id },
          data: { lastActive: new Date() },
        });
      }

      return this.formatUserResponse(userProfile);
    } catch (error) {
      this.logger.error('User sync failed:', error);
      throw error;
    }
  }

  /**
   * Extract NIP from Clerk user data
   */
  private extractNipFromClerkUser(clerkUser: ClerkUser): string | null {
    // Check public metadata first
    if (clerkUser.publicMetadata?.nip) {
      return clerkUser.publicMetadata.nip as string;
    }

    // Check private metadata
    if (clerkUser.privateMetadata?.nip) {
      return clerkUser.privateMetadata.nip as string;
    }

    // Check unsafe metadata
    if (clerkUser.unsafeMetadata?.nip) {
      return clerkUser.unsafeMetadata.nip as string;
    }

    // Try to extract from email (if email format is nip@domain.com)
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    );

    if (primaryEmail) {
      const emailParts = primaryEmail.emailAddress.split('@');
      // Check if the email username looks like an NIP (numeric or specific format)
      if (
        /^\d+$/.test(emailParts[0]) ||
        /^[A-Z0-9]{6,15}$/.test(emailParts[0])
      ) {
        return emailParts[0];
      }
    }

    return null;
  }

  /**
   * Format user response with permissions
   */
  private formatUserResponse(userProfile: any) {
    const permissions = this.calculateUserPermissions(userProfile);

    return {
      id: userProfile.id,
      clerkUserId: userProfile.clerkUserId,
      nip: userProfile.nip,
      name: userProfile.dataKaryawan?.nama || 'Unknown',
      email: userProfile.dataKaryawan?.email || '',
      phone: userProfile.dataKaryawan?.noPonsel || '',
      isSuperadmin: userProfile.isSuperadmin,
      isActive: userProfile.isActive,
      employee: {
        department: userProfile.dataKaryawan?.bagianKerja,
        location: userProfile.dataKaryawan?.lokasi,
        position: userProfile.dataKaryawan?.bidangKerja,
        status: userProfile.dataKaryawan?.statusAktif,
      },
      roles: userProfile.roles.map((ur: any) => ({
        id: ur.role.id,
        code: ur.role.code,
        name: ur.role.name,
      })),
      positions: userProfile.positions.map((up: any) => ({
        id: up.position.id,
        code: up.position.code,
        name: up.position.name,
        department: up.position.department?.name,
        school: up.position.school?.name,
        isPlt: up.isPlt,
      })),
      permissions,
      lastActive: userProfile.lastActive,
    };
  }

  /**
   * Calculate user permissions based on roles and positions
   */
  private calculateUserPermissions(userProfile: any): string[] {
    const permissions = new Set<string>();

    // Add superadmin permissions
    if (userProfile.isSuperadmin) {
      permissions.add('*'); // All permissions
      return Array.from(permissions);
    }

    // Add role-based permissions
    for (const userRole of userProfile.roles) {
      // Here you would load permissions from role
      // This is simplified - you'd query RoleModuleAccess
      permissions.add(`role:${userRole.role.code}`);
    }

    // Add position-based permissions
    for (const userPosition of userProfile.positions) {
      permissions.add(`position:${userPosition.position.code}`);
    }

    return Array.from(permissions);
  }

  /**
   * Handle Clerk webhook events
   */
  async handleWebhookEvent(type: string, data: any) {
    this.logger.log(`Processing webhook event: ${type}`);

    switch (type) {
      case 'user.created':
        await this.handleUserCreated(data);
        break;
      case 'user.updated':
        await this.handleUserUpdated(data);
        break;
      case 'user.deleted':
        await this.handleUserDeleted(data);
        break;
      case 'session.created':
        await this.handleSessionCreated(data);
        break;
      case 'session.ended':
      case 'session.removed':
      case 'session.revoked':
        await this.handleSessionEnded(data);
        break;
      default:
        this.logger.warn(`Unhandled webhook event type: ${type}`);
    }
  }

  private async handleUserCreated(clerkUser: ClerkUser) {
    try {
      // Get primary email
      const primaryEmail = clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      );

      if (!primaryEmail) {
        this.logger.error(`No primary email for user: ${clerkUser.id}`);
        // Consider deleting the user from Clerk if no email
        return;
      }

      // Validate email against data_karyawan
      const isValid = await this.validateUserEmail(primaryEmail.emailAddress);

      if (!isValid) {
        this.logger.warn(
          `User created with unregistered email: ${primaryEmail.emailAddress}`,
        );
        // You might want to delete or deactivate the user in Clerk here
        // await clerkClient.users.deleteUser(clerkUser.id);
        return;
      }

      await this.syncUserFromClerk(clerkUser.id);
      this.logger.log(`User created and synced: ${clerkUser.id}`);
    } catch (error) {
      this.logger.error(`Failed to sync created user: ${clerkUser.id}`, error);
    }
  }

  private async handleUserUpdated(clerkUser: ClerkUser) {
    try {
      // Update user metadata if needed
      const userProfile = await this.prisma.userProfile.findUnique({
        where: { clerkUserId: clerkUser.id },
      });

      if (userProfile) {
        // Update any relevant fields
        await this.prisma.userProfile.update({
          where: { id: userProfile.id },
          data: {
            lastActive: new Date(),
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to update user: ${clerkUser.id}`, error);
    }
  }

  private async handleUserDeleted(clerkUser: { id: string }) {
    try {
      // Soft delete user
      await this.prisma.userProfile.updateMany({
        where: { clerkUserId: clerkUser.id },
        data: { isActive: false },
      });
      this.logger.log(`User soft deleted: ${clerkUser.id}`);
    } catch (error) {
      this.logger.error(`Failed to delete user: ${clerkUser.id}`, error);
    }
  }

  private async handleSessionCreated(session: any) {
    // Log session creation for audit
    this.logger.log(`Session created for user: ${session.userId}`);
  }

  private async handleSessionEnded(session: any) {
    // Log session end for audit
    this.logger.log(`Session ended for user: ${session.userId}`);
  }
}
