/* eslint-disable prettier/prettier */
 
 
 
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/users/users.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from '../auth/dto/register.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(registerDto: RegisterDto): Promise<User> {
    const existingUser = await this.userModel.findOne({ email: registerDto.email });
    
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = new this.userModel({
      ...registerDto,
      password: hashedPassword,
      emailVerified: false, // In production, send verification email
      preferences: {
        timezone: registerDto.timezone || 'UTC',
        language: 'en',
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          postSuccess: true,
          postFailure: true,
        }
      }
    });

    await user.save();
    
    // Return user without password
    const { password, ...result } = user.toObject();
    return result as User;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findOrCreateGoogleUser(googleData: {
    providerId: string;
    email: string;
    name: string;
    avatar?: string;
    accessToken?: string;
    refreshToken?: string;
  }): Promise<UserDocument> {
    // First, try to find user by email
    let user = await this.userModel.findOne({ email: googleData.email });

    if (user) {
      // Check if Google account is already linked
      const existingGoogleAccount = user.socialAccounts.find(
        account => account.provider === 'google' && account.providerId === googleData.providerId
      );

      if (!existingGoogleAccount) {
        // Link Google account to existing user
        user.socialAccounts.push({
          provider: 'google',
          providerId: googleData.providerId,
          email: googleData.email,
          name: googleData.name,
          avatar: googleData.avatar,
          accessToken: googleData.accessToken,
          refreshToken: googleData.refreshToken,
          connectedAt: new Date(),
        });
        await user.save();
      }
    } else {
      // Create new user with Google account
      user = new this.userModel({
        email: googleData.email,
        name: googleData.name,
        avatar: googleData.avatar,
        status: 'active',
        emailVerified: true, // Google emails are verified
        socialAccounts: [{
          provider: 'google',
          providerId: googleData.providerId,
          email: googleData.email,
          name: googleData.name,
          avatar: googleData.avatar,
          accessToken: googleData.accessToken,
          refreshToken: googleData.refreshToken,
          connectedAt: new Date(),
        }],
        preferences: {
          timezone: 'UTC',
          language: 'en',
          theme: 'light',
          notifications: {
            email: true,
            push: true,
            postSuccess: true,
            postFailure: true,
          }
        }
      });
      await user.save();
    }

    return user;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      lastLoginAt: new Date()
    });
  }
}