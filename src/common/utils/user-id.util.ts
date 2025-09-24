/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

export function validateAndConvertUserId(user: any): Types.ObjectId {
  if (!user) {
    throw new BadRequestException('User is required');
  }

  // Try different possible user ID fields
  const userId = user.sub || user.id || user._id;
  
  if (!userId) {
    throw new BadRequestException('User ID is required');
  }
  
  // If it's already an ObjectId, return it
  if (userId instanceof Types.ObjectId) {
    return userId;
  }
  
  // If it's a valid hex string, convert it
  if (typeof userId === 'string' && Types.ObjectId.isValid(userId)) {
    return new Types.ObjectId(userId);
  }
  
  // If it's not valid, throw an error
  throw new BadRequestException('Invalid user ID format');
}