import {
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  IsDate,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  clerkUserId: string;

  @IsString()
  @IsNotEmpty()
  nip: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsObject()
  preferences?: any;
}

export class UpdateUserDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  preferences?: any;
}

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validUntil?: Date;
}

export class AssignPositionDto {
  @IsString()
  @IsNotEmpty()
  positionId: string;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  isPlt?: boolean;

  @IsOptional()
  @IsString()
  skNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
