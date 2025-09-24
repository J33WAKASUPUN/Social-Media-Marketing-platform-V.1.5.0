/* eslint-disable prettier/prettier */
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: ['admin', 'manager', 'member', 'viewer'] })
  @IsOptional()
  @IsEnum(['admin', 'manager', 'member', 'viewer'])
  role?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'suspended'] })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'])
  status?: string;
}