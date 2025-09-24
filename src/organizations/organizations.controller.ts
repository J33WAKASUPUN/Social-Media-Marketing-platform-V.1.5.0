/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { InvitationsService } from '../../src/organizations/services/invitations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Types } from 'mongoose';
import { AcceptInvitationDto } from './dto/accept-inivitation.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly invitationsService: InvitationsService
  ) {}

  private validateAndConvertUserId(userId: string): Types.ObjectId {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    
    if (Types.ObjectId.isValid(userId)) {
      return new Types.ObjectId(userId);
    }
    
    throw new BadRequestException('Invalid user ID format');
  }

  @Post()
  @ApiOperation({ summary: 'Create new organization' })
  @ApiResponse({ status: 201, description: 'Organization successfully created' })
  @ApiResponse({ status: 409, description: 'Organization name already exists' })
  async create(@Body() createOrganizationDto: CreateOrganizationDto, @CurrentUser() user: any) {
    const userId = this.validateAndConvertUserId(user.sub || user.id || user._id);
    
    const organization = await this.organizationsService.create(
      createOrganizationDto, 
      userId
    );
    return {
      message: 'Organization created successfully',
      organization
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user organizations' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async findAll(@CurrentUser() user: any) {
    const userId = this.validateAndConvertUserId(user.sub || user.id || user._id);
    
    const organizations = await this.organizationsService.findUserOrganizations(userId);
    return {
      message: 'Organizations retrieved successfully',
      organizations,
      count: organizations.length
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = this.validateAndConvertUserId(user.sub || user.id || user._id);
    
    const organization = await this.organizationsService.findOne(id, userId);
    return {
      message: 'Organization retrieved successfully',
      organization
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async update(
    @Param('id') id: string, 
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @CurrentUser() user: any
  ) {
    const userId = this.validateAndConvertUserId(user.sub || user.id || user._id);
    
    const organization = await this.organizationsService.update(id, updateOrganizationDto, userId);
    return {
      message: 'Organization updated successfully',
      organization
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Only owner can delete organization' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = this.validateAndConvertUserId(user.sub || user.id || user._id);
    
    await this.organizationsService.remove(id, userId);
    return {
      message: 'Organization deleted successfully'
    };
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiResponse({ status: 200, description: 'Members retrieved successfully' })
  async getMembers(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = this.validateAndConvertUserId(user.sub || user.id || user._id);
    
    const members = await this.organizationsService.getMembers(id, userId);
    return {
      message: 'Members retrieved successfully',
      members,
      count: members.length
    };
  }

  // FIX: Change endpoint from /members to /invite
  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite new member to organization' })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  @ApiResponse({ status: 409, description: 'User already exists or invitation pending' })
  async inviteMember(
    @Param('id') id: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @CurrentUser() user: any
  ) {
    const userId = this.validateAndConvertUserId(user.sub || user.id || user._id);
    
    const invitation = await this.organizationsService.inviteMember(id, inviteMemberDto, userId);
    return {
      message: 'Invitation sent successfully',
      invitation
    };
  }

  @Get('invitations/:token')
  @ApiOperation({ summary: 'Get invitation details by token' })
  @ApiResponse({ status: 200, description: 'Invitation details retrieved' })
  @ApiResponse({ status: 404, description: 'Invitation not found or expired' })
  async getInvitation(@Param('token') token: string) {
    const invitation = await this.invitationsService.getInvitationByToken(token);
    return {
      message: 'Invitation details retrieved successfully',
      invitation
    };
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept organization invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired invitation' })
  async acceptInvitation(
    @Body() acceptInvitationDto: AcceptInvitationDto,
    @CurrentUser() user: any
  ) {
    const userId = this.validateAndConvertUserId(user.sub || user.id || user._id);
    
    const membership = await this.invitationsService.acceptInvitation(
      acceptInvitationDto.token,
      userId
    );
    
    return {
      message: 'Invitation accepted successfully',
      membership
    };
  }

  @Get(':id/invitations')
  @ApiOperation({ summary: 'Get organization invitations' })
  @ApiResponse({ status: 200, description: 'Invitations retrieved successfully' })
  async getInvitations(@Param('id') id: string, @CurrentUser() user: any) {
    const invitations = await this.invitationsService.getOrganizationInvitations(id);
    return {
      message: 'Invitations retrieved successfully',
      invitations,
      count: invitations.length
    };
  }

  @Delete('invitations/:invitationId')
  @ApiOperation({ summary: 'Cancel invitation' })
  @ApiResponse({ status: 200, description: 'Invitation cancelled successfully' })
  async cancelInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any
  ) {
    const userId = this.validateAndConvertUserId(user.sub || user.id || user._id);
    
    await this.invitationsService.cancelInvitation(invitationId, userId);
    return {
      message: 'Invitation cancelled successfully'
    };
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Update organization member' })
  async updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateMemberDto: UpdateMemberDto,
    @CurrentUser() user: any
  ) {
    const userId = this.validateAndConvertUserId(user.sub || user.id || user._id);
    
    const member = await this.organizationsService.updateMember(id, memberId, updateMemberDto, userId);
    return {
      message: 'Member updated successfully',
      member
    };
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove organization member' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any
  ) {
    const userId = this.validateAndConvertUserId(user.sub || user.id || user._id);
    
    await this.organizationsService.removeMember(id, memberId, userId);
    return {
      message: 'Member removed successfully'
    };
  }
}