import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UserProfileService } from '../services/user-profile.service';
import {
  CreateUserProfileDto,
  UpdateUserProfileDto,
  UserProfileDto,
} from '../dto';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ClerkUser } from '../../../auth/interfaces/clerk-user.interface';

@ApiTags('User Profiles')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('api/v1/user-profiles')
export class UserProfileController {
  private readonly logger = new Logger(UserProfileController.name);

  constructor(private readonly userProfileService: UserProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user profile' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User profile created successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User profile already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  create(@Body() createUserProfileDto: CreateUserProfileDto) {
    return this.userProfileService.create(createUserProfileDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user profiles' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (starts from 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or email',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'isVerified',
    required: false,
    type: Boolean,
    description: 'Filter by verification status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user profiles',
  })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('isVerified') isVerified?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified === 'true';
    }

    const result = await this.userProfileService.findAll({
      skip,
      take: limit,
      where,
    });

    return {
      data: result.data,
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user profile',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User profile not found',
  })
  async getMyProfile(@CurrentUser() user: ClerkUser) {
    const profile = await this.userProfileService.findByClerkId(user.userId);

    if (!profile) {
      throw new NotFoundException(
        'User profile not found. Please contact administrator to create your profile.',
      );
    }

    // Update last active
    await this.userProfileService.updateLastActive(user.userId);

    return profile;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiParam({
    name: 'id',
    description: 'User profile ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile found',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User profile not found',
  })
  findOne(@Param('id') id: string) {
    return this.userProfileService.findOne(id);
  }

  @Get('by-clerk/:clerkUserId')
  @ApiOperation({ summary: 'Get user profile by Clerk ID' })
  @ApiParam({
    name: 'clerkUserId',
    description: 'Clerk user ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile found',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User profile not found',
  })
  async findByClerkId(@Param('clerkUserId') clerkUserId: string) {
    const profile = await this.userProfileService.findByClerkId(clerkUserId);
    if (!profile) {
      throw new NotFoundException(
        `User profile with Clerk ID ${clerkUserId} not found`,
      );
    }
    return profile;
  }

  @Get('by-nip/:nip')
  @ApiOperation({ summary: 'Get user profile by NIP' })
  @ApiParam({
    name: 'nip',
    description: 'Employee NIP',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile found',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User profile not found',
  })
  async findByNip(@Param('nip') nip: string) {
    const profile = await this.userProfileService.findByNip(nip);
    if (!profile) {
      throw new NotFoundException(`User profile with NIP ${nip} not found`);
    }
    return profile;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({
    name: 'id',
    description: 'User profile ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile updated successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User profile not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  update(
    @Param('id') id: string,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ) {
    return this.userProfileService.update(id, updateUserProfileDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user profile' })
  @ApiParam({
    name: 'id',
    description: 'User profile ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User profile deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User profile not found',
  })
  remove(@Param('id') id: string) {
    return this.userProfileService.remove(id);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle user profile active status' })
  @ApiParam({
    name: 'id',
    description: 'User profile ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile active status toggled successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User profile not found',
  })
  async toggleActive(@Param('id') id: string) {
    const profile = await this.userProfileService.findOne(id);
    return this.userProfileService.toggleActive(id, !profile.isActive);
  }

  @Patch(':id/toggle-superadmin')
  @ApiOperation({ summary: 'Toggle user profile superadmin status' })
  @ApiParam({
    name: 'id',
    description: 'User profile ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile superadmin status toggled successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User profile not found',
  })
  async toggleSuperadmin(@Param('id') id: string) {
    const profile = await this.userProfileService.findOne(id);
    return this.userProfileService.toggleSuperadmin(id, !profile.isSuperadmin);
  }
}
