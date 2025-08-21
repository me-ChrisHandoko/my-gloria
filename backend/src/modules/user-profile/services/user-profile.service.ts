import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ClerkService } from '../../../auth/services/clerk.service';
import {
  CreateUserProfileDto,
  UpdateUserProfileDto,
  UserProfileDto,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clerkService: ClerkService,
  ) {}

  async create(dto: CreateUserProfileDto): Promise<UserProfileDto> {
    try {
      // Check if user already exists
      const existingByClerk = await this.prisma.userProfile.findUnique({
        where: { clerkUserId: dto.clerkUserId },
      });

      if (existingByClerk) {
        throw new ConflictException(
          'User profile with this Clerk ID already exists',
        );
      }

      // Check if NIP already used
      const existingByNip = await this.prisma.userProfile.findUnique({
        where: { nip: dto.nip },
      });

      if (existingByNip) {
        throw new ConflictException(
          'User profile with this NIP already exists',
        );
      }

      // Verify Clerk user exists
      const clerkUser = await this.clerkService.getUser(dto.clerkUserId);
      if (!clerkUser) {
        throw new BadRequestException('Invalid Clerk user ID');
      }

      // Verify employee exists with this NIP
      const employee = await this.prisma.dataKaryawan.findUnique({
        where: { nip: dto.nip },
      });

      if (!employee) {
        throw new BadRequestException(`Employee with NIP ${dto.nip} not found`);
      }

      // Generate unique ID
      const id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const userProfile = await this.prisma.userProfile.create({
        data: {
          id,
          clerkUserId: dto.clerkUserId,
          nip: dto.nip,
          isSuperadmin: dto.isSuperadmin || false,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          preferences: dto.preferences || {},
          createdBy: dto.createdBy,
        },
        include: {
          dataKaryawan: true,
        },
      });

      this.logger.log(`User profile created for NIP ${dto.nip}`);
      return UserProfileDto.fromPrisma(userProfile);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to create user profile', error);
      throw new BadRequestException('Failed to create user profile');
    }
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.UserProfileWhereInput;
    orderBy?: Prisma.UserProfileOrderByWithRelationInput;
  }): Promise<{ data: UserProfileDto[]; total: number }> {
    const { skip = 0, take = 10, where, orderBy } = params || {};

    const [data, total] = await Promise.all([
      this.prisma.userProfile.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include: {
          dataKaryawan: true,
        },
      }),
      this.prisma.userProfile.count({ where }),
    ]);

    return {
      data: data.map((profile) => UserProfileDto.fromPrisma(profile)),
      total,
    };
  }

  async findOne(id: string): Promise<UserProfileDto> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { id },
      include: {
        dataKaryawan: true,
      },
    });

    if (!userProfile) {
      throw new NotFoundException(`User profile with ID ${id} not found`);
    }

    return UserProfileDto.fromPrisma(userProfile);
  }

  async findByClerkId(clerkUserId: string): Promise<UserProfileDto | null> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { clerkUserId },
      include: {
        dataKaryawan: true,
      },
    });

    if (!userProfile) {
      return null;
    }

    return UserProfileDto.fromPrisma(userProfile);
  }

  async findByNip(nip: string): Promise<UserProfileDto | null> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { nip },
      include: {
        dataKaryawan: true,
      },
    });

    if (!userProfile) {
      return null;
    }

    return UserProfileDto.fromPrisma(userProfile);
  }

  async update(id: string, dto: UpdateUserProfileDto): Promise<UserProfileDto> {
    try {
      // Check if profile exists
      const existing = await this.prisma.userProfile.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`User profile with ID ${id} not found`);
      }

      const updateData: Prisma.UserProfileUpdateInput = {
        isSuperadmin: dto.isSuperadmin,
        isActive: dto.isActive,
        preferences: dto.preferences,
        lastActive: new Date(),
      };

      const userProfile = await this.prisma.userProfile.update({
        where: { id },
        data: updateData,
        include: {
          dataKaryawan: true,
        },
      });

      this.logger.log(`User profile updated for ID ${id}`);
      return UserProfileDto.fromPrisma(userProfile);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to update user profile', error);
      throw new BadRequestException('Failed to update user profile');
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.userProfile.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`User profile with ID ${id} not found`);
    }

    await this.prisma.userProfile.delete({
      where: { id },
    });

    this.logger.log(`User profile deleted for ID ${id}`);
  }

  async updateLastActive(clerkUserId: string): Promise<void> {
    await this.prisma.userProfile.update({
      where: { clerkUserId },
      data: {
        lastActive: new Date(),
      },
    });
  }

  async toggleActive(id: string, isActive: boolean): Promise<UserProfileDto> {
    const userProfile = await this.prisma.userProfile.update({
      where: { id },
      data: { isActive },
      include: {
        dataKaryawan: true,
      },
    });

    this.logger.log(`User profile ${id} active status set to ${isActive}`);
    return UserProfileDto.fromPrisma(userProfile);
  }

  async toggleSuperadmin(
    id: string,
    isSuperadmin: boolean,
  ): Promise<UserProfileDto> {
    const userProfile = await this.prisma.userProfile.update({
      where: { id },
      data: { isSuperadmin },
      include: {
        dataKaryawan: true,
      },
    });

    this.logger.log(
      `User profile ${id} superadmin status set to ${isSuperadmin}`,
    );
    return UserProfileDto.fromPrisma(userProfile);
  }
}
