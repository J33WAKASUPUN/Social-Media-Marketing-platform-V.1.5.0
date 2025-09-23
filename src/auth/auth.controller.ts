/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
// src/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: any) {
    return {
      user,
      message: 'Profile retrieved successfully'
    };
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth login' })
  async googleAuth() {
    console.log('🚀 Google OAuth initiated');
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: any, @Res() res: Response) {
    try {
      console.log('🔥 Google OAuth callback triggered!');
      console.log('📧 Request query:', req.query);
      console.log('👤 User from Google:', req.user);
      
      if (!req.user) {
        console.error('❌ No user data from Google OAuth');
        return res.status(400).json({
          error: 'No user data received from Google',
          success: false
        });
      }

      console.log('✅ User data received, calling authService.googleLogin...');
      const result = await this.authService.googleLogin(req.user);
      console.log('🎉 Google login successful:', result);
      
      // Return success response
      res.json({
        message: 'Google authentication successful',
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        tokenType: result.tokenType,
        expiresIn: result.expiresIn
      });

    } catch (error) {
      console.error('💥 Google OAuth callback error:', error);
      console.error('📊 Error stack:', error.stack);
      
      res.status(500).json({
        error: 'Google OAuth authentication failed',
        message: error.message,
        success: false,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}