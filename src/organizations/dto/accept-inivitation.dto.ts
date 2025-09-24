/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'Invitation token',
    example: 'e5702806-ca0d-4c8c-b434-a327b08f19af'
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}