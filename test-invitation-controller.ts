/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/require-await */
import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('invitations')
export class TestInvitationController {
  @Get(':token')
  async showInvitation(@Param('token') token: string, @Res() res: Response) {
    // Simple HTML page for testing
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Organization Invitation</title>
      </head>
      <body>
        <h1>You've been invited!</h1>
        <p>Invitation Token: ${token}</p>
        <p>You can use this token to accept the invitation via API</p>
        <pre>
POST /api/v1/organizations/invitations/accept
{
  "token": "${token}"
}
        </pre>
      </body>
      </html>
    `;
    res.send(html);
  }
}