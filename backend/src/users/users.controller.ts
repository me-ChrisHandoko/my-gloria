import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import {
  PaginationQueryDto,
  PaginationResponseDto,
} from '../common/dto/pagination.dto';
import {
  CreateUserDto,
  UpdateUserDto,
  AssignRoleDto,
  AssignPositionDto,
} from './dto/user.dto';

@Controller('users')
@UseGuards(ClerkAuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Get all users with pagination
   */
  @Get()
  async getUsers(
    @Query() query: PaginationQueryDto,
    @Request() req: any,
  ): Promise<PaginationResponseDto<any>> {
    return this.usersService.findAll(query, req.user);
  }

  /**
   * Get single user by ID
   */
  @Get(':id')
  async getUser(@Param('id') id: string, @Request() req: any) {
    return this.usersService.findOne(id, req.user);
  }

  /**
   * Create new user
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    return this.usersService.create(createUserDto, req.user);
  }

  /**
   * Update user
   */
  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    return this.usersService.update(id, updateUserDto, req.user);
  }

  /**
   * Delete user (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string, @Request() req: any) {
    await this.usersService.remove(id, req.user);
  }

  /**
   * Get user positions
   */
  @Get(':id/positions')
  async getUserPositions(@Param('id') id: string, @Request() req: any) {
    return this.usersService.getUserPositions(id, req.user);
  }

  /**
   * Assign position to user
   */
  @Post(':id/positions')
  async assignPosition(
    @Param('id') id: string,
    @Body() assignPositionDto: AssignPositionDto,
    @Request() req: any,
  ) {
    return this.usersService.assignPosition(id, assignPositionDto, req.user);
  }

  /**
   * Remove position from user
   */
  @Delete(':id/positions/:positionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePosition(
    @Param('id') id: string,
    @Param('positionId') positionId: string,
    @Request() req: any,
  ) {
    await this.usersService.removePosition(id, positionId, req.user);
  }

  /**
   * Get user roles
   */
  @Get(':id/roles')
  async getUserRoles(@Param('id') id: string, @Request() req: any) {
    return this.usersService.getUserRoles(id, req.user);
  }

  /**
   * Assign role to user
   */
  @Post(':id/roles')
  async assignRole(
    @Param('id') id: string,
    @Body() assignRoleDto: AssignRoleDto,
    @Request() req: any,
  ) {
    return this.usersService.assignRole(id, assignRoleDto, req.user);
  }

  /**
   * Remove role from user
   */
  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Request() req: any,
  ) {
    await this.usersService.removeRole(id, roleId, req.user);
  }

  /**
   * Get user permissions for a module
   */
  @Get(':id/permissions/:moduleCode')
  async getUserPermissions(
    @Param('id') id: string,
    @Param('moduleCode') moduleCode: string,
    @Request() req: any,
  ) {
    return this.usersService.getUserPermissions(id, moduleCode, req.user);
  }
}
