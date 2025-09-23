/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async register(registerDto: RegisterDto) {
        const user = await this.usersService.create(registerDto);

        const payload: JwtPayload = {
            sub: user._id.toString(),
            email: user.email,
            name: user.name,
        };

        const accessToken = this.jwtService.sign(payload);

        return {
            user,
            accessToken,
            tokenType: 'Bearer',
            expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
        };
    }

    async login(loginDto: LoginDto) {
        const user = await this.usersService.findByEmail(loginDto.email);

        if (!user || !user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (user.status !== 'active') {
            throw new UnauthorizedException('Account is suspended');
        }

        // Update last login
        await this.usersService.updateLastLogin(user._id.toString());

        const payload: JwtPayload = {
            sub: user._id.toString(),
            email: user.email,
            name: user.name,
        };

        const accessToken = this.jwtService.sign(payload);

        // Remove password from response
        const userObject = user.toObject();
        delete userObject.password;

        return {
            user: userObject,
            accessToken,
            tokenType: 'Bearer',
            expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
        };
    }

    async validateOrCreateGoogleUser(googleData: {
        providerId: string;
        email: string;
        name: string;
        avatar?: string;
        accessToken?: string;
        refreshToken?: string;
    }) {
        const user = await this.usersService.findOrCreateGoogleUser(googleData);

        // Update last login
        await this.usersService.updateLastLogin(user._id.toString());

        return user;
    }

    async googleLogin(user: any) {
        try {
            console.log('🔐 Auth Service googleLogin called with user:', user._id);

            const payload: JwtPayload = {
                sub: user._id.toString(),
                email: user.email,
                name: user.name,
            };

            console.log('📝 JWT Payload:', payload);
            const accessToken = this.jwtService.sign(payload);
            console.log('🎫 JWT Token generated successfully');

            const result = {
                user,
                accessToken,
                tokenType: 'Bearer',
                expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
            };

            console.log('✅ Google login result prepared');
            return result;
        } catch (error) {
            console.error('💥 Auth Service googleLogin error:', error);
            throw error;
        }
    }
}