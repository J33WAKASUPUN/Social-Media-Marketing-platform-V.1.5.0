/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    void this.createTransporter();
  }

  private async createTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST'),
        port: this.configService.get<number>('SMTP_PORT'),
        secure: false,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      await this.transporter.verify();
      this.logger.log('✅ Email service initialized successfully');
    } catch (error) {
      this.logger.error('SMTP connection failed:', error);
    }
  }

  async sendInvitationEmail(
    email: string,
    organizationName: string,
    inviterName: string,
    invitationToken: string,
    message?: string
  ) {
    try {
      // FIX: Use port 3000 instead of 3001
      const invitationUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/invitations/${invitationToken}`;
      
      const mailOptions = {
        from: this.configService.get<string>('EMAIL_FROM'),
        to: email,
        subject: `Invitation to join ${organizationName}`,
        html: `
          <h2>You've been invited to join ${organizationName}</h2>
          <p>Hi there!</p>
          <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on our platform.</p>
          ${message ? `<p><em>"${message}"</em></p>` : ''}
          <p><a href="${invitationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
          <p>This invitation will expire in 7 days.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        `,
      };

      if (this.transporter) {
        await this.transporter.sendMail(mailOptions);
        this.logger.log(`Invitation email sent to ${email}`);
      } else {
        this.logger.log(`📧 Mock invitation sent to ${email}`);
        this.logger.log(`🔗 Invitation URL: ${invitationUrl}`);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${email}:`, error);
      return false;
    }
  }

  async sendOrganizationInvitation(
    email: string,
    organizationName: string,
    inviterName: string,
    token: string,
    role: string,
    message?: string
  ) {
    return this.sendInvitationEmail(email, organizationName, inviterName, token, message);
  }

  async sendWelcomeEmail(email: string, userName: string, organizationName: string) {
    try {
      const mailOptions = {
        from: this.configService.get<string>('EMAIL_FROM'),
        to: email,
        subject: `Welcome to ${organizationName}!`,
        html: `
          <h2>Welcome to ${organizationName}!</h2>
          <p>Hi ${userName},</p>
          <p>You have successfully joined <strong>${organizationName}</strong>.</p>
          <p>You can now access all the features and collaborate with your team.</p>
          <p>Best regards,<br>The Team</p>
        `,
      };

      if (this.transporter) {
        await this.transporter.sendMail(mailOptions);
        this.logger.log(`Welcome email sent to ${email}`);
      } else {
        this.logger.log(`📧 Mock welcome email sent to ${email}`);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      return false;
    }
  }
}