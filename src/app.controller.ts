/* eslint-disable prettier/prettier */
// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Social Media Platform API',
      version: '1.0.0',
      environment: process.env.NODE_ENV,
    };
  }

  @Get()
  @ApiOperation({ summary: 'API information' })
  getInfo() {
    return {
      message: 'Social Media Platform NestJS API',
      version: '1.0.0',
      documentation: '/docs',
      health: '/health',
    };
  }

  // Add this method for the test to pass
  getHello(): string {
    return this.appService.getHello();
  }
}