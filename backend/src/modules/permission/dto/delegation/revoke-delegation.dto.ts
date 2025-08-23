import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RevokeDelegationDto {
  @ApiProperty({ description: 'Delegation ID to revoke' })
  @IsString()
  @IsNotEmpty()
  delegationId: string;

  @ApiPropertyOptional({ description: 'Reason for revocation' })
  @IsString()
  @IsOptional()
  reason?: string;
}