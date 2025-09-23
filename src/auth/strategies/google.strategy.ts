/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/auth/strategies/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    console.log('🔧 Google OAuth Config:');
    console.log('📧 Client ID:', clientID ? 'Set' : 'Missing');
    console.log('🔐 Client Secret:', clientSecret ? 'Set' : 'Missing');
    console.log('🔗 Callback URL:', callbackURL);

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error('Google OAuth environment variables are not properly configured');
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      console.log('🔍 Google Strategy validate called');
      console.log('📋 Profile data:', {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        name: `${profile.name?.givenName} ${profile.name?.familyName}`
      });

      const { id, name, emails, photos } = profile;
      
      console.log('💾 Calling validateOrCreateGoogleUser...');
      const user = await this.authService.validateOrCreateGoogleUser({
        providerId: id,
        email: emails[0].value,
        name: `${name.givenName} ${name.familyName}`,
        avatar: photos[0]?.value,
        accessToken,
        refreshToken,
      });

      console.log('✅ User validated/created successfully:', user._id);
      done(null, user);
    } catch (error) {
      console.error('❌ Google Strategy validation error:', error);
      done(error, false);
    }
  }
}