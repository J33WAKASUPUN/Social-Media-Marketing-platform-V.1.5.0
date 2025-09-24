/* eslint-disable prettier/prettier */
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'member', enum: ['admin', 'manager', 'member', 'viewer'] })
  @IsEnum(['admin', 'manager', 'member', 'viewer'])
  role: string;

  @ApiPropertyOptional({ example: 'Welcome to our organization!' })
  @IsOptional()
  @IsString()
  message?: string;
}